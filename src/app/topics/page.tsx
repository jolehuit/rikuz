'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Calendar, Hash } from 'lucide-react'

interface Topic {
  id: string
  title: string
  description: string | null
  keywords: string[] | null
  status: string | null
  search_status: 'pending' | 'searching' | 'completed' | 'failed'
  last_search_at: string | null
  created_at: string
  updated_at: string
  user_id: string
  feed_items?: { count: number }[]
}

export default function TopicsPage() {
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newTopic, setNewTopic] = useState({ title: '', description: '', keywords: '' })
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [isExecutingSearch, setIsExecutingSearch] = useState(false)
  const [searchMessage, setSearchMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    console.log('[TOPICS] useEffect mounted')

    const checkAuth = async () => {
      console.log('[TOPICS] checkAuth called')
      const {
        data: { session },
      } = await supabase.auth.getSession()
      console.log('[TOPICS] session:', !!session)
      setIsAnonymous(!session)
      fetchTopics()
    }

    checkAuth()

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[TOPICS] auth state changed:', event, !!session)
      setIsAnonymous(!session)
      fetchTopics()
    })

    return () => {
      console.log('[TOPICS] useEffect cleanup')
      subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchTopics = async () => {
    console.log('[TOPICS] fetchTopics called')
    try {
      const { data, error } = await supabase
        .from('topics')
        .select(
          `
          *,
          feed_items(count)
        `
        )
        .order('created_at', { ascending: false })

      if (error) throw error
      console.log('[TOPICS] Received topics:', data?.length || 0)
      setTopics(data || [])
    } catch (error) {
      console.error('[TOPICS] Error fetching topics:', error)
    } finally {
      console.log('[TOPICS] Setting loading to false')
      setLoading(false)
    }
  }

  const createTopic = async () => {
    if (!newTopic.title.trim()) return

    try {
      setLoading(true)

      const keywords = newTopic.keywords
        .split(',')
        .map((k) => k.trim())
        .filter((k) => k.length > 0)

      // Create topic via API (also creates background job)
      const response = await fetch('/api/topics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newTopic.title.trim(),
          description: newTopic.description.trim() || null,
          keywords,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create topic')
      }

      const result = await response.json()

      setNewTopic({ title: '', description: '', keywords: '' })
      setIsCreateModalOpen(false)
      setLoading(false)

      // Show success message
      setSearchMessage('Topic created! Search will start in the background.')
      await new Promise((resolve) => setTimeout(resolve, 2000))
      setSearchMessage('')

      // Refresh topics list
      fetchTopics()
    } catch (error) {
      console.error('Error creating topic:', error)
      setLoading(false)
    }
  }

  const deleteTopic = async (topicId: string) => {
    if (
      !confirm(
        'Are you sure you want to delete this topic? This will also delete all associated feed items.'
      )
    ) {
      return
    }

    setIsDeleting(topicId)
    try {
      const { error } = await supabase.from('topics').delete().eq('id', topicId)

      if (error) throw error
      fetchTopics()
    } catch (error) {
      console.error('Error deleting topic:', error)
    } finally {
      setIsDeleting(null)
    }
  }

  if (loading || isExecutingSearch) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex flex-col justify-center items-center h-64 gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          {searchMessage && <p className="text-lg text-gray-600 animate-pulse">{searchMessage}</p>}
          {!searchMessage && <p className="text-gray-600">Loading...</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Topics</h1>
          <p className="text-muted-foreground">
            {isAnonymous
              ? 'Sign in to create and manage your topics'
              : 'Manage the subjects you want to follow'}
          </p>
        </div>

        <div className="flex gap-2">
          {isAnonymous ? (
            <Button onClick={() => router.push('/login')}>Sign In to Create Topics</Button>
          ) : (
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Topic
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Topic</DialogTitle>
                  <DialogDescription>
                    Add a new topic to track. You can specify keywords to help refine the search.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <label htmlFor="title" className="text-sm font-medium">
                      Title
                    </label>
                    <Input
                      id="title"
                      value={newTopic.title}
                      onChange={(e) => setNewTopic({ ...newTopic, title: e.target.value })}
                      placeholder="e.g., React Best Practices"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="description" className="text-sm font-medium">
                      Description
                    </label>
                    <Textarea
                      id="description"
                      value={newTopic.description}
                      onChange={(e) => setNewTopic({ ...newTopic, description: e.target.value })}
                      placeholder="Describe what you're looking for..."
                      className="min-h-[80px]"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="keywords" className="text-sm font-medium">
                      Keywords <span className="text-muted-foreground">(optional)</span>
                    </label>
                    <Input
                      id="keywords"
                      value={newTopic.keywords}
                      onChange={(e) => setNewTopic({ ...newTopic, keywords: e.target.value })}
                      placeholder="javascript, hooks, performance"
                    />
                    <p className="text-xs text-muted-foreground">Separate keywords with commas</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createTopic} disabled={!newTopic.title.trim()}>
                    Create Topic
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {topics.length === 0 ? (
        <Card className="text-center py-12">
          <CardHeader>
            <CardTitle className="text-muted-foreground">No topics yet</CardTitle>
            <CardDescription>
              {isAnonymous
                ? 'Sign in to create and manage your topics'
                : 'Create your first topic to start tracking subjects that interest you.'}
            </CardDescription>
          </CardHeader>
          {!isAnonymous && (
            <CardContent>
              <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create your first topic
                  </Button>
                </DialogTrigger>
              </Dialog>
            </CardContent>
          )}
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {topics.map((topic) => (
            <Card key={topic.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg leading-tight">{topic.title}</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteTopic(topic.id)}
                    disabled={isDeleting === topic.id}
                    className="text-destructive hover:text-destructive h-8 w-8 p-0"
                  >
                    {isDeleting === topic.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-destructive"></div>
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {topic.description && (
                  <CardDescription className="text-sm">{topic.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="pt-0 flex-1">
                {/* Search Status Badge */}
                <div className="mb-3">
                  {topic.search_status === 'pending' && (
                    <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-600">
                      ⏳ Search pending
                    </Badge>
                  )}
                  {topic.search_status === 'searching' && (
                    <Badge variant="outline" className="text-xs text-blue-600 border-blue-600">
                      <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-600 mr-1"></div>
                      Searching...
                    </Badge>
                  )}
                  {topic.search_status === 'completed' &&
                    topic.feed_items?.[0] &&
                    topic.feed_items[0].count > 0 && (
                      <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                        ✓ Up to date
                      </Badge>
                    )}
                  {topic.search_status === 'failed' && (
                    <Badge variant="outline" className="text-xs text-red-600 border-red-600">
                      ✗ Search failed
                    </Badge>
                  )}
                </div>

                {topic.keywords && topic.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {topic.keywords.map((keyword, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        <Hash className="h-3 w-3 mr-1" />
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between text-sm text-muted-foreground mt-auto">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    {new Date(topic.created_at).toLocaleDateString()}
                  </div>
                  <div>{topic.feed_items?.[0]?.count || 0} items</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
