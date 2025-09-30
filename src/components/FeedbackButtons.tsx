'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Heart, ThumbsDown } from 'lucide-react'

interface FeedbackButtonsProps {
  feedItemId: string
  initialFeedback?: 'like' | 'dislike' | null
  onFeedbackChange?: (type: 'like' | 'dislike' | null) => void
}

export function FeedbackButtons({
  feedItemId,
  initialFeedback = null,
  onFeedbackChange,
}: FeedbackButtonsProps) {
  const [feedback, setFeedback] = useState<'like' | 'dislike' | null>(initialFeedback)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleFeedback = async (type: 'like' | 'dislike') => {
    if (isSubmitting) return

    const newFeedback = feedback === type ? null : type

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          feedItemId,
          type: newFeedback,
        }),
      })

      if (response.ok) {
        setFeedback(newFeedback)
        onFeedbackChange?.(newFeedback)
      } else {
        console.error('Failed to submit feedback')
      }
    } catch (error) {
      console.error('Error submitting feedback:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={feedback === 'like' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => handleFeedback('like')}
        disabled={isSubmitting}
        className={`transition-all ${
          feedback === 'like' ? 'bg-red-500 hover:bg-red-600 text-white' : 'hover:bg-red-50'
        }`}
      >
        <Heart className={`h-4 w-4 ${feedback === 'like' ? 'fill-current' : ''}`} />
      </Button>
      <Button
        variant={feedback === 'dislike' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => handleFeedback('dislike')}
        disabled={isSubmitting}
        className={`transition-all ${
          feedback === 'dislike' ? 'bg-gray-700 hover:bg-gray-800 text-white' : 'hover:bg-gray-100'
        }`}
      >
        <ThumbsDown className={`h-4 w-4 ${feedback === 'dislike' ? 'fill-current' : ''}`} />
      </Button>
    </div>
  )
}
