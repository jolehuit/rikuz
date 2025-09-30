'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { Trash2 } from 'lucide-react'

interface SavedItem {
  id: string
  created_at: string
  feed_item: {
    id: string
    title: string
    url: string
    source: string | null
    summary: string | null
    published_at: string | null
    topic: {
      id: string
      title: string
    } | null
  }
}

export default function ReadLaterPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [savedItems, setSavedItems] = useState<SavedItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return // Wait for auth to load

    if (!user) {
      router.push('/login')
      return
    }

    loadSavedItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading])

  const loadSavedItems = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/saved-items')
      const data = await response.json()
      setSavedItems(data.savedItems || [])
    } catch (error) {
      console.error('Failed to load saved items:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (feedItemId: string) => {
    try {
      const response = await fetch('/api/saved-items', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ feedItemId }),
      })

      if (response.ok) {
        setSavedItems((prev) => prev.filter((item) => item.feed_item.id !== feedItemId))
      }
    } catch (error) {
      console.error('Failed to remove item:', error)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Read Later</h1>
        <p className="text-muted-foreground">
          {savedItems.length} {savedItems.length === 1 ? 'item' : 'items'} saved
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      ) : savedItems.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-xl text-muted-foreground">
            No saved items yet. Start saving interesting content from your feed!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {savedItems.map((savedItem) => {
            const item = savedItem.feed_item
            return (
              <Card key={savedItem.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <CardTitle className="text-lg line-clamp-2">{item.title}</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(item.id)}
                      className="shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardDescription className="flex items-center gap-2">
                    {item.source && <span>{item.source}</span>}
                    {item.published_at && (
                      <>
                        <span>•</span>
                        <span>{new Date(item.published_at).toLocaleDateString()}</span>
                      </>
                    )}
                  </CardDescription>
                  {item.topic && (
                    <Badge variant="outline" className="mt-2 w-fit">
                      {item.topic.title}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  {item.summary && (
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                      {item.summary}
                    </p>
                  )}
                  <div className="mt-auto">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      Read more →
                    </a>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
