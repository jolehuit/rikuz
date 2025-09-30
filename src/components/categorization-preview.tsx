'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'

export interface CategorizationResult {
  sources: string[]
  keywords: string[]
  context: string
}

interface CategorizationPreviewProps {
  topic: {
    id: string
    title: string
    description?: string
  }
  categorization?: CategorizationResult
  onCategorize?: () => Promise<void>
  loading?: boolean
  showActions?: boolean
}

const sourceColors: Record<string, string> = {
  github: 'bg-gray-800 text-white',
  reddit: 'bg-orange-500 text-white',
  hackernews: 'bg-orange-600 text-white',
  blogs: 'bg-blue-500 text-white',
  news: 'bg-red-500 text-white',
  presse: 'bg-red-600 text-white',
  forums: 'bg-purple-500 text-white',
  stackoverflow: 'bg-orange-400 text-white',
  medium: 'bg-green-600 text-white',
  'dev.to': 'bg-black text-white',
  twitter: 'bg-blue-400 text-white',
  linkedin: 'bg-blue-700 text-white',
  youtube: 'bg-red-600 text-white',
  documentation: 'bg-blue-600 text-white',
  academic: 'bg-indigo-600 text-white',
  podcasts: 'bg-purple-600 text-white',
  newsletters: 'bg-yellow-600 text-white',
}

export function CategorizationPreview({
  topic,
  categorization,
  onCategorize,
  loading = false,
  showActions = true,
}: CategorizationPreviewProps) {
  const [isLoading, setIsLoading] = useState(loading)

  const handleCategorize = async () => {
    if (onCategorize) {
      setIsLoading(true)
      try {
        await onCategorize()
      } finally {
        setIsLoading(false)
      }
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Analyzing Topic...
          </CardTitle>
          <CardDescription>
            AI is identifying relevant sources and keywords for &ldquo;{topic.title}&rdquo;
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="flex gap-2 mb-4">
                <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                <div className="h-6 bg-gray-200 rounded-full w-14"></div>
              </div>
              <div className="h-16 bg-gray-200 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!categorization) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            Not Yet Categorized
          </CardTitle>
          <CardDescription>
            This topic hasn&apos;t been analyzed yet. Click below to identify relevant sources.
          </CardDescription>
        </CardHeader>
        {showActions && (
          <CardContent>
            <Button onClick={handleCategorize} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Analyze Topic
            </Button>
          </CardContent>
        )}
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-500" />
          Topic Analysis
        </CardTitle>
        <CardDescription>
          AI-identified sources and keywords for optimal content discovery
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sources Section */}
        <div>
          <h4 className="text-sm font-medium mb-3 text-gray-700">
            Recommended Sources ({categorization.sources.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {categorization.sources.map((source) => (
              <Badge
                key={source}
                variant="secondary"
                className={sourceColors[source] || 'bg-gray-500 text-white'}
              >
                {source}
              </Badge>
            ))}
          </div>
        </div>

        {/* Keywords Section */}
        <div>
          <h4 className="text-sm font-medium mb-3 text-gray-700">
            Search Keywords ({categorization.keywords.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {categorization.keywords.map((keyword, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {keyword}
              </Badge>
            ))}
          </div>
        </div>

        {/* Context Section */}
        <div>
          <h4 className="text-sm font-medium mb-2 text-gray-700">Analysis Context</h4>
          <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
            {categorization.context}
          </p>
        </div>

        {/* Actions */}
        {showActions && (
          <div className="pt-4 border-t">
            <Button variant="outline" size="sm" onClick={handleCategorize} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Re-analyze
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
