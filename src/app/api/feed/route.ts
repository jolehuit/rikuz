import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get query parameters
  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get('page') || '0')
  const limit = parseInt(searchParams.get('limit') || '20')
  const topicFilter = searchParams.get('topic')

  const offset = page * limit

  try {
    // Build query
    let query = supabase
      .from('feed_items')
      .select(
        `
        *,
        topic:topics (
          id,
          title
        )
      `,
        { count: 'exact' }
      )
      .eq('user_id', user.id)
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply topic filter if provided
    if (topicFilter) {
      query = query.eq('topic_id', topicFilter)
    }

    const { data: items, error, count } = await query

    if (error) {
      console.error('Error fetching feed items:', error)
      return NextResponse.json({ error: 'Failed to fetch feed items' }, { status: 500 })
    }

    // Fetch feedback for all items
    const itemIds = items?.map((item) => item.id) || []
    let feedbackMap: Record<
      string,
      Array<{ type: string; comment: string | null; feed_item_id: string }>
    > = {}
    let savedItemsSet: Set<string> = new Set()

    if (itemIds.length > 0) {
      // Fetch feedbacks
      const { data: feedbacks } = await supabase
        .from('feedback')
        .select('*')
        .eq('user_id', user.id)
        .in('feed_item_id', itemIds)

      feedbackMap =
        feedbacks?.reduce(
          (acc, fb) => {
            if (!acc[fb.feed_item_id]) {
              acc[fb.feed_item_id] = []
            }
            acc[fb.feed_item_id].push(fb)
            return acc
          },
          {} as Record<
            string,
            Array<{ type: string; comment: string | null; feed_item_id: string }>
          >
        ) || {}

      // Fetch saved items
      const { data: savedItems } = await supabase
        .from('saved_items')
        .select('feed_item_id')
        .eq('user_id', user.id)
        .in('feed_item_id', itemIds)

      savedItemsSet = new Set(savedItems?.map((si) => si.feed_item_id) || [])
    }

    // Enrich items with feedback and saved status
    const enrichedItems = items?.map((item) => {
      const itemFeedbacks = feedbackMap[item.id] || []
      const likeFeedback = itemFeedbacks.find((f) => f.type === 'like' && !f.comment)
      const dislikeFeedback = itemFeedbacks.find((f) => f.type === 'dislike' && !f.comment)

      return {
        ...item,
        userFeedback: likeFeedback || dislikeFeedback || null,
        isSaved: savedItemsSet.has(item.id),
      }
    })

    const hasMore = count ? offset + limit < count : false

    return NextResponse.json({
      items: enrichedItems || [],
      hasMore,
      total: count || 0,
    })
  } catch (error) {
    console.error('Error in feed API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
