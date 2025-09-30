'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Bookmark } from 'lucide-react'

interface SaveButtonProps {
  feedItemId: string
  initialSaved?: boolean
  onSaveChange?: (saved: boolean) => void
}

export function SaveButton({ feedItemId, initialSaved = false, onSaveChange }: SaveButtonProps) {
  const [isSaved, setIsSaved] = useState(initialSaved)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleToggleSave = async () => {
    if (isSubmitting) return

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/saved-items', {
        method: isSaved ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          feedItemId,
        }),
      })

      if (response.ok) {
        const newSavedState = !isSaved
        setIsSaved(newSavedState)
        onSaveChange?.(newSavedState)
      } else {
        console.error('Failed to toggle save')
      }
    } catch (error) {
      console.error('Error toggling save:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggleSave}
      disabled={isSubmitting}
      className={`transition-all ${isSaved ? 'text-yellow-600 hover:text-yellow-700' : ''}`}
      title={isSaved ? 'Remove from Read Later' : 'Save to Read Later'}
    >
      <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
    </Button>
  )
}
