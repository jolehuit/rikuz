import { createClient } from '@supabase/supabase-js'
import { google } from '@ai-sdk/google'
import { generateText } from 'ai'

export class BriefGenerationService {
  private supabase: ReturnType<typeof createClient>

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }

  /**
   * Generate daily brief for a specific topic
   */
  async generateDailyBrief(
    topicId: string,
    date: string = new Date().toISOString().split('T')[0]
  ): Promise<{
    summary: string
    item_count: number
    items: Array<{
      id: string
      title: string
      url: string
      source: string
      summary: string
      published_at: string
    }>
  }> {
    // Fetch feed items for today for this topic
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    const { data: items, error } = await this.supabase
      .from('feed_items')
      .select('*')
      .eq('topic_id', topicId)
      .gte('created_at', startOfDay.toISOString())
      .lte('created_at', endOfDay.toISOString())
      .order('published_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch feed items: ${error.message}`)
    }

    if (!items || items.length === 0) {
      return {
        summary: 'No new items found today.',
        item_count: 0,
        items: [],
      }
    }

    // Generate AI summary of the day's findings
    const summary = await this.generateAISummary(items)

    // Save to daily_summaries table
    await this.supabase.from('daily_summaries').upsert(
      {
        topic_id: topicId,
        date,
        summary,
        item_count: items.length,
        created_at: new Date().toISOString(),
      },
      {
        onConflict: 'topic_id,date',
      }
    )

    return {
      summary,
      item_count: items.length,
      items,
    }
  }

  /**
   * Generate AI-powered summary of feed items
   */
  private async generateAISummary(
    items: Array<{
      title: string
      summary: string
    }>
  ): Promise<string> {
    const itemsText = items
      .slice(0, 10) // Limit to top 10 items for context
      .map((item, idx) => `${idx + 1}. ${item.title}\n   ${item.summary}`)
      .join('\n\n')

    try {
      const { text } = await generateText({
        model: google('gemini-2.0-flash-exp'),
        prompt: `You are analyzing a collection of articles found today.

Generate a concise 2-3 sentence summary highlighting:
1. The main themes or trends
2. The most interesting or important finding
3. Key takeaways

Articles:
${itemsText}

Provide a brief, engaging summary in French:`,
      })

      return text.trim()
    } catch (error) {
      console.error('Failed to generate AI summary:', error)
      // Fallback to simple summary
      return `${items.length} nouveaux articles trouvés aujourd'hui couvrant différents sujets d'actualité.`
    }
  }

  /**
   * Get topics that need briefs generated
   */
  async getTopicsNeedingBriefs(date: string): Promise<string[]> {
    // Get all active topics
    const { data: topics } = await this.supabase.from('topics').select('id').eq('status', 'active')

    if (!topics) return []

    // Filter topics that don't have a brief for today
    const { data: existingBriefs } = await this.supabase
      .from('daily_summaries')
      .select('topic_id')
      .eq('date', date)

    const existingTopicIds = new Set(existingBriefs?.map((b) => b.topic_id) || [])

    return topics.filter((t) => !existingTopicIds.has(t.id)).map((t) => t.id)
  }
}
