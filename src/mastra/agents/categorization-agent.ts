import { Agent } from '@mastra/core'
import { z } from 'zod'
import { gemini, logGeminiCall, logger } from '../index'
import { geminiQueue } from '../lib/queue'

// Schema for categorization result
export const CategorizationResultSchema = z.object({
  sources: z
    .array(
      z.enum([
        'github',
        'reddit',
        'hackernews',
        'blogs',
        'news',
        'presse',
        'forums',
        'stackoverflow',
        'medium',
        'dev.to',
        'twitter',
        'linkedin',
        'youtube',
        'documentation',
        'academic',
        'podcasts',
        'newsletters',
      ])
    )
    .describe('List of relevant sources for this topic'),
  keywords: z.array(z.string()).describe('Key search terms and phrases for this topic'),
  context: z
    .string()
    .describe('Brief context about why these sources and keywords are relevant for this topic'),
})

export type CategorizationResult = z.infer<typeof CategorizationResultSchema>

// Optimized prompt for source identification (minimizing tokens)
const CATEGORIZATION_PROMPT = `Analyze a topic to identify the best sources for finding current, relevant information.

TASK: For the given topic, determine:
1. Most valuable information sources
2. Key search terms/keywords
3. Brief reasoning

AVAILABLE SOURCES:
- github: Code repositories, issues, discussions
- reddit: Community discussions, subreddits
- hackernews: Tech news, startup discussions
- blogs: Technical blogs, personal experiences
- news: News articles, press releases
- presse: Press releases, official announcements
- forums: Discussion forums, Q&A sites
- stackoverflow: Programming questions, solutions
- medium: Articles, tutorials, opinions
- dev.to: Developer community content
- twitter: Real-time updates, trends
- linkedin: Professional insights, industry news
- youtube: Video tutorials, presentations
- documentation: Official docs, API references
- academic: Research papers, studies
- podcasts: Audio content, interviews
- newsletters: Curated content, industry updates

GUIDELINES:
- Select 3-7 most relevant sources
- Include 5-10 focused keywords
- Keep context under 100 words
- Prioritize sources with recent, actionable content`

export class CategorizationAgent {
  private agent: Agent

  constructor() {
    this.agent = new Agent({
      name: 'Topic Categorization Agent',
      instructions: CATEGORIZATION_PROMPT,
      model: gemini,
    })

    logger.info('Categorization Agent initialized')
  }

  async categorize(topic: string): Promise<CategorizationResult> {
    logger.info(`Starting categorization for topic: "${topic}"`)

    return await geminiQueue.add(`categorization-${Date.now()}`, async () => {
      const startTime = Date.now()

      try {
        const result = await this.agent.generateVNext(
          `Topic: "${topic}"\n\nAnalyze this topic and provide the structured response.`,
          {
            // Use structured output with Zod schema
            output: CategorizationResultSchema,
          }
        )

        const duration = Date.now() - startTime

        // Log the API call for cost tracking
        // Note: In production, extract actual token counts from result
        logGeminiCall(`categorization-agent`, 0, 0, duration)

        logger.info(`Categorization completed for topic: "${topic}" in ${duration}ms`)

        // Return the structured object
        return result.object!
      } catch (error) {
        const duration = Date.now() - startTime
        logger.error(
          {
            topic,
            error: error instanceof Error ? error.message : 'Unknown error',
            duration,
          },
          'Categorization failed'
        )

        throw new Error(
          `Categorization failed for topic "${topic}": ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    })
  }

  // Batch categorization for multiple topics
  async categorizeBatch(topics: string[]): Promise<Map<string, CategorizationResult>> {
    const results = new Map<string, CategorizationResult>()

    logger.info(`Starting batch categorization for ${topics.length} topics`)

    // Process topics sequentially to respect rate limits
    for (const topic of topics) {
      try {
        const result = await this.categorize(topic)
        results.set(topic, result)
      } catch (error) {
        logger.error(`Failed to categorize topic "${topic}": ${error}`)
        // Continue with other topics even if one fails
      }
    }

    logger.info(`Batch categorization completed: ${results.size}/${topics.length} successful`)
    return results
  }

  // Validate categorization result quality
  validateCategorization(result: CategorizationResult): {
    valid: boolean
    issues: string[]
  } {
    const issues: string[] = []

    // Check sources
    if (result.sources.length < 2) {
      issues.push('Too few sources identified (minimum 2)')
    }
    if (result.sources.length > 10) {
      issues.push('Too many sources identified (maximum 10)')
    }

    // Check keywords
    if (result.keywords.length < 3) {
      issues.push('Too few keywords identified (minimum 3)')
    }
    if (result.keywords.length > 15) {
      issues.push('Too many keywords identified (maximum 15)')
    }

    // Check context length
    if (result.context.length < 20) {
      issues.push('Context too brief (minimum 20 characters)')
    }
    if (result.context.length > 200) {
      issues.push('Context too long (maximum 200 characters)')
    }

    // Check for empty keywords
    if (result.keywords.some((k) => k.trim().length === 0)) {
      issues.push('Empty keywords found')
    }

    return {
      valid: issues.length === 0,
      issues,
    }
  }

  // Get agent status
  getStatus() {
    return {
      name: this.agent.name,
      ready: true,
      queueStatus: geminiQueue.getQueueStatus(),
    }
  }
}

// Export singleton instance
export const categorizationAgent = new CategorizationAgent()
