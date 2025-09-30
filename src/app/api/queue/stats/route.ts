import { createClient } from '@/utils/supabase/server'
import { QueueService } from '@/services/queue-service'
import { NextResponse } from 'next/server'

/**
 * GET /api/queue/stats
 * Get queue statistics (pending, processing, completed, failed counts)
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get queue stats
    const stats = await QueueService.getQueueStats()

    return NextResponse.json({ stats })
  } catch (error) {
    console.error('Error fetching queue stats:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch queue stats',
      },
      { status: 500 }
    )
  }
}
