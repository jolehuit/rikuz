'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { FeedbackButtons } from '@/components/FeedbackButtons'
import { CommentFeedback } from '@/components/CommentFeedback'
import { SaveButton } from '@/components/SaveButton'
import { DailySummary } from '@/components/DailySummary'
import type { FeedItemWithFeedback } from '@/types/feed.types'

const ITEMS_PER_PAGE = 20

interface DailySummaryType {
  id: string
  date: string
  summary: string
  items_count: number
  highlights: string | null
  topic?: {
    id: string
    title: string
  }
}

export default function FeedPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()

  const [items, setItems] = useState<FeedItemWithFeedback[]>([])
  const [dailySummaries, setDailySummaries] = useState<DailySummaryType[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const [selectedTopic, setSelectedTopic] = useState<string | null>(searchParams.get('topic'))

  const loadItems = useCallback(
    async (pageNum: number, topicFilter: string | null) => {
      if (!user) return

      setLoading(true)
      try {
        const params = new URLSearchParams({
          page: pageNum.toString(),
          limit: ITEMS_PER_PAGE.toString(),
        })

        if (topicFilter) {
          params.append('topic', topicFilter)
        }

        const response = await fetch(`/api/feed?${params.toString()}`)
        const data = await response.json()

        if (pageNum === 0) {
          setItems(data.items)
        } else {
          setItems((prev) => [...prev, ...data.items])
        }

        setHasMore(data.hasMore)
      } catch (error) {
        console.error('Failed to load feed items:', error)
      } finally {
        setLoading(false)
      }
    },
    [user]
  )

  const loadDailySummaries = useCallback(
    async (topicFilter: string | null) => {
      if (!user) return

      try {
        const params = new URLSearchParams()
        if (topicFilter) {
          params.append('topicId', topicFilter)
        }
        // Get today's summaries
        const today = new Date().toISOString().split('T')[0]
        params.append('date', today)

        const response = await fetch(`/api/daily-summaries?${params.toString()}`)
        const data = await response.json()
        setDailySummaries(data.summaries || [])
      } catch (error) {
        console.error('Failed to load daily summaries:', error)
      }
    },
    [user]
  )

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    loadItems(0, selectedTopic)
    loadDailySummaries(selectedTopic)
  }, [user, selectedTopic, loadItems, loadDailySummaries, router])

  const loadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    loadItems(nextPage, selectedTopic)
  }

  const handleTopicClick = (topicId: string) => {
    setSelectedTopic(topicId)
    setPage(0)
    router.push(`/feed?topic=${topicId}`)
  }

  const clearFilter = () => {
    setSelectedTopic(null)
    setPage(0)
    router.push('/feed')
  }

  if (!user) return null

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Your Feed</h1>
        {selectedTopic && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Filtered by topic</Badge>
            <Button variant="ghost" size="sm" onClick={clearFilter}>
              Clear filter
            </Button>
          </div>
        )}
      </div>

      {loading && page === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-xl text-muted-foreground">
            No results yet. Your agents are working on it!
          </p>
        </div>
      ) : (
        <>
          {/* Daily Summaries Section */}
          {dailySummaries.length > 0 && (
            <div className="mb-6">
              {dailySummaries.map((summary, index) => (
                <DailySummary key={summary.id} summary={summary} defaultExpanded={index === 0} />
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <Card key={item.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <CardTitle className="text-lg line-clamp-2">{item.title}</CardTitle>
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
                    <Badge
                      variant="outline"
                      className="cursor-pointer mt-2 w-fit"
                      onClick={() => handleTopicClick(item.topic!.id)}
                    >
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
                  <div className="flex items-center justify-between mt-auto">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      Read more →
                    </a>
                    <div className="flex items-center gap-1">
                      <SaveButton feedItemId={item.id} initialSaved={item.isSaved} />
                      <FeedbackButtons
                        feedItemId={item.id}
                        initialFeedback={item.userFeedback?.type || null}
                      />
                      <CommentFeedback feedItemId={item.id} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {hasMore && (
            <div className="text-center mt-8">
              <Button onClick={loadMore} disabled={loading}>
                {loading ? 'Loading...' : 'Load More'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
