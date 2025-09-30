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
    const { feedItemId } = body

    if (!feedItemId) {
      return NextResponse.json({ error: 'feedItemId is required' }, { status: 400 })
    }

    // Check if already saved
    const { data: existing } = await supabase
      .from('saved_items')
      .select('*')
      .eq('user_id', user.id)
      .eq('feed_item_id', feedItemId)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Item already saved' }, { status: 400 })
    }

    // Save item
    const { data, error } = await supabase
      .from('saved_items')
      .insert({
        user_id: user.id,
        feed_item_id: feedItemId,
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving item:', error)
      return NextResponse.json({ error: 'Failed to save item' }, { status: 500 })
    }

    return NextResponse.json({ success: true, savedItem: data })
  } catch (error) {
    console.error('Error in saved-items API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
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
    const { feedItemId } = body

    if (!feedItemId) {
      return NextResponse.json({ error: 'feedItemId is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('saved_items')
      .delete()
      .eq('user_id', user.id)
      .eq('feed_item_id', feedItemId)

    if (error) {
      console.error('Error removing saved item:', error)
      return NextResponse.json({ error: 'Failed to remove saved item' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in saved-items API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
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
    const { data, error } = await supabase
      .from('saved_items')
      .select(
        `
        id,
        created_at,
        feed_item:feed_items (
          id,
          title,
          url,
          source,
          summary,
          published_at,
          created_at,
          topic:topics (
            id,
            title
          )
        )
      `
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching saved items:', error)
      return NextResponse.json({ error: 'Failed to fetch saved items' }, { status: 500 })
    }

    return NextResponse.json({ savedItems: data })
  } catch (error) {
    console.error('Error in saved-items API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
