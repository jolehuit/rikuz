export interface FeedItem {
  id: string
  topic_id: string
  title: string
  url: string
  source: string | null
  summary: string | null
  published_at: string | null
  created_at: string
  agent_id: string | null
  user_id: string | null
  relevance_score: number | null
  topic?: {
    id: string
    title: string
  }
}

export interface FeedItemWithFeedback extends FeedItem {
  userFeedback?: {
    type: 'like' | 'dislike'
    comment?: string
  } | null
  isSaved?: boolean
}
