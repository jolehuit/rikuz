import { createClient } from '@/utils/supabase/server'
import { aggregateFeedback } from './feedbackAggregation'
import { refineMasterPrompt } from '@/mastra/agents/refinement-agent'
import { logger } from '@/mastra/index'

/**
 * Refine the Master Prompt for a topic based on user feedback
 *
 * This function:
 * 1. Aggregates all feedback for the topic
 * 2. Uses the refinement agent to generate an updated Master Prompt
 * 3. Saves the updated prompt to the database
 * 4. Creates an audit trail in master_prompt_history
 *
 * @param user_id - User ID
 * @param topic_id - Topic ID
 * @returns Object with success status and updated prompt details
 */
export async function refineMasterPromptForTopic(
  user_id: string,
  topic_id: string
): Promise<{
  success: boolean
  updated_master_prompt?: string
  changes_summary?: string
  error?: string
}> {
  const supabase = await createClient()

  try {
    // 1. Get current Master Prompt from topics table
    const { data: topic, error: topicError } = await supabase
      .from('topics')
      .select('master_prompt')
      .eq('id', topic_id)
      .eq('user_id', user_id)
      .single()

    if (topicError || !topic || !topic.master_prompt) {
      return {
        success: false,
        error: 'Topic not found or Master Prompt not initialized',
      }
    }

    // 2. Aggregate feedback
    const feedback = await aggregateFeedback(user_id, topic_id)

    if (!feedback || feedback.total_feedback === 0) {
      return {
        success: false,
        error: 'No feedback available for refinement',
      }
    }

    // 3. Refine Master Prompt using the AI agent
    logger.info({ topic_id, feedback_count: feedback.total_feedback }, 'Refining Master Prompt')

    const refinementResult = await refineMasterPrompt(topic.master_prompt, feedback)

    // 4. Update the Master Prompt in the topics table
    const { error: updateError } = await supabase
      .from('topics')
      .update({
        master_prompt: refinementResult.updated_master_prompt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', topic_id)
      .eq('user_id', user_id)

    if (updateError) {
      logger.error({ error: updateError }, 'Failed to update Master Prompt')
      return {
        success: false,
        error: 'Failed to update Master Prompt in database',
      }
    }

    // 5. Create audit trail in master_prompt_history (if table exists)
    // Note: We'll create this table in Story 4.3
    try {
      await supabase.from('master_prompt_history').insert({
        topic_id,
        user_id,
        old_master_prompt: topic.master_prompt,
        new_master_prompt: refinementResult.updated_master_prompt,
        changes_summary: refinementResult.changes_summary,
        confidence_score: refinementResult.confidence_score,
        feedback_count: feedback.total_feedback,
        like_ratio: feedback.like_ratio,
      })
    } catch (historyError) {
      // Table might not exist yet, log but don't fail
      logger.warn({ historyError }, 'Failed to create history entry (table may not exist yet)')
    }

    logger.info(
      {
        topic_id,
        changes_summary: refinementResult.changes_summary,
        confidence_score: refinementResult.confidence_score,
      },
      'Master Prompt refined successfully'
    )

    return {
      success: true,
      updated_master_prompt: refinementResult.updated_master_prompt,
      changes_summary: refinementResult.changes_summary,
    }
  } catch (error) {
    logger.error({ error }, 'Error refining Master Prompt')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
