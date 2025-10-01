'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface NotificationSettings {
  user_id: string
  email_enabled: boolean | null
  discord_enabled: boolean | null
  discord_webhook_url: string | null
  send_time: string
  timezone: string
}

export async function saveNotificationSettings(settings: NotificationSettings) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Validate Discord webhook URL if enabled
    if (settings.discord_enabled && settings.discord_webhook_url) {
      const isValidWebhook = settings.discord_webhook_url.startsWith(
        'https://discord.com/api/webhooks/'
      )
      if (!isValidWebhook) {
        return { success: false, error: 'Invalid Discord webhook URL' }
      }
    }

    // Upsert notification settings
    const { error } = await supabase.from('notification_settings').upsert(
      {
        user_id: user.id,
        email_enabled: settings.email_enabled,
        discord_enabled: settings.discord_enabled,
        discord_webhook_url: settings.discord_webhook_url,
        send_time: settings.send_time,
        timezone: settings.timezone,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id',
      }
    )

    if (error) {
      console.error('Error saving notification settings:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/settings/notifications')
    return { success: true }
  } catch (error) {
    console.error('Unexpected error in saveNotificationSettings:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}
