import { masterPromptGenerator, type TopicContext } from '@/mastra/agents/master-prompt-generator'
import type { CategorizationResult } from '@/mastra/agents/categorization-agent'
import { logger } from '@/mastra/lib/logger'
import { createClient } from '@supabase/supabase-js'

// Supabase client for database operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export interface TopicWithPrompt {
  id: string
  title: string
  description?: string
  user_id: string
  categorization_result?: CategorizationResult
  master_prompt?: string
  updated_at: string
}

export class MasterPromptService {
  /**
   * Generates and stores Master Prompt for a topic
   */
  async generateAndStoreMasterPrompt(
    topicId: string,
    userPreferences?: TopicContext['userPreferences']
  ): Promise<{
    success: boolean
    masterPrompt?: string
    error?: string
  }> {
    try {
      logger.info(`Generating Master Prompt for topic: ${topicId}`)

      // Get topic data including categorization result
      const { data: topic, error: fetchError } = await supabase
        .from('topics')
        .select('id, title, description, user_id, categorization_result')
        .eq('id', topicId)
        .single()

      if (fetchError || !topic) {
        return {
          success: false,
          error: `Topic not found: ${fetchError?.message || 'Unknown error'}`,
        }
      }

      // Ensure topic has been categorized
      if (!topic.categorization_result) {
        return {
          success: false,
          error: 'Topic must be categorized before generating Master Prompt',
        }
      }

      // Prepare topic context
      const topicContext: TopicContext = {
        title: topic.title,
        description: topic.description || undefined,
        userPreferences: userPreferences || {},
      }

      // Generate Master Prompt
      const masterPrompt = masterPromptGenerator.generateMasterPrompt(
        topicContext,
        topic.categorization_result as CategorizationResult
      )

      // Validate the generated prompt
      const validation = masterPromptGenerator.validateMasterPrompt(masterPrompt)
      if (!validation.valid) {
        logger.warn(`Master Prompt validation issues for topic ${topicId}:`, validation.issues)
        // Continue anyway - validation issues are warnings, not blockers
      }

      // Store the Master Prompt in the database
      const { error } = await supabase
        .from('topics')
        .update({
          master_prompt: masterPrompt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', topicId)

      if (error) {
        logger.error(`Failed to store Master Prompt for topic ${topicId}:`, error)
        return {
          success: false,
          error: `Database error: ${error.message}`,
        }
      }

      logger.info(
        `Successfully generated and stored Master Prompt for topic ${topicId} (${masterPrompt.length} chars)`
      )

      return {
        success: true,
        masterPrompt,
      }
    } catch (error) {
      logger.error(`Master Prompt generation error for topic ${topicId}:`, error)

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Updates Master Prompt when user preferences change
   */
  async updateMasterPromptWithPreferences(
    topicId: string,
    newPreferences: TopicContext['userPreferences']
  ): Promise<{
    success: boolean
    masterPrompt?: string
    error?: string
  }> {
    try {
      logger.info(`Updating Master Prompt preferences for topic: ${topicId}`)

      // Get current topic data
      const { data: topic, error: fetchError } = await supabase
        .from('topics')
        .select('*')
        .eq('id', topicId)
        .single()

      if (fetchError || !topic) {
        return {
          success: false,
          error: `Topic not found: ${fetchError?.message || 'Unknown error'}`,
        }
      }

      if (!topic.categorization_result) {
        return {
          success: false,
          error: 'Topic must be categorized before updating Master Prompt',
        }
      }

      // Prepare updated topic context
      const topicContext: TopicContext = {
        title: topic.title,
        description: topic.description || undefined,
        userPreferences: newPreferences,
      }

      // Regenerate Master Prompt
      const updatedMasterPrompt = masterPromptGenerator.regenerateMasterPrompt(
        topic.master_prompt || '',
        newPreferences,
        topicContext,
        topic.categorization_result as CategorizationResult
      )

      // Store the updated Master Prompt
      const { error } = await supabase
        .from('topics')
        .update({
          master_prompt: updatedMasterPrompt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', topicId)

      if (error) {
        logger.error(`Failed to update Master Prompt for topic ${topicId}:`, error)
        return {
          success: false,
          error: `Database error: ${error.message}`,
        }
      }

      logger.info(`Successfully updated Master Prompt for topic ${topicId}`)

      return {
        success: true,
        masterPrompt: updatedMasterPrompt,
      }
    } catch (error) {
      logger.error(`Master Prompt update error for topic ${topicId}:`, error)

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Retrieves Master Prompt for a topic
   */
  async getTopicMasterPrompt(topicId: string): Promise<{
    success: boolean
    masterPrompt?: string
    validation?: Record<string, unknown>
    error?: string
  }> {
    try {
      const { data, error } = await supabase
        .from('topics')
        .select('master_prompt')
        .eq('id', topicId)
        .single()

      if (error) {
        return {
          success: false,
          error: `Database error: ${error.message}`,
        }
      }

      const masterPrompt = data?.master_prompt

      if (!masterPrompt) {
        return {
          success: false,
          error: 'No Master Prompt found for this topic',
        }
      }

      // Validate the prompt
      const validation = masterPromptGenerator.validateMasterPrompt(masterPrompt)

      return {
        success: true,
        masterPrompt,
        validation,
      }
    } catch (error) {
      logger.error(`Failed to retrieve Master Prompt for topic ${topicId}:`, error)

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Batch generation for multiple topics
   */
  async generateBatchMasterPrompts(
    topicIds: string[],
    defaultPreferences?: TopicContext['userPreferences']
  ): Promise<{
    successful: number
    failed: number
    results: Array<{
      topicId: string
      success: boolean
      masterPrompt?: string
      error?: string
    }>
  }> {
    logger.info(`Starting batch Master Prompt generation for ${topicIds.length} topics`)

    const results = []
    let successful = 0
    let failed = 0

    for (const topicId of topicIds) {
      const result = await this.generateAndStoreMasterPrompt(topicId, defaultPreferences)

      results.push({
        topicId,
        success: result.success,
        masterPrompt: result.masterPrompt,
        error: result.error,
      })

      if (result.success) {
        successful++
      } else {
        failed++
      }
    }

    logger.info(
      `Batch Master Prompt generation completed: ${successful} successful, ${failed} failed`
    )

    return {
      successful,
      failed,
      results,
    }
  }

  /**
   * Auto-generates Master Prompt during topic workflow
   * Called after categorization is complete
   */
  async autoGenerateMasterPrompt(
    topicId: string,
    categorizationResult: CategorizationResult,
    topicData: { title: string; description?: string; user_id: string },
    userPreferences?: TopicContext['userPreferences']
  ): Promise<{
    success: boolean
    masterPrompt?: string
    error?: string
  }> {
    try {
      logger.info(`Auto-generating Master Prompt for topic: ${topicData.title}`)

      // Prepare topic context
      const topicContext: TopicContext = {
        title: topicData.title,
        description: topicData.description,
        userPreferences: userPreferences || {},
      }

      // Generate Master Prompt
      const masterPrompt = masterPromptGenerator.generateMasterPrompt(
        topicContext,
        categorizationResult
      )

      // Store the Master Prompt
      const { error } = await supabase
        .from('topics')
        .update({
          master_prompt: masterPrompt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', topicId)

      if (error) {
        logger.error(`Failed to auto-store Master Prompt for topic ${topicId}:`, error)
        return {
          success: false,
          error: `Database error: ${error.message}`,
        }
      }

      logger.info(`Successfully auto-generated Master Prompt for topic ${topicId}`)

      return {
        success: true,
        masterPrompt,
      }
    } catch (error) {
      logger.error(`Auto Master Prompt generation error for topic ${topicId}:`, error)

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Get service status and statistics
   */
  async getServiceStatus(): Promise<{
    generatorStatus: Record<string, unknown>
    totalTopics: number
    topicsWithMasterPrompts: number
    recentActivity: unknown[]
    validationStats: { valid: number; invalid: number }
  }> {
    try {
      // Get generator status
      const generatorStatus = masterPromptGenerator.getStatus()

      // Get topic statistics
      const { count: totalTopics } = await supabase
        .from('topics')
        .select('*', { count: 'exact', head: true })

      const { count: topicsWithMasterPrompts } = await supabase
        .from('topics')
        .select('*', { count: 'exact', head: true })
        .not('master_prompt', 'is', null)

      // Get recent activity (topics with Master Prompts generated in last 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { data: recentActivity } = await supabase
        .from('topics')
        .select('id, title, updated_at')
        .not('master_prompt', 'is', null)
        .gte('updated_at', oneDayAgo)
        .order('updated_at', { ascending: false })
        .limit(10)

      // Quick validation stats (sample recent prompts)
      const { data: recentPrompts } = await supabase
        .from('topics')
        .select('master_prompt')
        .not('master_prompt', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(20)

      let validCount = 0
      let invalidCount = 0

      if (recentPrompts) {
        recentPrompts.forEach((prompt) => {
          if (prompt.master_prompt) {
            const validation = masterPromptGenerator.validateMasterPrompt(prompt.master_prompt)
            if (validation.valid) {
              validCount++
            } else {
              invalidCount++
            }
          }
        })
      }

      return {
        generatorStatus,
        totalTopics: totalTopics || 0,
        topicsWithMasterPrompts: topicsWithMasterPrompts || 0,
        recentActivity: recentActivity || [],
        validationStats: { valid: validCount, invalid: invalidCount },
      }
    } catch (error) {
      logger.error('Failed to get Master Prompt service status:', error)
      throw error
    }
  }

  /**
   * Preview Master Prompt generation without storing
   */
  async previewMasterPrompt(
    topicId: string,
    userPreferences?: TopicContext['userPreferences']
  ): Promise<{
    success: boolean
    masterPrompt?: string
    validation?: Record<string, unknown>
    error?: string
  }> {
    try {
      // Get topic data including categorization result
      const { data: topic, error: fetchError } = await supabase
        .from('topics')
        .select('title, description, categorization_result')
        .eq('id', topicId)
        .single()

      if (fetchError || !topic) {
        return {
          success: false,
          error: `Topic not found: ${fetchError?.message || 'Unknown error'}`,
        }
      }

      if (!topic.categorization_result) {
        return {
          success: false,
          error: 'Topic must be categorized before previewing Master Prompt',
        }
      }

      // Prepare topic context
      const topicContext: TopicContext = {
        title: topic.title,
        description: topic.description || undefined,
        userPreferences: userPreferences || {},
      }

      // Generate Master Prompt (preview only)
      const masterPrompt = masterPromptGenerator.generateMasterPrompt(
        topicContext,
        topic.categorization_result as CategorizationResult
      )

      // Validate the prompt
      const validation = masterPromptGenerator.validateMasterPrompt(masterPrompt)

      return {
        success: true,
        masterPrompt,
        validation,
      }
    } catch (error) {
      logger.error(`Master Prompt preview error for topic ${topicId}:`, error)

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
}

// Export singleton instance
export const masterPromptService = new MasterPromptService()
