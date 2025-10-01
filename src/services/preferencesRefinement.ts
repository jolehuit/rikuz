import { createClient } from '@/utils/supabase/server'
import { refineMasterPrompt } from '@/mastra/agents/refinement-agent'
import { logger } from '@/mastra/index'

interface TopicPreferences {
  sources: string[]
  content_style: 'technical' | 'beginner-friendly' | 'news' | 'in-depth-analysis'
  additional_instructions: string
}

/**
 * Refine Master Prompt based on explicit user preferences
 *
 * @param user_id - User ID
 * @param topic_id - Topic ID
 * @param preferences - User preferences
 * @returns Object with success status and refinement details
 */
export async function refineMasterPromptWithPreferences(
  user_id: string,
  topic_id: string,
  preferences: TopicPreferences
): Promise<{
  success: boolean
  updated_master_prompt?: string
  changes_summary?: string
  error?: string
}> {
  const supabase = await createClient()

  try {
    // 1. Get current Master Prompt
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

    // 2. Create synthetic feedback based on preferences
    const syntheticFeedback = {
      total_feedback: preferences.sources.length, // Treat each selected source as a "like"
      likes: preferences.sources.length,
      dislikes: 0,
      like_ratio: 1.0,
      preferred_sources: preferences.sources.map((source, idx) => ({
        source,
        count: preferences.sources.length - idx, // Higher weight for first sources
      })),
      user_comments: [
        {
          comment: `Content style preference: ${preferences.content_style}`,
          feed_item_title: 'User Preferences',
          created_at: new Date().toISOString(),
        },
        ...(preferences.additional_instructions
          ? [
              {
                comment: preferences.additional_instructions,
                feed_item_title: 'Additional Instructions',
                created_at: new Date().toISOString(),
              },
            ]
          : []),
      ],
    }

    // 3. Refine Master Prompt
    logger.info({ topic_id, preferences }, 'Refining Master Prompt with preferences')

    const refinementResult = await refineMasterPrompt(topic.master_prompt, syntheticFeedback)

    // 4. Update Master Prompt in database
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

    // 5. Create audit trail
    try {
      await supabase.from('master_prompt_history').insert({
        topic_id,
        user_id,
        old_master_prompt: topic.master_prompt,
        new_master_prompt: refinementResult.updated_master_prompt,
        changes_summary: `Updated based on user preferences: ${refinementResult.changes_summary}`,
        confidence_score: refinementResult.confidence_score,
        feedback_count: 0, // Preferences don't count as feedback
        like_ratio: null,
      })
    } catch (historyError) {
      logger.warn({ historyError }, 'Failed to create history entry')
    }

    logger.info(
      {
        topic_id,
        changes_summary: refinementResult.changes_summary,
      },
      'Master Prompt refined with preferences'
    )

    return {
      success: true,
      updated_master_prompt: refinementResult.updated_master_prompt,
      changes_summary: refinementResult.changes_summary,
    }
  } catch (error) {
    logger.error({ error }, 'Error refining Master Prompt with preferences')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
