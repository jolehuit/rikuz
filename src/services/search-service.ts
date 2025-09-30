import { google } from '@ai-sdk/google'
import { generateText } from 'ai'
import { createClient } from '@supabase/supabase-js'
import { AgentService } from './agent-service'
import { logger } from '@/mastra/lib/logger'

// Create Supabase client for backend operations (cron, scripts)
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

export interface SearchResult {
  title: string
  url: string
  source: string
  summary?: string
  published_at?: string
  relevance_score?: number
}

export interface SearchResponse {
  items: SearchResult[]
  searchQueries?: string[]
  totalResults: number
}

/**
 * Execute a search for a specific agent using Gemini 2.5 Flash with Google Search grounding
 *
 * @param agentId - Agent ID (format: agent-{user_id}-{topic_id})
 * @returns Search results
 */
export async function executeSearch(agentId: string): Promise<SearchResponse> {
  try {
    logger.info(`Starting search execution for agent: ${agentId}`)

    // Get agent data from database
    const agentData = await AgentService.getAgentById(agentId)

    if (!agentData) {
      throw new Error(`Agent not found: ${agentId}`)
    }

    if (agentData.status !== 'active') {
      throw new Error(`Agent is not active: ${agentId} (status: ${agentData.status})`)
    }

    // Get topic data to access categorization results
    const supabase = getSupabaseClient()
    const { data: topic, error: topicError } = await supabase
      .from('topics')
      .select('title, categorization_result, master_prompt')
      .eq('id', agentData.topic_id)
      .single()

    if (topicError) {
      logger.error(`Error fetching topic: ${topicError.message}`, {
        topicId: agentData.topic_id,
        code: topicError.code,
        details: topicError.details,
      })
      throw new Error(`Failed to fetch topic: ${topicError.message}`)
    }

    if (!topic) {
      throw new Error(`Topic not found for agent: ${agentId}`)
    }

    // Build search prompt based on Master Prompt and categorization
    const searchPrompt = buildSearchPrompt(
      topic.title,
      topic.master_prompt || agentData.master_prompt,
      topic.categorization_result
    )

    logger.info(`Executing search with prompt for ${agentId}`)

    // Execute search using Gemini with Google Search grounding
    const { text, sources, providerMetadata } = await generateText({
      model: google('gemini-2.5-flash', {
        apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      }),
      tools: {
        google_search: google.tools.googleSearch({}),
      },
      prompt: searchPrompt,
      maxSteps: 5,
    })

    const searchResults = { text, sources, providerMetadata }

    // Extract search queries from metadata
    const searchQueries =
      searchResults.providerMetadata?.google?.groundingMetadata?.webSearchQueries

    // Parse results from text response
    const parsedResults = parseSearchResults(
      searchResults.text,
      searchResults.sources || [],
      topic.categorization_result
    )

    logger.info(`Search completed for ${agentId}: ${parsedResults.length} results found`)

    // Save results to feed_items table
    await saveFeedItems(agentData, parsedResults)

    return {
      items: parsedResults,
      searchQueries,
      totalResults: parsedResults.length,
    }
  } catch (error) {
    logger.error(`Search execution failed for ${agentId}:`, error)
    throw error
  }
}

/**
 * Build search prompt based on Master Prompt and categorization
 */
function buildSearchPrompt(
  topicName: string,
  masterPrompt: string | null,
  categorizationResult: { sources?: string[]; keywords?: string[] } | null
): string {
  const sources = categorizationResult?.sources || []
  const keywords = categorizationResult?.keywords || []

  return `${masterPrompt || `Search for recent content about: ${topicName}`}

Focus on these sources: ${sources.join(', ')}
Keywords to prioritize: ${keywords.join(', ')}

For each relevant result found, provide:
1. Title
2. URL
3. Source (e.g., GitHub, Reddit, HackerNews, blog, news)
4. Brief summary (1-2 sentences)
5. Published date (if available)

Format your response as a JSON array with this structure:
{
  "items": [
    {
      "title": "...",
      "url": "...",
      "source": "...",
      "summary": "...",
      "published_at": "..."
    }
  ]
}

Return ONLY the JSON, no additional text.`
}

/**
 * Parse search results from Gemini response
 */
interface SourceMetadata {
  title?: string
  uri?: string
  url?: string
}

function parseSearchResults(
  text: string,
  sources: SourceMetadata[],
  categorizationResult: { sources?: string[]; keywords?: string[] } | null
): SearchResult[] {
  try {
    // Try to parse as JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      if (parsed.items && Array.isArray(parsed.items)) {
        return parsed.items.map(
          (item: {
            title?: string
            url?: string
            source?: string
            summary?: string
            published_at?: string
          }) => ({
            title: item.title || 'Untitled',
            url: item.url || '',
            source: item.source || 'Unknown',
            summary: item.summary,
            published_at: item.published_at,
            relevance_score: calculateRelevanceScore(item, categorizationResult),
          })
        )
      }
    }

    // Fallback: use sources from grounding metadata
    return sources.map(
      (source: SourceMetadata & { snippet?: string; content?: string }, index: number) => ({
        title: source.title || `Result ${index + 1}`,
        url: source.uri || source.url || '',
        source: extractSourceType(source.uri || source.url || ''),
        summary: source.snippet || source.content,
        relevance_score: 0.5,
      })
    )
  } catch (error) {
    logger.error('Failed to parse search results:', error)
    return []
  }
}

/**
 * Extract source type from URL
 */
function extractSourceType(url: string): string {
  if (url.includes('github.com')) return 'GitHub'
  if (url.includes('reddit.com')) return 'Reddit'
  if (url.includes('news.ycombinator.com')) return 'HackerNews'
  if (url.includes('stackoverflow.com')) return 'StackOverflow'
  if (url.includes('medium.com')) return 'Medium'
  if (url.includes('dev.to')) return 'Dev.to'
  if (url.includes('youtube.com')) return 'YouTube'
  if (url.includes('twitter.com') || url.includes('x.com')) return 'Twitter'

  // Check if it's a news site
  const newsDomains = ['nytimes.com', 'bbc.com', 'cnn.com', 'reuters.com']
  if (newsDomains.some((domain) => url.includes(domain))) return 'News'

  return 'Web'
}

/**
 * Calculate relevance score based on keywords match
 */
function calculateRelevanceScore(
  item: { title?: string; summary?: string },
  categorizationResult: { keywords?: string[] } | null
): number {
  const keywords = categorizationResult?.keywords || []
  if (keywords.length === 0) return 0.5

  const text = `${item.title} ${item.summary}`.toLowerCase()
  const matches = keywords.filter((keyword: string) => text.includes(keyword.toLowerCase())).length

  return Math.min(matches / keywords.length, 1.0)
}

/**
 * Save feed items to database
 */
async function saveFeedItems(
  agentData: { topic_id: string; user_id: string; agent_id: string },
  results: SearchResult[]
): Promise<void> {
  const supabase = getSupabaseClient()

  // Prepare feed items for insertion
  const feedItems = results.map((result) => ({
    topic_id: agentData.topic_id,
    user_id: agentData.user_id,
    agent_id: agentData.agent_id,
    title: result.title,
    url: result.url,
    source: result.source,
    summary: result.summary,
    published_at: result.published_at,
    relevance_score: result.relevance_score,
  }))

  // Insert feed items (ignore duplicates based on topic_id + url)
  const { error } = await supabase.from('feed_items').upsert(feedItems, {
    onConflict: 'topic_id,url',
    ignoreDuplicates: true,
  })

  if (error) {
    logger.error('Failed to save feed items:', error)
    throw new Error(`Failed to save feed items: ${error.message}`)
  }

  logger.info(`Saved ${feedItems.length} feed items for agent ${agentData.agent_id}`)
}

/**
 * Execute search with retry logic (exponential backoff)
 */
export async function executeSearchWithRetry(
  agentId: string,
  maxRetries: number = 3
): Promise<SearchResponse> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await executeSearch(agentId)
    } catch (error) {
      lastError = error as Error
      logger.error(`Search attempt ${attempt}/${maxRetries} failed for ${agentId}:`, error)

      if (attempt < maxRetries) {
        // Exponential backoff: 2^attempt seconds
        const delayMs = Math.pow(2, attempt) * 1000
        logger.info(`Retrying in ${delayMs / 1000}s...`)
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    }
  }

  throw new Error(`Search failed after ${maxRetries} attempts: ${lastError?.message}`)
}
