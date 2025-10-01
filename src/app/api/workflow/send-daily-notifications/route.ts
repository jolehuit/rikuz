import { serve } from '@upstash/workflow/nextjs'
import { createClient } from '@supabase/supabase-js'
import { BriefGenerationService } from '@/services/brief-generation-service'
import { NotificationService } from '@/services/notification-service'
import { generateDailyBriefEmail, generateDiscordEmbed } from '@/services/email-templates'

/**
 * Upstash Workflow for daily notification sending
 *
 * This workflow:
 * 1. Generates daily briefs for all active topics
 * 2. Fetches users with notification settings enabled
 * 3. Sends email notifications (if enabled)
 * 4. Sends Discord notifications (if enabled)
 *
 * Scheduled via QStash to run daily after search completion (e.g., 10:00 UTC)
 */
export const { POST } = serve(
  async (context) => {
    const today = new Date().toISOString().split('T')[0]

    // Step 1: Generate briefs for all topics
    const briefResults = await context.run('generate-daily-briefs', async () => {
      const briefService = new BriefGenerationService()
      const topicIds = await briefService.getTopicsNeedingBriefs(today)

      console.log(`Generating briefs for ${topicIds.length} topics`)

      const results = await Promise.allSettled(
        topicIds.map((topicId) => briefService.generateDailyBrief(topicId, today))
      )

      const succeeded = results.filter((r) => r.status === 'fulfilled').length
      const failed = results.filter((r) => r.status === 'rejected').length

      console.log(`Brief generation: ${succeeded} succeeded, ${failed} failed`)

      return { succeeded, failed, total: topicIds.length }
    })

    // Step 2: Fetch users with notifications enabled
    const usersToNotify = await context.run('fetch-notification-users', async () => {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      const { data: settings } = await supabase
        .from('notification_settings')
        .select('user_id, email_enabled, discord_enabled, discord_webhook_url')
        .or('email_enabled.eq.true,discord_enabled.eq.true')

      console.log(`Found ${settings?.length || 0} users with notifications enabled`)
      return settings || []
    })

    if (usersToNotify.length === 0) {
      return {
        success: true,
        message: 'No users to notify',
        briefsGenerated: briefResults.total,
        emailsSent: 0,
        discordSent: 0,
      }
    }

    // Step 3: Send notifications to each user
    const notificationResults = await context.run('send-notifications', async () => {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const notificationService = new NotificationService()

      let emailsSent = 0
      let discordSent = 0
      let errors = 0

      for (const userSettings of usersToNotify) {
        try {
          // Fetch user's email
          const { data: userData } = await supabase.auth.admin.getUserById(userSettings.user_id)

          if (!userData?.user?.email) {
            console.error(`No email found for user ${userSettings.user_id}`)
            continue
          }

          // Fetch user's topics and their daily summaries
          const { data: topics } = await supabase
            .from('topics')
            .select(
              `
              id,
              title,
              daily_summaries!inner (
                date,
                summary,
                item_count
              )
            `
            )
            .eq('user_id', userSettings.user_id)
            .eq('status', 'active')
            .eq('daily_summaries.date', today)

          if (!topics || topics.length === 0) {
            console.log(`No summaries for user ${userSettings.user_id}`)
            continue
          }

          // Fetch feed items for each topic
          const summariesWithItems = await Promise.all(
            topics.map(async (topic) => {
              const { data: items } = await supabase
                .from('feed_items')
                .select('*')
                .eq('topic_id', topic.id)
                .gte('created_at', `${today}T00:00:00.000Z`)
                .lte('created_at', `${today}T23:59:59.999Z`)
                .order('published_at', { ascending: false })
                .limit(5)

              const dailySummaries = topic.daily_summaries as unknown as Array<{
                summary: string
                item_count: number
              }>

              return {
                topic: { id: topic.id, title: topic.title },
                date: today,
                summary: dailySummaries[0]?.summary || '',
                item_count: dailySummaries[0]?.item_count || 0,
                items: items || [],
              }
            })
          )

          // Send email if enabled
          if (userSettings.email_enabled) {
            const { subject, html } = generateDailyBriefEmail(summariesWithItems)
            const result = await notificationService.sendEmail(
              userData.user.email,
              subject,
              html,
              userSettings.user_id
            )

            if (result.success) {
              emailsSent++
            } else {
              errors++
              console.error(`Email failed for user ${userSettings.user_id}:`, result.error)
            }
          }

          // Send Discord if enabled and webhook URL is set
          if (userSettings.discord_enabled && userSettings.discord_webhook_url) {
            const discordEmbed = generateDiscordEmbed(summariesWithItems)
            const result = await notificationService.sendDiscord(
              userSettings.discord_webhook_url,
              discordEmbed,
              userSettings.user_id
            )

            if (result.success) {
              discordSent++
            } else {
              errors++
              console.error(`Discord failed for user ${userSettings.user_id}:`, result.error)
            }
          }
        } catch (error) {
          errors++
          console.error(`Error processing notifications for user ${userSettings.user_id}:`, error)
        }
      }

      return { emailsSent, discordSent, errors }
    })

    // Step 4: Check failure rate and alert if needed
    await context.run('check-failure-rate', async () => {
      const notificationService = new NotificationService()
      const failureRate = await notificationService.getFailureRate(1)

      console.log(`Notification failure rate: ${failureRate.toFixed(2)}%`)

      if (failureRate > 5) {
        console.error(`⚠️ High failure rate detected: ${failureRate.toFixed(2)}%`)
        // TODO: Send alert to admin via Sentry or email
      }
    })

    return {
      success: true,
      message: 'Daily notifications sent',
      briefsGenerated: briefResults.total,
      emailsSent: notificationResults.emailsSent,
      discordSent: notificationResults.discordSent,
      errors: notificationResults.errors,
    }
  },
  {
    retries: 2,
    failureFunction: async ({ context, failStatus, failResponse }) => {
      console.error('Daily notification workflow failed:', {
        status: failStatus,
        response: failResponse,
      })

      // TODO: Send alert email to admin
      return `Workflow failed with status ${failStatus}: ${failResponse}`
    },
  }
)
