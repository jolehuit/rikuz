import { describe, it, expect, beforeEach } from 'vitest'
import { createAgentId } from '../mastra/index'
import { AgentRegistry } from '../mastra/agents/example-agent'
import { geminiQueue } from '../mastra/lib/queue'

describe('Mastra AI Configuration', () => {
  let agentRegistry: AgentRegistry

  beforeEach(() => {
    agentRegistry = new AgentRegistry()
  })

  describe('Agent Compartmentalization', () => {
    it('should create unique agent IDs for different user+topic combinations', () => {
      const userId1 = 'user-123'
      const userId2 = 'user-456'
      const topicId1 = 'topic-abc'
      const topicId2 = 'topic-def'

      const agentId1 = createAgentId(userId1, topicId1)
      const agentId2 = createAgentId(userId1, topicId2)
      const agentId3 = createAgentId(userId2, topicId1)

      expect(agentId1).toBe('agent-user-123-topic-abc')
      expect(agentId2).toBe('agent-user-123-topic-def')
      expect(agentId3).toBe('agent-user-456-topic-abc')

      // All IDs should be unique
      expect(agentId1).not.toBe(agentId2)
      expect(agentId1).not.toBe(agentId3)
      expect(agentId2).not.toBe(agentId3)
    })

    it('should create compartmentalized agents with proper isolation', () => {
      const config1 = {
        userId: 'user-123',
        topicId: 'react-performance',
        masterPrompt: 'You are an expert in React performance optimization.',
        name: 'React Performance Agent',
      }

      const config2 = {
        userId: 'user-456',
        topicId: 'react-performance',
        masterPrompt: 'You are an expert in React performance optimization.',
        name: 'React Performance Agent',
      }

      const agent1 = agentRegistry.createAgent(config1)
      const agent2 = agentRegistry.createAgent(config2)

      // Agents should have different IDs even with same topic
      expect(agent1.agentId).toBe('agent-user-123-react-performance')
      expect(agent2.agentId).toBe('agent-user-456-react-performance')
      expect(agent1.agentId).not.toBe(agent2.agentId)

      // Metadata should be properly compartmentalized
      const metadata1 = agent1.getMetadata()
      const metadata2 = agent2.getMetadata()

      expect(metadata1.userId).toBe('user-123')
      expect(metadata1.topicId).toBe('react-performance')
      expect(metadata2.userId).toBe('user-456')
      expect(metadata2.topicId).toBe('react-performance')
    })

    it('should enforce access control for compartmentalized agents', async () => {
      const config = {
        userId: 'user-123',
        topicId: 'topic-abc',
        masterPrompt: 'Test prompt',
      }

      const agent = agentRegistry.createAgent(config)

      // Test invalid access first (these should be rejected immediately without API calls)
      await expect(agent.generate('test prompt', 'user-456', 'topic-abc')).rejects.toThrow(
        'Access denied'
      )

      await expect(agent.generate('test prompt', 'user-123', 'topic-def')).rejects.toThrow(
        'Access denied'
      )

      // For valid access, we'll just check that it doesn't throw an access denied error
      // The API call itself will fail with invalid credentials, which is expected
      try {
        await Promise.race([
          agent.generate('test prompt', 'user-123', 'topic-abc'),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Test timeout')), 1000)),
        ])
      } catch (error) {
        // Should not be an access control error
        expect((error as Error).message).not.toContain('Access denied')
        // Could be API error or test timeout, both are acceptable
      }
    }, 2000)

    it('should properly manage agent registry', () => {
      const config1 = {
        userId: 'user-123',
        topicId: 'topic-1',
        masterPrompt: 'Test prompt 1',
      }

      const config2 = {
        userId: 'user-123',
        topicId: 'topic-2',
        masterPrompt: 'Test prompt 2',
      }

      const config3 = {
        userId: 'user-456',
        topicId: 'topic-1',
        masterPrompt: 'Test prompt 3',
      }

      // Create agents
      const agent1 = agentRegistry.createAgent(config1)
      const agent2 = agentRegistry.createAgent(config2)
      const agent3 = agentRegistry.createAgent(config3)

      // Check registry status
      const status = agentRegistry.getRegistryStatus()
      expect(status.totalAgents).toBe(3)
      expect(status.agentIds).toContain(agent1.agentId)
      expect(status.agentIds).toContain(agent2.agentId)
      expect(status.agentIds).toContain(agent3.agentId)

      // Get agents for specific user
      const user123Agents = agentRegistry.getAllAgentsForUser('user-123')
      expect(user123Agents).toHaveLength(2)
      expect(user123Agents.map((a) => a.agentId)).toContain(agent1.agentId)
      expect(user123Agents.map((a) => a.agentId)).toContain(agent2.agentId)

      const user456Agents = agentRegistry.getAllAgentsForUser('user-456')
      expect(user456Agents).toHaveLength(1)
      expect(user456Agents[0].agentId).toBe(agent3.agentId)

      // Delete agent
      expect(agentRegistry.deleteAgent('user-123', 'topic-1')).toBe(true)
      expect(agentRegistry.getRegistryStatus().totalAgents).toBe(2)
      expect(agentRegistry.getAllAgentsForUser('user-123')).toHaveLength(1)
    })
  })

  describe('Rate Limiting Queue', () => {
    it('should provide queue status information', () => {
      const status = geminiQueue.getQueueStatus()

      expect(status).toHaveProperty('queueLength')
      expect(status).toHaveProperty('processing')
      expect(status).toHaveProperty('requestsInWindow')
      expect(status).toHaveProperty('canMakeRequest')

      expect(typeof status.queueLength).toBe('number')
      expect(typeof status.processing).toBe('boolean')
      expect(typeof status.requestsInWindow).toBe('number')
      expect(typeof status.canMakeRequest).toBe('boolean')
    })

    it('should handle queue operations without errors', async () => {
      // Simple mock operation
      const mockOperation = async () => {
        return 'success'
      }

      // This should not throw
      const promise = geminiQueue.add('test-agent', mockOperation)
      expect(promise).toBeInstanceOf(Promise)

      // The operation should complete successfully
      const result = await promise
      expect(result).toBe('success')
    })
  })
})
