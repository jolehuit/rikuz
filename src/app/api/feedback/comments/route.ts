import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { feedItemId, comment } = body

    if (!feedItemId || !comment) {
      return NextResponse.json({ error: 'feedItemId and comment are required' }, { status: 400 })
    }

    // Create new comment feedback (type can be null for comments-only feedback)
    const { data, error } = await supabase
      .from('feedback')
      .insert({
        user_id: user.id,
        feed_item_id: feedItemId,
        type: 'like', // Default type for comments
        comment: comment.trim(),
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating comment:', error)
      return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 })
    }

    return NextResponse.json({ success: true, comment: data })
  } catch (error) {
    console.error('Error in comments API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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
  const feedItemId = searchParams.get('feedItemId')

  if (!feedItemId) {
    return NextResponse.json({ error: 'feedItemId is required' }, { status: 400 })
  }

  try {
    const { data, error } = await supabase
      .from('feedback')
      .select('id, comment, created_at')
      .eq('user_id', user.id)
      .eq('feed_item_id', feedItemId)
      .not('comment', 'is', null)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching comments:', error)
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
    }

    return NextResponse.json({ comments: data })
  } catch (error) {
    console.error('Error in comments API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
