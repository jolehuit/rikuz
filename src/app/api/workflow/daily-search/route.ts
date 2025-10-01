import { serve } from '@upstash/workflow/nextjs'
import { createClient } from '@supabase/supabase-js'
import { QueueService } from '@/services/queue-service'

/**
 * Upstash Workflow for daily search execution
 *
 * This workflow:
 * 1. Fetches all active agents
 * 2. Enqueues them in the search_queue table
 * 3. Processes the queue with rate limiting (60 requests/minute)
 *
 * Scheduled via QStash to run daily at 8:00 UTC
 */
export const { POST } = serve(
  async (context) => {
    // Step 1: Fetch all active agents
    const agents = await context.run('fetch-active-agents', async () => {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      const { data, error } = await supabase
        .from('agents')
        .select('agent_id')
        .eq('status', 'active')

      if (error) {
        throw new Error(`Failed to fetch agents: ${error.message}`)
      }

      console.log(`Found ${data?.length || 0} active agents`)
      return data || []
    })

    if (agents.length === 0) {
      console.log('No active agents to process')
      return {
        success: true,
        message: 'No active agents to process',
        enqueued: 0,
        processed: 0,
      }
    }

    // Step 2: Enqueue all agents
    const enqueueResult = await context.run('enqueue-agents', async () => {
      const agentIds = agents.map((a) => a.agent_id)
      await QueueService.enqueueAgents(agentIds)
      console.log(`Enqueued ${agentIds.length} agents`)
      return { count: agentIds.length, agentIds }
    })

    // Step 3: Process the queue with rate limiting
    const queueResults = await context.run('process-queue', async () => {
      const results = await QueueService.processQueue()
      console.log(
        `Queue processing: ${results.processed} processed, ${results.completed} completed, ${results.failed} failed`
      )
      return results
    })

    // Step 4: Get final stats
    const finalStats = await context.run('get-queue-stats', async () => {
      return await QueueService.getQueueStats()
    })

    return {
      success: true,
      message: 'Daily search workflow completed',
      enqueued: enqueueResult.count,
      processed: queueResults.processed,
      completed: queueResults.completed,
      failed: queueResults.failed,
      queueStats: finalStats,
    }
  },
  {
    retries: 3,
    failureFunction: async ({ context, failStatus, failResponse }) => {
      console.error('Daily search workflow failed:', {
        status: failStatus,
        response: failResponse,
      })

      // TODO: Send alert email or notification
      return `Workflow failed with status ${failStatus}: ${failResponse}`
    },
  }
)
