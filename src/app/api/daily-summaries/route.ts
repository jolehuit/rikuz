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

  const searchParams = request.nextUrl.searchParams
  const topicId = searchParams.get('topicId')
  const date = searchParams.get('date') // Format: YYYY-MM-DD

  try {
    let query = supabase
      .from('daily_summaries')
      .select(
        `
        *,
        topic:topics (
          id,
          title
        )
      `
      )
      .eq('user_id', user.id)
      .order('date', { ascending: false })

    if (topicId) {
      query = query.eq('topic_id', topicId)
    }

    if (date) {
      query = query.eq('date', date)
    } else {
      // If no date specified, get summaries from the last 7 days
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      query = query.gte('date', sevenDaysAgo.toISOString().split('T')[0])
    }

    const { data: summaries, error } = await query

    if (error) {
      console.error('Error fetching daily summaries:', error)
      return NextResponse.json({ error: 'Failed to fetch daily summaries' }, { status: 500 })
    }

    return NextResponse.json({ summaries: summaries || [] })
  } catch (error) {
    console.error('Error in daily-summaries API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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
    const { topicId, date, summary, itemsCount, highlights } = body

    if (!topicId || !date || !summary) {
      return NextResponse.json(
        { error: 'topicId, date, and summary are required' },
        { status: 400 }
      )
    }

    // Check if summary already exists for this topic and date
    const { data: existing } = await supabase
      .from('daily_summaries')
      .select('id')
      .eq('user_id', user.id)
      .eq('topic_id', topicId)
      .eq('date', date)
      .single()

    if (existing) {
      // Update existing summary
      const { data, error } = await supabase
        .from('daily_summaries')
        .update({
          summary,
          items_count: itemsCount || 0,
          highlights: highlights || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating daily summary:', error)
        return NextResponse.json({ error: 'Failed to update daily summary' }, { status: 500 })
      }

      return NextResponse.json({ success: true, summary: data })
    }

    // Create new summary
    const { data, error } = await supabase
      .from('daily_summaries')
      .insert({
        user_id: user.id,
        topic_id: topicId,
        date,
        summary,
        items_count: itemsCount || 0,
        highlights: highlights || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating daily summary:', error)
      return NextResponse.json({ error: 'Failed to create daily summary' }, { status: 500 })
    }

    return NextResponse.json({ success: true, summary: data })
  } catch (error) {
    console.error('Error in daily-summaries API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
