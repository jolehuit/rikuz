import { createClient } from '@supabase/supabase-js'
import { createSpecificAgent, generateAgentId } from '@/mastra/agents/specific-agent'
import type { Agent } from '@mastra/core/agent'

// Create Supabase client for backend operations
const getSupabaseClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!serviceRoleKey && !anonKey) {
    throw new Error(
      'Missing Supabase keys: SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY'
    )
  }

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey || anonKey!)
}

export interface AgentData {
  id: string
  agent_id: string
  user_id: string
  topic_id: string
  name: string
  instructions: string
  master_prompt: string | null
  status: 'active' | 'inactive' | 'archived'
  created_at: string
  updated_at: string
}

export interface CreateAgentInput {
  userId: string
  topicId: string
  topicName: string
  masterPrompt: string
}

/**
 * Agent Service
 * Handles all operations related to user+topic specific agents
 */
export class AgentService {
  /**
   * Create a new agent for a user+topic combination
   * This function creates both the database record and the Mastra Agent instance
   *
   * @param input - Agent creation data
   * @returns Created agent data and Agent instance
   */
  static async createAgent(input: CreateAgentInput): Promise<{
    agentData: AgentData
    agentInstance: Agent
  }> {
    const supabase = getSupabaseClient()
    const { userId, topicId, topicName, masterPrompt } = input

    // Generate agent ID using the format: agent-{user_id}-{topic_id}
    const agentId = generateAgentId(userId, topicId)
    const agentName = `Agent for ${topicName}`

    // Insert agent into database
    const { data, error } = await supabase
      .from('agents')
      .insert({
        agent_id: agentId,
        user_id: userId,
        topic_id: topicId,
        name: agentName,
        instructions: masterPrompt,
        master_prompt: masterPrompt,
        status: 'active',
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create agent: ${error.message}`)
    }

    // Create Mastra Agent instance
    const agentInstance = createSpecificAgent(userId, topicId, masterPrompt)

    return {
      agentData: data as AgentData,
      agentInstance,
    }
  }

  /**
   * Get an agent by user and topic IDs
   *
   * @param userId - User ID
   * @param topicId - Topic ID
   * @returns Agent data or null
   */
  static async getAgent(userId: string, topicId: string): Promise<AgentData | null> {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('user_id', userId)
      .eq('topic_id', topicId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null
      }
      throw new Error(`Failed to get agent: ${error.message}`)
    }

    return data as AgentData
  }

  /**
   * Get an agent by agent ID
   *
   * @param agentId - Agent ID (format: agent-{user_id}-{topic_id})
   * @returns Agent data or null
   */
  static async getAgentById(agentId: string): Promise<AgentData | null> {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('agent_id', agentId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Failed to get agent: ${error.message}`)
    }

    return data as AgentData
  }

  /**
   * Get all agents for a user
   *
   * @param userId - User ID
   * @returns Array of agent data
   */
  static async getUserAgents(userId: string): Promise<AgentData[]> {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to get user agents: ${error.message}`)
    }

    return (data as AgentData[]) || []
  }

  /**
   * Update agent Master Prompt and instructions
   * This is called when topic preferences change
   *
   * @param agentId - Agent ID
   * @param masterPrompt - New Master Prompt
   * @returns Updated agent data
   */
  static async updateAgent(agentId: string, masterPrompt: string): Promise<AgentData> {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('agents')
      .update({
        master_prompt: masterPrompt,
        instructions: masterPrompt,
      })
      .eq('agent_id', agentId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update agent: ${error.message}`)
    }

    return data as AgentData
  }

  /**
   * Update agent status
   *
   * @param agentId - Agent ID
   * @param status - New status
   * @returns Updated agent data
   */
  static async updateAgentStatus(
    agentId: string,
    status: 'active' | 'inactive' | 'archived'
  ): Promise<AgentData> {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('agents')
      .update({ status })
      .eq('agent_id', agentId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update agent status: ${error.message}`)
    }

    return data as AgentData
  }

  /**
   * Delete an agent
   * Note: Cascade delete is handled by database (ON DELETE CASCADE)
   *
   * @param agentId - Agent ID
   */
  static async deleteAgent(agentId: string): Promise<void> {
    const supabase = getSupabaseClient()

    const { error } = await supabase.from('agents').delete().eq('agent_id', agentId)

    if (error) {
      throw new Error(`Failed to delete agent: ${error.message}`)
    }
  }

  /**
   * Get or create an agent for a user+topic combination
   * This ensures an agent exists for a topic
   *
   * @param userId - User ID
   * @param topicId - Topic ID
   * @param topicName - Topic name
   * @param masterPrompt - Master Prompt for the topic
   * @returns Agent data and instance
   */
  static async getOrCreateAgent(
    userId: string,
    topicId: string,
    topicName: string,
    masterPrompt: string
  ): Promise<{
    agentData: AgentData
    agentInstance: Agent
  }> {
    // Try to get existing agent
    const existingAgent = await this.getAgent(userId, topicId)

    if (existingAgent) {
      // Create agent instance from existing data
      const agentInstance = createSpecificAgent(
        userId,
        topicId,
        existingAgent.master_prompt || existingAgent.instructions
      )

      return {
        agentData: existingAgent,
        agentInstance,
      }
    }

    // Create new agent
    return this.createAgent({
      userId,
      topicId,
      topicName,
      masterPrompt,
    })
  }
}
