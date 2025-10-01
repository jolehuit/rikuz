import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { aggregateFeedback } from '@/services/feedbackAggregation'

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

  const searchParams = request.nextUrl.searchParams
  const topicId = searchParams.get('topicId')

  if (!topicId) {
    return NextResponse.json({ error: 'topicId is required' }, { status: 400 })
  }

  try {
    const aggregation = await aggregateFeedback(user.id, topicId)

    if (!aggregation) {
      // No feedback yet
      return NextResponse.json({
        like_ratio: 0,
        total_feedback: 0,
        likes: 0,
        dislikes: 0,
        preferred_sources: [],
        user_comments: [],
      })
    }

    return NextResponse.json(aggregation)
  } catch (error) {
    console.error('Error aggregating feedback:', error)
    return NextResponse.json({ error: 'Failed to aggregate feedback' }, { status: 500 })
  }
}
