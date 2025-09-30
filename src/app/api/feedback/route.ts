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
    const { feedItemId, type, comment } = body

    if (!feedItemId) {
      return NextResponse.json({ error: 'feedItemId is required' }, { status: 400 })
    }

    // If type is null, delete existing feedback
    if (type === null) {
      const { error: deleteError } = await supabase
        .from('feedback')
        .delete()
        .eq('user_id', user.id)
        .eq('feed_item_id', feedItemId)
        .is('comment', null) // Only delete feedback without comments

      if (deleteError) {
        console.error('Error deleting feedback:', deleteError)
        return NextResponse.json({ error: 'Failed to delete feedback' }, { status: 500 })
      }

      return NextResponse.json({ success: true, feedback: null })
    }

    // Validate type
    if (!['like', 'dislike'].includes(type)) {
      return NextResponse.json({ error: 'type must be "like" or "dislike"' }, { status: 400 })
    }

    // Check if feedback already exists
    const { data: existingFeedback } = await supabase
      .from('feedback')
      .select('*')
      .eq('user_id', user.id)
      .eq('feed_item_id', feedItemId)
      .is('comment', null)
      .single()

    if (existingFeedback) {
      // Update existing feedback
      const { data, error } = await supabase
        .from('feedback')
        .update({ type, updated_at: new Date().toISOString() })
        .eq('id', existingFeedback.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating feedback:', error)
        return NextResponse.json({ error: 'Failed to update feedback' }, { status: 500 })
      }

      return NextResponse.json({ success: true, feedback: data })
    }

    // Create new feedback
    const { data, error } = await supabase
      .from('feedback')
      .insert({
        user_id: user.id,
        feed_item_id: feedItemId,
        type,
        comment: comment || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating feedback:', error)
      return NextResponse.json({ error: 'Failed to create feedback' }, { status: 500 })
    }

    return NextResponse.json({ success: true, feedback: data })
  } catch (error) {
    console.error('Error in feedback API:', error)
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
      .select('*')
      .eq('user_id', user.id)
      .eq('feed_item_id', feedItemId)

    if (error) {
      console.error('Error fetching feedback:', error)
      return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 })
    }

    return NextResponse.json({ feedback: data })
  } catch (error) {
    console.error('Error in feedback API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
