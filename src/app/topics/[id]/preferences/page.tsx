'use client'

import { use, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useRouter } from 'next/navigation'

interface TopicPreferences {
  sources: string[]
  content_style: 'technical' | 'beginner-friendly' | 'news' | 'in-depth-analysis'
  additional_instructions: string
}

const AVAILABLE_SOURCES = [
  { id: 'reddit', label: 'Reddit' },
  { id: 'hackernews', label: 'Hacker News' },
  { id: 'github', label: 'GitHub' },
  { id: 'blogs', label: 'Tech Blogs' },
  { id: 'news', label: 'News Sites' },
  { id: 'papers', label: 'Research Papers' },
]

const CONTENT_STYLES = [
  { value: 'technical', label: 'Technical (for experts)' },
  { value: 'beginner-friendly', label: 'Beginner-friendly' },
  { value: 'news', label: 'News & Updates' },
  { value: 'in-depth-analysis', label: 'In-depth Analysis' },
]

export default function TopicPreferencesPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [topic, setTopic] = useState<{ id: string; title: string } | null>(null)
  const [preferences, setPreferences] = useState<TopicPreferences>({
    sources: [],
    content_style: 'technical',
    additional_instructions: '',
  })

  useEffect(() => {
    async function loadTopicAndPreferences() {
      try {
        // Fetch topic details and preferences
        const response = await fetch(`/api/topics/${resolvedParams.id}`)
        if (!response.ok) throw new Error('Failed to load topic')

        const data = await response.json()
        setTopic({ id: data.id, title: data.title })

        // Load existing preferences if any
        if (data.preferences) {
          setPreferences({
            sources: data.preferences.sources || [],
            content_style: data.preferences.content_style || 'technical',
            additional_instructions: data.preferences.additional_instructions || '',
          })
        }
      } catch (error) {
        console.error('Error loading preferences:', error)
      } finally {
        setLoading(false)
      }
    }

    loadTopicAndPreferences()
  }, [resolvedParams.id])

  const handleSourceToggle = (sourceId: string) => {
    setPreferences((prev) => ({
      ...prev,
      sources: prev.sources.includes(sourceId)
        ? prev.sources.filter((s) => s !== sourceId)
        : [...prev.sources, sourceId],
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Save preferences and trigger Master Prompt refinement
      const response = await fetch(`/api/topics/${resolvedParams.id}/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences }),
      })

      if (!response.ok) throw new Error('Failed to save preferences')

      // Redirect back to topic page
      router.push(`/topics/${resolvedParams.id}`)
    } catch (error) {
      console.error('Error saving preferences:', error)
      alert('Failed to save preferences')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse">Loading...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Topic Preferences</h1>
        <p className="text-muted-foreground">
          Customize how {topic?.title} agent searches for content
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Preferred Sources</CardTitle>
            <CardDescription>Select which sources your agent should prioritize</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {AVAILABLE_SOURCES.map((source) => (
                <div key={source.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={source.id}
                    checked={preferences.sources.includes(source.id)}
                    onCheckedChange={() => handleSourceToggle(source.id)}
                  />
                  <Label htmlFor={source.id} className="cursor-pointer">
                    {source.label}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Content Style</CardTitle>
            <CardDescription>Choose the type of content you prefer</CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={preferences.content_style}
              onValueChange={(value) =>
                setPreferences((prev) => ({
                  ...prev,
                  content_style: value as TopicPreferences['content_style'],
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select content style" />
              </SelectTrigger>
              <SelectContent>
                {CONTENT_STYLES.map((style) => (
                  <SelectItem key={style.value} value={style.value}>
                    {style.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Additional Instructions</CardTitle>
            <CardDescription>Provide specific guidance for your agent (optional)</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="e.g., Focus on open-source projects, avoid cryptocurrency topics, prioritize tutorials..."
              rows={5}
              value={preferences.additional_instructions}
              onChange={(e) =>
                setPreferences((prev) => ({
                  ...prev,
                  additional_instructions: e.target.value,
                }))
              }
            />
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-4">
          <Button variant="outline" onClick={() => router.back()} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </div>
    </div>
  )
}
