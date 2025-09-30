import {
  categorizationAgent,
  type CategorizationResult,
} from '@/mastra/agents/categorization-agent'
import { masterPromptService } from './master-prompt-service'
import { logger } from '@/mastra/index'
import { createClient } from '@supabase/supabase-js'

// Supabase client for database operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export interface TopicData {
  id: string
  title: string
  description?: string
  user_id: string
}

export class CategorizationService {
  /**
   * Categorizes a topic and stores the result in the database
   */
  async categorizeAndStoreTopic(topicData: TopicData): Promise<{
    success: boolean
    categorization?: CategorizationResult
    error?: string
  }> {
    try {
      logger.info(`Categorizing topic: ${topicData.title} (ID: ${topicData.id})`)

      // Prepare topic text for analysis
      const topicText = topicData.description
        ? `${topicData.title}: ${topicData.description}`
        : topicData.title

      // Categorize the topic
      const categorization = await categorizationAgent.categorize(topicText)

      // Validate the categorization result
      const validation = categorizationAgent.validateCategorization(categorization)
      if (!validation.valid) {
        logger.warn(
          `Categorization validation failed for topic ${topicData.id}:`,
          validation.issues
        )
        // Continue anyway - validation issues are warnings, not blockers
      }

      // Store the categorization result in the database
      const { error } = await supabase
        .from('topics')
        .update({
          categorization_result: categorization,
          updated_at: new Date().toISOString(),
        })
        .eq('id', topicData.id)

      if (error) {
        logger.error(`Failed to store categorization for topic ${topicData.id}:`, error)
        return {
          success: false,
          error: `Database error: ${error.message}`,
        }
      }

      logger.info(`Successfully categorized and stored topic ${topicData.id}`)

      // Automatically generate Master Prompt after successful categorization
      try {
        const masterPromptResult = await masterPromptService.autoGenerateMasterPrompt(
          topicData.id,
          categorization,
          topicData
        )

        if (masterPromptResult.success) {
          logger.info(`Auto-generated Master Prompt for topic ${topicData.id}`)
        } else {
          logger.warn(
            `Failed to auto-generate Master Prompt for topic ${topicData.id}: ${masterPromptResult.error}`
          )
        }
      } catch (error) {
        logger.warn(`Master Prompt auto-generation failed for topic ${topicData.id}:`, error)
        // Continue anyway - Master Prompt generation failure should not block categorization
      }

      return {
        success: true,
        categorization,
      }
    } catch (error) {
      logger.error(`Categorization service error for topic ${topicData.id}:`, error)

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Retrieves categorization result for a topic
   */
  async getTopicCategorization(topicId: string): Promise<{
    success: boolean
    categorization?: CategorizationResult
    error?: string
  }> {
    try {
      const { data, error } = await supabase
        .from('topics')
        .select('categorization_result')
        .eq('id', topicId)
        .single()

      if (error) {
        return {
          success: false,
          error: `Database error: ${error.message}`,
        }
      }

      return {
        success: true,
        categorization: data?.categorization_result || undefined,
      }
    } catch (error) {
      logger.error(`Failed to retrieve categorization for topic ${topicId}:`, error)

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Re-categorize an existing topic (useful for updates or fixes)
   */
  async recategorizeTopic(topicId: string): Promise<{
    success: boolean
    categorization?: CategorizationResult
    error?: string
  }> {
    try {
      // Get topic data
      const { data: topic, error: fetchError } = await supabase
        .from('topics')
        .select('id, title, description, user_id')
        .eq('id', topicId)
        .single()

      if (fetchError || !topic) {
        return {
          success: false,
          error: `Topic not found: ${fetchError?.message || 'Unknown error'}`,
        }
      }

      // Re-categorize using existing method
      return await this.categorizeAndStoreTopic(topic)
    } catch (error) {
      logger.error(`Failed to recategorize topic ${topicId}:`, error)

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Batch categorization for multiple topics
   */
  async categorizeBatchTopics(topicIds: string[]): Promise<{
    successful: number
    failed: number
    results: Array<{
      topicId: string
      success: boolean
      categorization?: CategorizationResult
      error?: string
    }>
  }> {
    logger.info(`Starting batch categorization for ${topicIds.length} topics`)

    const results = []
    let successful = 0
    let failed = 0

    for (const topicId of topicIds) {
      const result = await this.recategorizeTopic(topicId)

      results.push({
        topicId,
        success: result.success,
        categorization: result.categorization,
        error: result.error,
      })

      if (result.success) {
        successful++
      } else {
        failed++
      }
    }

    logger.info(`Batch categorization completed: ${successful} successful, ${failed} failed`)

    return {
      successful,
      failed,
      results,
    }
  }

  /**
   * Get service status and statistics
   */
  async getServiceStatus(): Promise<{
    agentStatus: { name: string; ready: boolean; queueStatus: Record<string, unknown> }
    totalTopics: number
    categorizedTopics: number
    recentActivity: Array<{ id: string; title: string; updated_at: string }>
  }> {
    try {
      // Get agent status
      const agentStatus = categorizationAgent.getStatus()

      // Get topic statistics
      const { count: totalTopics } = await supabase
        .from('topics')
        .select('*', { count: 'exact', head: true })

      const { count: categorizedTopics } = await supabase
        .from('topics')
        .select('*', { count: 'exact', head: true })
        .not('categorization_result', 'is', null)

      // Get recent activity (topics categorized in last 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { data: recentActivity } = await supabase
        .from('topics')
        .select('id, title, updated_at')
        .not('categorization_result', 'is', null)
        .gte('updated_at', oneDayAgo)
        .order('updated_at', { ascending: false })
        .limit(10)

      return {
        agentStatus,
        totalTopics: totalTopics || 0,
        categorizedTopics: categorizedTopics || 0,
        recentActivity: recentActivity || [],
      }
    } catch (error) {
      logger.error('Failed to get service status:', error)
      throw error
    }
  }
}

// Export singleton instance
export const categorizationService = new CategorizationService()
