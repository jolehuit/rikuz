'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { saveNotificationSettings } from '@/app/actions/notifications'
import { useRouter } from 'next/navigation'

interface NotificationSettings {
  user_id: string
  email_enabled: boolean | null
  discord_enabled: boolean | null
  discord_webhook_url: string | null
  send_time: string
  timezone: string
}

interface NotificationSettingsFormProps {
  initialSettings: NotificationSettings
  userEmail: string
}

const SEND_TIME_OPTIONS = [
  { value: '06:00', label: '6:00 AM' },
  { value: '08:00', label: '8:00 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '12:00', label: '12:00 PM' },
  { value: '14:00', label: '2:00 PM' },
  { value: '16:00', label: '4:00 PM' },
  { value: '18:00', label: '6:00 PM' },
  { value: '20:00', label: '8:00 PM' },
]

export function NotificationSettingsForm({
  initialSettings,
  userEmail,
}: NotificationSettingsFormProps) {
  const [settings, setSettings] = useState<NotificationSettings>(initialSettings)
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const router = useRouter()

  const handleSave = () => {
    startTransition(async () => {
      try {
        const result = await saveNotificationSettings(settings)
        if (result.success) {
          setMessage({ type: 'success', text: 'Settings saved successfully!' })
          router.refresh()
        } else {
          setMessage({ type: 'error', text: result.error || 'Failed to save settings' })
        }
      } catch {
        setMessage({ type: 'error', text: 'An unexpected error occurred' })
      }
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Email Notifications</CardTitle>
          <CardDescription>Receive your daily brief via email at {userEmail}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="email-enabled"
              checked={settings.email_enabled ?? true}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, email_enabled: checked as boolean })
              }
            />
            <Label htmlFor="email-enabled" className="font-normal cursor-pointer">
              Enable email notifications
            </Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Discord Notifications</CardTitle>
          <CardDescription>Receive your daily brief in Discord via webhook</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="discord-enabled"
              checked={settings.discord_enabled ?? false}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, discord_enabled: checked as boolean })
              }
            />
            <Label htmlFor="discord-enabled" className="font-normal cursor-pointer">
              Enable Discord notifications
            </Label>
          </div>

          {settings.discord_enabled && (
            <div className="space-y-2">
              <Label htmlFor="webhook-url">Discord Webhook URL</Label>
              <Input
                id="webhook-url"
                type="url"
                placeholder="https://discord.com/api/webhooks/..."
                value={settings.discord_webhook_url || ''}
                onChange={(e) => setSettings({ ...settings, discord_webhook_url: e.target.value })}
              />
              <p className="text-sm text-muted-foreground">
                <a
                  href="https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  How to create a Discord webhook
                </a>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delivery Schedule</CardTitle>
          <CardDescription>Choose when to receive your daily brief</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="send-time">Send time</Label>
            <Select
              value={settings.send_time}
              onValueChange={(value) => setSettings({ ...settings, send_time: value })}
            >
              <SelectTrigger id="send-time">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEND_TIME_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {message && (
        <div
          className={`p-4 rounded-md ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  )
}
