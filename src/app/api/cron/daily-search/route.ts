import { createClient } from '@supabase/supabase-js'
import { QueueService } from '@/services/queue-service'
import { NextResponse } from 'next/server'

/**
 * GET /api/cron/daily-search
 * Vercel Cron Job to execute daily searches for all active agents
 *
 * This cron job:
 * 1. Fetches all active agents
 * 2. Enqueues them in the search_queue table
 * 3. Processes the queue with rate limiting (60 requests/minute)
 *
 * Triggered daily at 6:00 UTC
 * See vercel.json for cron configuration
 */
export async function GET(request: Request) {
  try {
    // Verify this is a cron request from Vercel
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use service role key for cron job (bypasses RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get all active agents
    const { data: agents, error } = await supabase
      .from('agents')
      .select('agent_id')
      .eq('status', 'active')

    if (error) {
      throw new Error(`Failed to fetch agents: ${error.message}`)
    }

    if (!agents || agents.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active agents to process',
        enqueued: 0,
        processed: 0,
      })
    }

    console.log(`Starting daily search for ${agents.length} agents`)

    // Step 1: Enqueue all agents
    const agentIds = agents.map((a) => a.agent_id)
    await QueueService.enqueueAgents(agentIds)

    console.log(`Enqueued ${agentIds.length} agents`)

    // Step 2: Process the queue with rate limiting
    const queueResults = await QueueService.processQueue()

    console.log(
      `Queue processing completed: ${queueResults.processed} processed, ${queueResults.completed} completed, ${queueResults.failed} failed`
    )

    // Step 3: Get final queue stats
    const queueStats = await QueueService.getQueueStats()

    return NextResponse.json({
      success: true,
      message: 'Daily search completed',
      enqueued: agentIds.length,
      processed: queueResults.processed,
      completed: queueResults.completed,
      failed: queueResults.failed,
      queueStats,
    })
  } catch (error) {
    console.error('Error in daily search cron:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to execute daily search',
      },
      { status: 500 }
    )
  }
}

/**
 * Runtime configuration for Vercel Edge Functions
 * maxDuration: Maximum execution time in seconds (10 minutes for daily cron)
 */
export const maxDuration = 600 // 10 minutes
