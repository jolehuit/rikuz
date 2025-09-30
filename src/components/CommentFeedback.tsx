'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { MessageCircle } from 'lucide-react'

interface Comment {
  id: string
  comment: string
  created_at: string
}

interface CommentFeedbackProps {
  feedItemId: string
}

export function CommentFeedback({ feedItemId }: CommentFeedbackProps) {
  const [open, setOpen] = useState(false)
  const [comment, setComment] = useState('')
  const [comments, setComments] = useState<Comment[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (open) {
      loadComments()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, feedItemId])

  const loadComments = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/feedback/comments?feedItemId=${feedItemId}`)
      if (response.ok) {
        const data = await response.json()
        setComments(data.comments || [])
      }
    } catch (error) {
      console.error('Error loading comments:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!comment.trim()) return

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/feedback/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          feedItemId,
          comment: comment.trim(),
        }),
      })

      if (response.ok) {
        setComment('')
        await loadComments()
      } else {
        console.error('Failed to submit comment')
      }
    } catch (error) {
      console.error('Error submitting comment:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <MessageCircle className="h-4 w-4" />
          {comments.length > 0 && <span className="ml-1 text-xs">{comments.length}</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Guide Your Agent</DialogTitle>
          <DialogDescription>
            Add comments to help your agent refine future searches
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Comment Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <Textarea
              placeholder="Tell your agent how to improve... (e.g., 'More Reddit, less HackerNews')"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              disabled={isSubmitting}
            />
            <Button type="submit" disabled={isSubmitting || !comment.trim()} className="w-full">
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </Button>
          </form>

          {/* Comments List */}
          {isLoading ? (
            <div className="text-center py-4 text-sm text-muted-foreground">
              Loading comments...
            </div>
          ) : comments.length > 0 ? (
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              <h4 className="text-sm font-medium">Previous Comments</h4>
              {comments.map((c) => (
                <div key={c.id} className="p-3 bg-muted rounded-lg text-sm space-y-1">
                  <p>{c.comment}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No comments yet. Be the first to guide your agent!
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
