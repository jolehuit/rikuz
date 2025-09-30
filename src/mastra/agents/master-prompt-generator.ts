import { z } from 'zod'
import { logger } from '../index'
import type { CategorizationResult } from './categorization-agent'

// Schema for the expected search results format
export const SearchResultSchema = z.object({
  items: z
    .array(
      z.object({
        title: z.string().describe('Title of the content'),
        url: z.string().url().describe('URL of the content'),
        source: z.string().describe('Source platform (github, reddit, etc.)'),
        summary: z.string().describe('Brief summary of the content'),
        published_at: z.string().optional().describe('Publication date if available'),
        relevance_score: z.number().min(0).max(1).optional().describe('Relevance score 0-1'),
        tags: z.array(z.string()).optional().describe('Additional tags or categories'),
      })
    )
    .min(1)
    .max(50)
    .describe('Array of search results, maximum 50 items'),
})

export type SearchResult = z.infer<typeof SearchResultSchema>

export interface TopicContext {
  title: string
  description?: string
  userPreferences?: {
    language?: string
    contentTypes?: string[]
    difficulty?: 'beginner' | 'intermediate' | 'advanced'
    timeFrame?: 'recent' | 'all-time'
    includeAcademic?: boolean
  }
}

export class MasterPromptGenerator {
  /**
   * Generates a Master Prompt optimized for Gemini 2.5 Flash web search
   */
  generateMasterPrompt(
    topicContext: TopicContext,
    categorizationResult: CategorizationResult
  ): string {
    const { title, description, userPreferences = {} } = topicContext
    const { sources, keywords, context } = categorizationResult

    // Build the optimized Master Prompt
    const masterPrompt = this.buildMasterPrompt({
      topic: { title, description },
      sources,
      keywords,
      context,
      preferences: userPreferences,
    })

    logger.info(`Generated Master Prompt for topic: "${title}" (${masterPrompt.length} characters)`)

    return masterPrompt
  }

  private buildMasterPrompt({
    topic,
    sources,
    keywords,
    context,
    preferences,
  }: {
    topic: { title: string; description?: string }
    sources: string[]
    keywords: string[]
    context: string
    preferences: TopicContext['userPreferences']
  }): string {
    const sections = []

    // 1. Role Definition - Use the actual user intent directly
    sections.push(`You are an expert content discovery agent.`)
    sections.push(`Your mission: ${context}`)

    // 2. Topic Context - Use the user's words exactly as they intended
    sections.push(`\nTOPIC:`)
    sections.push(`"${topic.title}"`)
    if (topic.description) {
      sections.push(`\nDETAILS:`)
      sections.push(`${topic.description}`)
    }

    // 3. Search Strategy
    sections.push('\nSEARCH STRATEGY:')

    // Primary keywords
    sections.push(`Primary Keywords: ${keywords.slice(0, 5).join(', ')}`)
    if (keywords.length > 5) {
      sections.push(`Secondary Keywords: ${keywords.slice(5).join(', ')}`)
    }

    // Source prioritization
    sections.push(`\nPrioritized Sources: ${sources.join(', ')}`)

    // Search focus based on preferences
    const searchFocus = this.buildSearchFocus(preferences)
    if (searchFocus) {
      sections.push(searchFocus)
    }

    // 4. Content Quality Criteria
    sections.push('\nCONTENT QUALITY CRITERIA:')
    sections.push('- Prioritize recent content (last 2 years preferred)')
    sections.push('- Focus on authoritative sources and expert opinions')
    sections.push('- Include practical examples and actionable insights')
    sections.push('- Avoid duplicate or heavily overlapping content')
    sections.push('- Ensure content matches the specified topic focus')

    // 5. Output Format Instructions (JSON structured)
    sections.push(this.buildOutputInstructions())

    // 6. Web Search Instructions (Gemini-specific)
    sections.push(this.buildWebSearchInstructions(sources, keywords))

    return sections.join('\n')
  }

  private buildSearchFocus(preferences: TopicContext['userPreferences']): string | null {
    const focusItems = []

    if (preferences?.difficulty) {
      focusItems.push(`Target Level: ${preferences.difficulty}`)
    }

    if (preferences?.language && preferences.language !== 'en') {
      focusItems.push(`Language: ${preferences.language} content preferred`)
    }

    if (preferences?.contentTypes?.length) {
      focusItems.push(`Content Types: ${preferences.contentTypes.join(', ')}`)
    }

    if (preferences?.timeFrame === 'recent') {
      focusItems.push('Time Focus: Prioritize content from last 6 months')
    }

    if (preferences?.includeAcademic) {
      focusItems.push('Include: Academic papers and research')
    }

    return focusItems.length > 0
      ? `\nSEARCH FOCUS:\n${focusItems.map((item) => `- ${item}`).join('\n')}`
      : null
  }

  private buildOutputInstructions(): string {
    return `
OUTPUT REQUIREMENTS:
Return results as a JSON object matching this exact structure:
{
  "items": [
    {
      "title": "Content title",
      "url": "https://...",
      "source": "source platform name",
      "summary": "2-3 sentence summary highlighting key insights",
      "published_at": "YYYY-MM-DD or 'recent' if unknown",
      "relevance_score": 0.95,
      "tags": ["tag1", "tag2"]
    }
  ]
}

IMPORTANT OUTPUT RULES:
- Return 10-25 items maximum per search
- Each summary must be 2-3 sentences explaining WHY this content is valuable
- Relevance scores should reflect actual topic alignment (0.7+ minimum)
- URLs must be valid and accessible
- Source field should match the platform (github, reddit, stackoverflow, etc.)
- Include diverse perspectives and content types within the topic
- Order results by relevance score (highest first)`
  }

  private buildWebSearchInstructions(sources: string[], keywords: string[]): string {
    return `
WEB SEARCH EXECUTION:
Use your web search capabilities to discover content that matches the topic intent.

Available Keywords (use intelligently, not literally):
${keywords
  .slice(0, 10)
  .map((kw) => `- ${kw}`)
  .join('\n')}

Suggested Sources (prioritize but not limit to):
${sources.map((src) => `- ${src}`).join('\n')}

SEARCH PROCESS:
1. Understand the user's actual intent from the topic title and description
2. Construct appropriate search queries that match this intent
3. Use the suggested sources and keywords as guidance, not rigid constraints
4. Execute web searches using your best judgment for query construction
5. Evaluate results for relevance to the ACTUAL user intent
6. Prioritize recent, authoritative, and unique content
7. Format results according to the JSON schema provided

IMPORTANT: Your goal is to fulfill the user's intent, not just match keywords blindly.`
  }

  /**
   * Updates Master Prompt when user preferences change
   */
  regenerateMasterPrompt(
    _currentPrompt: string,
    newPreferences: TopicContext['userPreferences'],
    topicContext: TopicContext,
    categorizationResult: CategorizationResult
  ): string {
    logger.info(
      `Regenerating Master Prompt with updated preferences for topic: "${topicContext.title}"`
    )

    // Generate completely new prompt with updated preferences
    const updatedContext = {
      ...topicContext,
      userPreferences: { ...topicContext.userPreferences, ...newPreferences },
    }

    return this.generateMasterPrompt(updatedContext, categorizationResult)
  }

  /**
   * Validates Master Prompt quality
   */
  validateMasterPrompt(prompt: string): {
    valid: boolean
    score: number
    issues: string[]
    suggestions: string[]
  } {
    const issues = []
    const suggestions = []
    let score = 100

    // Check length
    if (prompt.length < 500) {
      issues.push('Prompt too short (minimum 500 characters)')
      score -= 20
    } else if (prompt.length > 3200) {
      issues.push('Prompt too long (maximum 3200 characters) - may impact performance')
      score -= 10
    }

    // Check for required sections
    const requiredSections = [
      'TOPIC FOCUS',
      'SEARCH STRATEGY',
      'CONTENT QUALITY CRITERIA',
      'OUTPUT REQUIREMENTS',
      'WEB SEARCH EXECUTION',
    ]

    requiredSections.forEach((section) => {
      if (!prompt.includes(section)) {
        issues.push(`Missing required section: ${section}`)
        score -= 15
      }
    })

    // Check for JSON schema
    if (!prompt.includes('"items"') || !prompt.includes('"title"')) {
      issues.push('Missing JSON output schema definition')
      score -= 10
    }

    // Quality suggestions
    if (!prompt.includes('recent')) {
      suggestions.push('Consider adding recency requirements for better results')
    }

    if (!prompt.includes('relevance_score')) {
      suggestions.push('Including relevance scoring improves result quality')
    }

    return {
      valid: issues.length === 0,
      score: Math.max(0, score),
      issues,
      suggestions,
    }
  }

  /**
   * Get generator status and metrics
   */
  getStatus() {
    return {
      name: 'Master Prompt Generator',
      ready: true,
      version: '1.0.0',
      supportedSources: [
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
      ],
    }
  }
}

// Export singleton instance
export const masterPromptGenerator = new MasterPromptGenerator()
