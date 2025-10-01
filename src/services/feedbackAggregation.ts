import { createClient } from '@/utils/supabase/server'

export interface FeedbackAggregationResult {
  like_ratio: number
  total_feedback: number
  likes: number
  dislikes: number
  preferred_sources: Array<{ source: string; count: number }>
  user_comments: Array<{
    comment: string
    feed_item_title: string
    created_at: string
  }>
}

/**
 * Aggregates all feedback for a user and topic
 *
 * @param user_id - The user's UUID
 * @param topic_id - The topic's UUID
 * @returns Aggregated feedback metrics or null if no feedback exists
 */
export async function aggregateFeedback(
  user_id: string,
  topic_id: string
): Promise<FeedbackAggregationResult | null> {
  const supabase = await createClient()

  // Fetch all feedback for the user's topic
  const { data: feedbackData, error: feedbackError } = await supabase
    .from('feedback')
    .select(
      `
      id,
      type,
      comment,
      created_at,
      feed_item_id,
      feed_items!inner (
        id,
        title,
        source,
        topic_id
      )
    `
    )
    .eq('user_id', user_id)
    .eq('feed_items.topic_id', topic_id)

  if (feedbackError) {
    throw new Error(`Failed to fetch feedback: ${feedbackError.message}`)
  }

  // No feedback yet - return empty metrics
  if (!feedbackData || feedbackData.length === 0) {
    return null
  }

  // Calculate metrics
  const likes = feedbackData.filter((f) => f.type === 'like').length
  const dislikes = feedbackData.filter((f) => f.type === 'dislike').length
  const total = likes + dislikes

  // Calculate like ratio
  const like_ratio = total > 0 ? likes / total : 0

  // Extract preferred sources (sources with most likes)
  const sourceMap = new Map<string, number>()
  feedbackData
    .filter((f) => f.type === 'like' && f.feed_items?.source)
    .forEach((f) => {
      const source = f.feed_items!.source as string
      sourceMap.set(source, (sourceMap.get(source) || 0) + 1)
    })

  const preferred_sources = Array.from(sourceMap.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)

  // Extract user comments
  const user_comments = feedbackData
    .filter((f) => f.comment && f.comment.trim() !== '')
    .map((f) => ({
      comment: f.comment as string,
      feed_item_title: f.feed_items?.title || 'Unknown',
      created_at: f.created_at,
    }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return {
    like_ratio,
    total_feedback: total,
    likes,
    dislikes,
    preferred_sources,
    user_comments,
  }
}
