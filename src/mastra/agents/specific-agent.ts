import { Agent } from '@mastra/core/agent'
import { gemini } from '../index'

/**
 * Creates a specific agent instance for a user+topic combination
 * This agent is compartmentalized and uses the Master Prompt generated for this specific topic
 *
 * @param userId - User ID
 * @param topicId - Topic ID
 * @param masterPrompt - Master Prompt generated for this topic
 * @returns Agent instance configured for this user+topic
 */
export function createSpecificAgent(userId: string, topicId: string, masterPrompt: string): Agent {
  const agentId = `agent-${userId}-${topicId}`

  return new Agent({
    name: agentId,
    instructions: masterPrompt,
    model: gemini,
  })
}

/**
 * Generate agent ID from user and topic IDs
 * Format: agent-{user_id}-{topic_id}
 *
 * @param userId - User ID
 * @param topicId - Topic ID
 * @returns Formatted agent ID
 */
export function generateAgentId(userId: string, topicId: string): string {
  return `agent-${userId}-${topicId}`
}
