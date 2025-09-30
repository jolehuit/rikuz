import { Agent } from '@mastra/core'
import { gemini, createAgentId, logGeminiCall, logger } from '../index'
import { geminiQueue } from '../lib/queue'

export interface AgentConfig {
  userId: string
  topicId: string
  masterPrompt: string
  name?: string
}

export class CompartmentalizedAgent {
  private agent: Agent
  public readonly agentId: string
  private readonly userId: string
  private readonly topicId: string

  constructor(config: AgentConfig) {
    this.userId = config.userId
    this.topicId = config.topicId
    this.agentId = createAgentId(config.userId, config.topicId)

    // Create the Mastra agent with compartmentalized configuration
    this.agent = new Agent({
      name: config.name || `Agent for ${config.topicId}`,
      instructions: config.masterPrompt,
      model: gemini,
    })

    logger.info(
      `Created compartmentalized agent: ${this.agentId} for user: ${config.userId}, topic: ${config.topicId}`
    )
  }

  // Ensure this agent can only access its own user+topic data
  private validateAccess(requestUserId: string, requestTopicId: string): boolean {
    return this.userId === requestUserId && this.topicId === requestTopicId
  }

  async generate(prompt: string, requestUserId: string, requestTopicId: string): Promise<string> {
    // Compartmentalization security check
    if (!this.validateAccess(requestUserId, requestTopicId)) {
      throw new Error(
        `Access denied: Agent ${this.agentId} cannot access data for user ${requestUserId}, topic ${requestTopicId}`
      )
    }

    // Execute through rate-limited queue
    return await geminiQueue.add(this.agentId, async () => {
      const startTime = Date.now()

      try {
        // Use generateVNext for v2 models like Gemini 2.5 Flash
        const result = await this.agent.generateVNext(prompt)
        const duration = Date.now() - startTime

        // Log the API call for cost tracking
        // Note: In a real implementation, you'd extract token counts from the response
        logGeminiCall(this.agentId, 0, 0, duration)

        return result.text
      } catch (error) {
        const duration = Date.now() - startTime
        logger.error(
          {
            agentId: this.agentId,
            error: error instanceof Error ? error.message : 'Unknown error',
            duration,
          },
          'Gemini API call failed'
        )
        throw error
      }
    })
  }

  // Get agent metadata (safe to expose)
  getMetadata() {
    return {
      agentId: this.agentId,
      userId: this.userId,
      topicId: this.topicId,
      name: this.agent.name,
    }
  }
}

// Agent registry to manage compartmentalized agents
export class AgentRegistry {
  private agents: Map<string, CompartmentalizedAgent> = new Map()

  createAgent(config: AgentConfig): CompartmentalizedAgent {
    const agentId = createAgentId(config.userId, config.topicId)

    if (this.agents.has(agentId)) {
      logger.warn(`Agent ${agentId} already exists, returning existing agent`)
      return this.agents.get(agentId)!
    }

    const agent = new CompartmentalizedAgent(config)
    this.agents.set(agentId, agent)

    logger.info(`Registered new agent: ${agentId}`)
    return agent
  }

  getAgent(userId: string, topicId: string): CompartmentalizedAgent | null {
    const agentId = createAgentId(userId, topicId)
    return this.agents.get(agentId) || null
  }

  deleteAgent(userId: string, topicId: string): boolean {
    const agentId = createAgentId(userId, topicId)
    const deleted = this.agents.delete(agentId)

    if (deleted) {
      logger.info(`Deleted agent: ${agentId}`)
    }

    return deleted
  }

  getAllAgentsForUser(userId: string): CompartmentalizedAgent[] {
    return Array.from(this.agents.values()).filter((agent) => agent.getMetadata().userId === userId)
  }

  getRegistryStatus() {
    return {
      totalAgents: this.agents.size,
      agentIds: Array.from(this.agents.keys()),
    }
  }
}

// Export singleton registry
export const agentRegistry = new AgentRegistry()
