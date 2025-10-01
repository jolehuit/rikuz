import { createClient } from '@/utils/supabase/server'

export interface MasterPromptHistoryEntry {
  id: string
  topic_id: string
  user_id: string
  old_master_prompt: string
  new_master_prompt: string
  changes_summary: string | null
  confidence_score: number | null
  feedback_count: number
  like_ratio: number | null
  created_at: string
}

/**
 * Get Master Prompt history for a topic
 *
 * @param user_id - User ID
 * @param topic_id - Topic ID
 * @param limit - Maximum number of entries to return (default: 10)
 * @returns Array of history entries, sorted by most recent first
 */
export async function getMasterPromptHistory(
  user_id: string,
  topic_id: string,
  limit: number = 10
): Promise<MasterPromptHistoryEntry[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('master_prompt_history')
    .select('*')
    .eq('user_id', user_id)
    .eq('topic_id', topic_id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(`Failed to fetch Master Prompt history: ${error.message}`)
  }

  return (data as MasterPromptHistoryEntry[]) || []
}

/**
 * Rollback to a previous Master Prompt version
 *
 * @param user_id - User ID
 * @param topic_id - Topic ID
 * @param history_id - ID of the history entry to rollback to
 * @returns Object with success status
 */
export async function rollbackMasterPrompt(
  user_id: string,
  topic_id: string,
  history_id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  try {
    // 1. Get the history entry
    const { data: historyEntry, error: historyError } = await supabase
      .from('master_prompt_history')
      .select('*')
      .eq('id', history_id)
      .eq('user_id', user_id)
      .eq('topic_id', topic_id)
      .single()

    if (historyError || !historyEntry) {
      return {
        success: false,
        error: 'History entry not found',
      }
    }

    // 2. Get current Master Prompt
    const { data: topic, error: topicError } = await supabase
      .from('topics')
      .select('master_prompt')
      .eq('id', topic_id)
      .eq('user_id', user_id)
      .single()

    if (topicError || !topic) {
      return {
        success: false,
        error: 'Topic not found',
      }
    }

    // 3. Update topic with the old (rolled back) Master Prompt
    const { error: updateError } = await supabase
      .from('topics')
      .update({
        master_prompt: historyEntry.old_master_prompt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', topic_id)
      .eq('user_id', user_id)

    if (updateError) {
      return {
        success: false,
        error: 'Failed to update Master Prompt',
      }
    }

    // 4. Create a new history entry for the rollback
    await supabase.from('master_prompt_history').insert({
      topic_id,
      user_id,
      old_master_prompt: topic.master_prompt,
      new_master_prompt: historyEntry.old_master_prompt,
      changes_summary: `Rolled back to version from ${new Date(historyEntry.created_at).toLocaleString()}`,
      confidence_score: 1.0, // Rollback is always confident
      feedback_count: 0,
      like_ratio: null,
    })

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
