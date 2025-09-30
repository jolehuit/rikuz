'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp, Calendar } from 'lucide-react'

interface DailySummary {
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

interface DailySummaryProps {
  summary: DailySummary
  defaultExpanded?: boolean
}

export function DailySummary({ summary, defaultExpanded = false }: DailySummaryProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const formattedDate = new Date(summary.date).toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <Card className="mb-4">
      <CardHeader>
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-lg">Daily Summary</CardTitle>
              <CardDescription>{formattedDate}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{summary.items_count} items</span>
            <Button variant="ghost" size="sm">
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Summary</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{summary.summary}</p>
          </div>

          {summary.highlights && (
            <div>
              <h4 className="font-medium mb-2">Highlights</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {summary.highlights}
              </p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
