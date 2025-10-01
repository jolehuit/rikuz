import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

interface NotificationLog {
  user_id: string
  type: 'email' | 'discord'
  status: 'sent' | 'failed' | 'retried'
  error_message?: string
  retry_count: number
}

export class NotificationService {
  private supabase: ReturnType<typeof createClient>
  private maxRetries = 3
  private retryDelays = [1000, 5000, 15000] // Exponential backoff

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }

  /**
   * Send email notification with retry logic
   */
  async sendEmail(
    to: string,
    subject: string,
    html: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    let lastError: string | undefined
    let retryCount = 0

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const { error } = await resend.emails.send({
          from: 'Rikuz <jolehuitt@gmail.com>',
          to,
          subject,
          html,
        })

        if (error) {
          throw new Error(error.message)
        }

        // Log success
        await this.logNotification({
          user_id: userId,
          type: 'email',
          status: attempt > 0 ? 'retried' : 'sent',
          retry_count: attempt,
        })

        return { success: true }
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error'
        retryCount = attempt

        console.error(`Email send attempt ${attempt + 1} failed:`, lastError)

        // Wait before retry (exponential backoff)
        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelays[attempt])
        }
      }
    }

    // All retries failed - log failure
    await this.logNotification({
      user_id: userId,
      type: 'email',
      status: 'failed',
      error_message: lastError,
      retry_count: retryCount,
    })

    return { success: false, error: lastError }
  }

  /**
   * Send Discord webhook notification with retry logic
   */
  async sendDiscord(
    webhookUrl: string,
    content: {
      embeds: Array<{
        title: string
        description: string
        color: number
        fields?: Array<{ name: string; value: string; inline?: boolean }>
        timestamp?: string
      }>
    },
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    let lastError: string | undefined
    let retryCount = 0

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(content),
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Discord webhook failed: ${response.status} - ${errorText}`)
        }

        // Log success
        await this.logNotification({
          user_id: userId,
          type: 'discord',
          status: attempt > 0 ? 'retried' : 'sent',
          retry_count: attempt,
        })

        return { success: true }
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error'
        retryCount = attempt

        console.error(`Discord send attempt ${attempt + 1} failed:`, lastError)

        // Wait before retry (exponential backoff)
        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelays[attempt])
        }
      }
    }

    // All retries failed - log failure
    await this.logNotification({
      user_id: userId,
      type: 'discord',
      status: 'failed',
      error_message: lastError,
      retry_count: retryCount,
    })

    return { success: false, error: lastError }
  }

  /**
   * Log notification attempt to database
   */
  private async logNotification(log: NotificationLog) {
    try {
      await this.supabase.from('notifications_log').insert({
        ...log,
        created_at: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Failed to log notification:', error)
      // Don't throw - logging failure shouldn't break notification flow
    }
  }

  /**
   * Delay helper for exponential backoff
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Get notification failure rate for monitoring
   */
  async getFailureRate(days: number = 1): Promise<number> {
    try {
      const since = new Date()
      since.setDate(since.getDate() - days)

      const { data: logs } = await this.supabase
        .from('notifications_log')
        .select('status')
        .gte('created_at', since.toISOString())

      if (!logs || logs.length === 0) return 0

      const failed = logs.filter((log) => log.status === 'failed').length
      return (failed / logs.length) * 100
    } catch (error) {
      console.error('Failed to calculate failure rate:', error)
      return 0
    }
  }
}
