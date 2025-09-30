import { describe, it, expect } from 'vitest'
import {
  masterPromptGenerator,
  type TopicContext,
  SearchResultSchema,
} from '../mastra/agents/master-prompt-generator'
import type { CategorizationResult } from '../mastra/agents/categorization-agent'

describe('Master Prompt Generator', () => {
  // Sample categorization result for testing
  const sampleCategorizationResult: CategorizationResult = {
    sources: ['github', 'stackoverflow', 'blogs', 'medium'],
    keywords: ['react', 'performance', 'optimization', 'hooks', 'components', 'memory'],
    context: 'This topic focuses on React performance optimization techniques and best practices.',
  }

  const sampleTopicContext: TopicContext = {
    title: 'React Performance Optimization',
    description: 'Learn advanced techniques for optimizing React application performance',
    userPreferences: {
      language: 'en',
      difficulty: 'intermediate',
      timeFrame: 'recent',
      contentTypes: ['tutorials', 'examples'],
    },
  }

  describe('Generator Functionality', () => {
    it('should be properly initialized', () => {
      const status = masterPromptGenerator.getStatus()
      expect(status).toHaveProperty('name', 'Master Prompt Generator')
      expect(status).toHaveProperty('ready', true)
      expect(status).toHaveProperty('version')
      expect(status).toHaveProperty('supportedSources')
      expect(status.supportedSources).toContain('github')
      expect(status.supportedSources).toContain('stackoverflow')
    })

    it('should generate Master Prompt with all required sections', () => {
      const masterPrompt = masterPromptGenerator.generateMasterPrompt(
        sampleTopicContext,
        sampleCategorizationResult
      )

      // Check for required sections
      expect(masterPrompt).toContain('TOPIC FOCUS')
      expect(masterPrompt).toContain('SEARCH STRATEGY')
      expect(masterPrompt).toContain('CONTENT QUALITY CRITERIA')
      expect(masterPrompt).toContain('OUTPUT REQUIREMENTS')
      expect(masterPrompt).toContain('WEB SEARCH EXECUTION')

      // Check topic integration
      expect(masterPrompt).toContain('React Performance Optimization')
      expect(masterPrompt).toContain('performance optimization techniques')

      // Check categorization integration
      expect(masterPrompt).toContain('github, stackoverflow, blogs, medium')
      expect(masterPrompt).toContain('react, performance, optimization')
    })

    it('should include JSON schema in output requirements', () => {
      const masterPrompt = masterPromptGenerator.generateMasterPrompt(
        sampleTopicContext,
        sampleCategorizationResult
      )

      expect(masterPrompt).toContain('"items"')
      expect(masterPrompt).toContain('"title"')
      expect(masterPrompt).toContain('"url"')
      expect(masterPrompt).toContain('"source"')
      expect(masterPrompt).toContain('"summary"')
      expect(masterPrompt).toContain('"relevance_score"')
    })

    it('should integrate user preferences correctly', () => {
      const masterPrompt = masterPromptGenerator.generateMasterPrompt(
        sampleTopicContext,
        sampleCategorizationResult
      )

      expect(masterPrompt).toContain('Target Level: intermediate')
      expect(masterPrompt).toContain('Content Types: tutorials, examples')
      expect(masterPrompt).toContain('Time Focus: Prioritize content from last 6 months')
    })

    it('should handle topics without description', () => {
      const minimalTopicContext: TopicContext = {
        title: 'Vue.js Components',
      }

      const masterPrompt = masterPromptGenerator.generateMasterPrompt(
        minimalTopicContext,
        sampleCategorizationResult
      )

      expect(masterPrompt).toContain('Vue.js Components')
      expect(masterPrompt).not.toContain('undefined')
      expect(masterPrompt.length).toBeGreaterThan(500)
    })

    it('should generate search queries correctly', () => {
      const masterPrompt = masterPromptGenerator.generateMasterPrompt(
        sampleTopicContext,
        sampleCategorizationResult
      )

      // Check for primary search queries
      expect(masterPrompt).toContain('"react performance"')
      expect(masterPrompt).toContain('"react optimization"')
      expect(masterPrompt).toContain('site:github.com')
      expect(masterPrompt).toContain('site:stackoverflow.com')
    })
  })

  describe('Prompt Validation', () => {
    it('should validate high-quality prompts', () => {
      const masterPrompt = masterPromptGenerator.generateMasterPrompt(
        sampleTopicContext,
        sampleCategorizationResult
      )

      const validation = masterPromptGenerator.validateMasterPrompt(masterPrompt)

      expect(validation.valid).toBe(true)
      expect(validation.score).toBeGreaterThan(80)
      expect(validation.issues).toHaveLength(0)
    })

    it('should detect missing sections', () => {
      const invalidPrompt = 'This is a short prompt without required sections.'

      const validation = masterPromptGenerator.validateMasterPrompt(invalidPrompt)

      expect(validation.valid).toBe(false)
      expect(validation.score).toBeLessThan(50)
      expect(validation.issues.length).toBeGreaterThan(0)
      expect(validation.issues.some((issue) => issue.includes('Missing required section'))).toBe(
        true
      )
    })

    it('should detect length issues', () => {
      const shortPrompt = 'Too short'
      const validation = masterPromptGenerator.validateMasterPrompt(shortPrompt)

      expect(validation.valid).toBe(false)
      expect(validation.issues.some((issue) => issue.includes('too short'))).toBe(true)
    })

    it('should provide quality suggestions', () => {
      const basicPrompt = `
TOPIC FOCUS:
Basic topic

SEARCH STRATEGY:
Basic strategy

CONTENT QUALITY CRITERIA:
Basic criteria

OUTPUT REQUIREMENTS:
Basic output

WEB SEARCH EXECUTION:
Basic search
      `

      const validation = masterPromptGenerator.validateMasterPrompt(basicPrompt)

      expect(validation.suggestions.length).toBeGreaterThan(0)
    })
  })

  describe('Prompt Regeneration', () => {
    const originalPrompt = masterPromptGenerator.generateMasterPrompt(
      sampleTopicContext,
      sampleCategorizationResult
    )

    it('should regenerate prompt with new preferences', () => {
      const newPreferences = {
        language: 'fr',
        difficulty: 'advanced' as const,
        timeFrame: 'all-time' as const,
        includeAcademic: true,
      }

      const regeneratedPrompt = masterPromptGenerator.regenerateMasterPrompt(
        originalPrompt,
        newPreferences,
        sampleTopicContext,
        sampleCategorizationResult
      )

      expect(regeneratedPrompt).not.toBe(originalPrompt)
      expect(regeneratedPrompt).toContain('Target Level: advanced')
      expect(regeneratedPrompt).toContain('Language: fr content preferred')
      expect(regeneratedPrompt).toContain('Include: Academic papers and research')
      expect(regeneratedPrompt).not.toContain('last 6 months')
    })

    it('should maintain core structure during regeneration', () => {
      const newPreferences = { difficulty: 'beginner' as const }

      const regeneratedPrompt = masterPromptGenerator.regenerateMasterPrompt(
        originalPrompt,
        newPreferences,
        sampleTopicContext,
        sampleCategorizationResult
      )

      // Core sections should still be present
      expect(regeneratedPrompt).toContain('TOPIC FOCUS')
      expect(regeneratedPrompt).toContain('SEARCH STRATEGY')
      expect(regeneratedPrompt).toContain('OUTPUT REQUIREMENTS')
    })
  })

  describe('Different Topic Types', () => {
    const testCases = [
      {
        name: 'Technical Topic',
        topicContext: {
          title: 'Machine Learning with Python',
          description: 'Deep learning frameworks and techniques',
        },
        categorization: {
          sources: ['github', 'academic', 'medium', 'youtube'],
          keywords: ['machine learning', 'python', 'tensorflow', 'pytorch', 'neural networks'],
          context: 'Focus on practical ML implementation and frameworks',
        },
      },
      {
        name: 'Business Topic',
        topicContext: {
          title: 'Startup Growth Strategies',
          description: 'Scaling early-stage companies',
        },
        categorization: {
          sources: ['hackernews', 'linkedin', 'blogs', 'podcasts'],
          keywords: ['startup', 'growth', 'scaling', 'fundraising', 'product-market-fit'],
          context: 'Entrepreneurship and business development strategies',
        },
      },
      {
        name: 'Creative Topic',
        topicContext: {
          title: 'UI/UX Design Trends',
          description: 'Modern design principles and trends',
        },
        categorization: {
          sources: ['medium', 'blogs', 'youtube', 'linkedin'],
          keywords: ['design', 'ui', 'ux', 'trends', 'user-experience', 'interface'],
          context: 'Current design trends and user experience best practices',
        },
      },
    ]

    testCases.forEach(({ name, topicContext, categorization }) => {
      it(`should handle ${name.toLowerCase()} effectively`, () => {
        const masterPrompt = masterPromptGenerator.generateMasterPrompt(
          topicContext as TopicContext,
          categorization as CategorizationResult
        )

        // Basic validation
        expect(masterPrompt.length).toBeGreaterThan(500)
        expect(masterPrompt).toContain(topicContext.title)
        expect(masterPrompt).toContain(categorization.context)

        // Sources integration
        categorization.sources.forEach((source) => {
          expect(masterPrompt).toContain(source)
        })

        // Keywords integration
        categorization.keywords.slice(0, 3).forEach((keyword) => {
          expect(masterPrompt).toContain(keyword)
        })

        // Validation check
        const validation = masterPromptGenerator.validateMasterPrompt(masterPrompt)
        expect(validation.valid).toBe(true)
      })
    })
  })

  describe('Search Result Schema Validation', () => {
    it('should validate correct search result format', () => {
      const validSearchResult = {
        items: [
          {
            title: 'React Performance Guide',
            url: 'https://example.com/react-guide',
            source: 'github',
            summary:
              'Comprehensive guide to React performance optimization techniques and best practices.',
            published_at: '2024-01-15',
            relevance_score: 0.95,
            tags: ['react', 'performance', 'optimization'],
          },
        ],
      }

      const result = SearchResultSchema.safeParse(validSearchResult)
      expect(result.success).toBe(true)

      if (result.success) {
        expect(result.data.items).toHaveLength(1)
        expect(result.data.items[0].title).toBe('React Performance Guide')
        expect(result.data.items[0].relevance_score).toBe(0.95)
      }
    })

    it('should reject invalid search result format', () => {
      const invalidSearchResult = {
        items: [
          {
            title: 'Missing URL',
            source: 'github',
            summary: 'Invalid entry without URL',
            // Missing required url field
          },
        ],
      }

      const result = SearchResultSchema.safeParse(invalidSearchResult)
      expect(result.success).toBe(false)
    })

    it('should handle optional fields correctly', () => {
      const minimalSearchResult = {
        items: [
          {
            title: 'Minimal Entry',
            url: 'https://example.com',
            source: 'blog',
            summary: 'Basic entry with only required fields',
          },
        ],
      }

      const result = SearchResultSchema.safeParse(minimalSearchResult)
      expect(result.success).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty categorization gracefully', () => {
      const emptyCategorization: CategorizationResult = {
        sources: [],
        keywords: [],
        context: 'Minimal context',
      }

      expect(() => {
        masterPromptGenerator.generateMasterPrompt(sampleTopicContext, emptyCategorization)
      }).not.toThrow()
    })

    it('should handle very long topics', () => {
      const longTopicContext: TopicContext = {
        title: 'A'.repeat(200),
        description: 'B'.repeat(500),
      }

      const masterPrompt = masterPromptGenerator.generateMasterPrompt(
        longTopicContext,
        sampleCategorizationResult
      )

      expect(masterPrompt.length).toBeGreaterThan(0)
      expect(masterPrompt.length).toBeLessThan(5000) // Should not be excessively long
    })

    it('should handle special characters in topic', () => {
      const specialTopicContext: TopicContext = {
        title: 'C++ & Node.js: Performance Comparison',
        description: 'Comparing C++ performance with Node.js in real-world scenarios',
      }

      const masterPrompt = masterPromptGenerator.generateMasterPrompt(
        specialTopicContext,
        sampleCategorizationResult
      )

      expect(masterPrompt).toContain('C++')
      expect(masterPrompt).toContain('Node.js')
      expect(masterPrompt).not.toContain('undefined')
    })
  })
})
