import { createClient } from '@supabase/supabase-js'
import { executeSearchWithRetry } from './search-service'
import { logger } from '@/mastra/lib/logger'

export interface QueueItem {
  id: string
  agent_id: string
  topic_id: string
  user_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  retry_count: number
  max_retries: number
  error_message?: string
  results_count?: number
  started_at?: string
  completed_at?: string
  created_at: string
  updated_at: string
}

/**
 * Queue Service
 * Manages the search queue for rate limiting and background processing
 */
export class QueueService {
  private static supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  /**
   * Add agents to the queue
   * This is called by the cron job to queue all active agents
   */
  static async enqueueAgents(agentIds: string[]): Promise<void> {
    logger.info(`Enqueuing ${agentIds.length} agents`)

    // Get agent details
    const { data: agents, error: agentsError } = await this.supabase
      .from('agents')
      .select('agent_id, topic_id, user_id')
      .in('agent_id', agentIds)
      .eq('status', 'active')

    if (agentsError) {
      throw new Error(`Failed to fetch agents: ${agentsError.message}`)
    }

    if (!agents || agents.length === 0) {
      logger.warn('No agents found to enqueue')
      return
    }

    // Create queue items
    const queueItems = agents.map((agent) => ({
      agent_id: agent.agent_id,
      topic_id: agent.topic_id,
      user_id: agent.user_id,
      status: 'pending' as const,
      retry_count: 0,
      max_retries: 3,
    }))

    // Insert into queue
    const { error } = await this.supabase.from('search_queue').insert(queueItems)

    if (error) {
      throw new Error(`Failed to enqueue agents: ${error.message}`)
    }

    logger.info(`Successfully enqueued ${queueItems.length} agents`)
  }

  /**
   * Get next pending item from the queue
   */
  static async getNextPending(): Promise<QueueItem | null> {
    const { data, error } = await this.supabase
      .from('search_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        return null
      }
      throw new Error(`Failed to get next pending item: ${error.message}`)
    }

    return data as QueueItem
  }

  /**
   * Mark queue item as processing
   */
  static async markAsProcessing(queueId: string): Promise<void> {
    const { error } = await this.supabase
      .from('search_queue')
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
      })
      .eq('id', queueId)

    if (error) {
      throw new Error(`Failed to mark as processing: ${error.message}`)
    }
  }

  /**
   * Mark queue item as completed
   */
  static async markAsCompleted(queueId: string, resultsCount: number): Promise<void> {
    const { error } = await this.supabase
      .from('search_queue')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        results_count: resultsCount,
      })
      .eq('id', queueId)

    if (error) {
      throw new Error(`Failed to mark as completed: ${error.message}`)
    }
  }

  /**
   * Mark queue item as failed
   * If retry_count < max_retries, reset to pending
   */
  static async markAsFailed(queueId: string, errorMessage: string): Promise<void> {
    // Get current queue item
    const { data: queueItem, error: fetchError } = await this.supabase
      .from('search_queue')
      .select('retry_count, max_retries')
      .eq('id', queueId)
      .single()

    if (fetchError) {
      throw new Error(`Failed to fetch queue item: ${fetchError.message}`)
    }

    const retryCount = (queueItem.retry_count || 0) + 1
    const shouldRetry = retryCount < queueItem.max_retries

    const { error } = await this.supabase
      .from('search_queue')
      .update({
        status: shouldRetry ? 'pending' : 'failed',
        retry_count: retryCount,
        error_message: errorMessage,
        completed_at: shouldRetry ? null : new Date().toISOString(),
      })
      .eq('id', queueId)

    if (error) {
      throw new Error(`Failed to mark as failed: ${error.message}`)
    }

    if (shouldRetry) {
      logger.info(
        `Queue item ${queueId} failed, will retry (attempt ${retryCount}/${queueItem.max_retries})`
      )
    } else {
      logger.error(`Queue item ${queueId} failed permanently after ${retryCount} attempts`)
    }
  }

  /**
   * Process a single queue item
   */
  static async processQueueItem(queueItem: QueueItem): Promise<void> {
    logger.info(`Processing queue item ${queueItem.id} for agent ${queueItem.agent_id}`)

    try {
      // Mark as processing
      await this.markAsProcessing(queueItem.id)

      // Execute search
      const results = await executeSearchWithRetry(queueItem.agent_id, 1)

      // Mark as completed
      await this.markAsCompleted(queueItem.id, results.totalResults)

      logger.info(`Queue item ${queueItem.id} completed: ${results.totalResults} results`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error(`Queue item ${queueItem.id} failed: ${errorMessage}`)

      // Mark as failed (will retry if attempts remaining)
      await this.markAsFailed(queueItem.id, errorMessage)
    }
  }

  /**
   * Process queue with rate limiting
   * Processes up to 60 items per minute
   */
  static async processQueue(): Promise<{
    processed: number
    completed: number
    failed: number
  }> {
    const RATE_LIMIT = 60 // requests per minute
    const INTERVAL_MS = (60 * 1000) / RATE_LIMIT // ~1000ms per request

    let processed = 0
    let completed = 0
    let failed = 0

    logger.info('Starting queue processing')

    while (true) {
      // Get next pending item
      const queueItem = await this.getNextPending()

      if (!queueItem) {
        logger.info('No more pending items in queue')
        break
      }

      // Process the item
      const startTime = Date.now()

      try {
        await this.processQueueItem(queueItem)
        completed++
      } catch (error) {
        logger.error(`Failed to process queue item:`, error)
        failed++
      }

      processed++

      // Rate limiting: ensure we don't exceed RATE_LIMIT per minute
      const elapsedMs = Date.now() - startTime
      const delayMs = Math.max(0, INTERVAL_MS - elapsedMs)

      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }

      // Log progress every 10 items
      if (processed % 10 === 0) {
        logger.info(
          `Queue progress: ${processed} processed, ${completed} completed, ${failed} failed`
        )
      }
    }

    logger.info(
      `Queue processing completed: ${processed} processed, ${completed} completed, ${failed} failed`
    )

    return { processed, completed, failed }
  }

  /**
   * Get queue statistics
   */
  static async getQueueStats(): Promise<{
    pending: number
    processing: number
    completed: number
    failed: number
    total: number
  }> {
    const { data, error } = await this.supabase.from('search_queue').select('status')

    if (error) {
      throw new Error(`Failed to get queue stats: ${error.message}`)
    }

    const stats = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      total: data?.length || 0,
    }

    data?.forEach((item) => {
      stats[item.status as keyof typeof stats]++
    })

    return stats
  }

  /**
   * Clear completed queue items older than X days
   */
  static async clearOldItems(daysOld: number = 7): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)

    const { data, error } = await this.supabase
      .from('search_queue')
      .delete()
      .eq('status', 'completed')
      .lt('completed_at', cutoffDate.toISOString())
      .select('id')

    if (error) {
      throw new Error(`Failed to clear old items: ${error.message}`)
    }

    const deletedCount = data?.length || 0
    logger.info(`Cleared ${deletedCount} old queue items`)

    return deletedCount
  }
}
