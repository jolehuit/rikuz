import { describe, it, expect } from 'vitest'
import {
  categorizationAgent,
  CategorizationResultSchema,
} from '../mastra/agents/categorization-agent'

describe('Categorization Agent', () => {
  describe('Agent Functionality', () => {
    it('should be properly initialized', () => {
      const status = categorizationAgent.getStatus()
      expect(status).toHaveProperty('name')
      expect(status).toHaveProperty('ready', true)
      expect(status).toHaveProperty('queueStatus')
    })

    it('should validate categorization results correctly', () => {
      const validResult = {
        sources: ['github', 'stackoverflow', 'blogs'],
        keywords: ['react', 'performance', 'optimization', 'hooks', 'components'],
        context:
          'This topic focuses on React performance optimization techniques and best practices.',
      }

      const validation = categorizationAgent.validateCategorization(validResult)
      expect(validation.valid).toBe(true)
      expect(validation.issues).toHaveLength(0)
    })

    it('should detect validation issues', () => {
      const invalidResult = {
        sources: ['github'], // Too few sources
        keywords: ['react', 'performance'], // Too few keywords
        context: 'Too short', // Too short context
      }

      const validation = categorizationAgent.validateCategorization(invalidResult)
      expect(validation.valid).toBe(false)
      expect(validation.issues.length).toBeGreaterThan(0)
      expect(validation.issues.some((issue) => issue.includes('Too few sources'))).toBe(true)
    })

    it('should validate schema structure', () => {
      const validData = {
        sources: ['github', 'reddit', 'stackoverflow'],
        keywords: ['react', 'performance', 'optimization'],
        context: 'Test context for React performance optimization',
      }

      const result = CategorizationResultSchema.safeParse(validData)
      expect(result.success).toBe(true)

      if (result.success) {
        expect(result.data.sources).toContain('github')
        expect(result.data.keywords).toContain('react')
        expect(result.data.context).toBe(validData.context)
      }
    })

    it('should reject invalid schema data', () => {
      const invalidData = {
        sources: ['invalid-source'], // Not in enum
        keywords: [], // Empty array
        context: '', // Empty string
      }

      const result = CategorizationResultSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('Topic Data Structure', () => {
    it('should handle topic data structure', () => {
      const topicData = {
        id: 'test-topic-123',
        title: 'React Performance',
        description: 'Best practices for React performance optimization',
        user_id: 'user-456',
      }

      expect(topicData).toHaveProperty('id')
      expect(topicData).toHaveProperty('title')
      expect(topicData).toHaveProperty('user_id')
    })
  })

  describe('Sample Topic Tests', () => {
    const sampleTopics = [
      {
        topic: 'React performance optimization',
        expectedSources: ['github', 'stackoverflow', 'blogs', 'medium'],
        expectedKeywords: ['react', 'performance', 'optimization'],
      },
      {
        topic: 'Machine Learning with Python',
        expectedSources: ['github', 'reddit', 'academic', 'medium'],
        expectedKeywords: ['machine learning', 'python', 'tensorflow'],
      },
      {
        topic: 'Web3 and Blockchain Development',
        expectedSources: ['github', 'hackernews', 'medium', 'twitter'],
        expectedKeywords: ['web3', 'blockchain', 'smart contracts'],
      },
    ]

    sampleTopics.forEach(({ topic, expectedSources, expectedKeywords }) => {
      it(`should handle topic analysis for: ${topic}`, async () => {
        // Note: This test will only validate structure in test environment
        // Actual API calls are avoided to prevent costs and timeouts

        if (process.env.NODE_ENV === 'test') {
          // Mock response for testing
          const mockResult = {
            sources: expectedSources.slice(0, 3) as string[],
            keywords: expectedKeywords.concat(['development', 'tutorial']),
            context: `Analysis for ${topic} - testing mock response`,
          }

          const validation = categorizationAgent.validateCategorization(mockResult)
          expect(validation.valid).toBe(true)

          const schemaValidation = CategorizationResultSchema.safeParse(mockResult)
          expect(schemaValidation.success).toBe(true)
        }
      }, 1000)
    })
  })

  describe('Rate Limiting Integration', () => {
    it('should be integrated with queue system', () => {
      const status = categorizationAgent.getStatus()
      expect(status.queueStatus).toHaveProperty('queueLength')
      expect(status.queueStatus).toHaveProperty('processing')
      expect(status.queueStatus).toHaveProperty('requestsInWindow')
      expect(status.queueStatus).toHaveProperty('canMakeRequest')
    })
  })
})
