import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NotificationSettingsForm } from '@/components/organisms/NotificationSettingsForm'

export default async function NotificationSettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user's notification settings
  const { data: settings } = await supabase
    .from('notification_settings')
    .select('*')
    .eq('user_id', user.id)
    .single()

  // If no settings exist, use defaults
  const defaultSettings = {
    user_id: user.id,
    email_enabled: true,
    discord_enabled: false,
    discord_webhook_url: null,
    send_time: '08:00',
    timezone: 'Europe/Paris',
  }

  return (
    <div className="container max-w-2xl mx-auto py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Notification Settings</h1>
          <p className="text-muted-foreground mt-2">
            Configure how and when you receive your daily briefs
          </p>
        </div>

        <NotificationSettingsForm
          initialSettings={settings || defaultSettings}
          userEmail={user.email || ''}
        />
      </div>
    </div>
  )
}
