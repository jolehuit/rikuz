import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/queue/items
 * Get queue items with optional status filter
 *
 * Query params:
 * - status: pending | processing | completed | failed
 * - limit: number (default: 50)
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Build query
    let query = supabase
      .from('search_queue')
      .select(
        `
        id,
        agent_id,
        topic_id,
        status,
        retry_count,
        max_retries,
        error_message,
        results_count,
        started_at,
        completed_at,
        created_at
      `
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Add status filter if provided
    if (status && ['pending', 'processing', 'completed', 'failed'].includes(status)) {
      query = query.eq('status', status)
    }

    const { data: items, error } = await query

    if (error) {
      throw new Error(`Failed to fetch queue items: ${error.message}`)
    }

    return NextResponse.json({ items: items || [] })
  } catch (error) {
    console.error('Error fetching queue items:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch queue items',
      },
      { status: 500 }
    )
  }
}
