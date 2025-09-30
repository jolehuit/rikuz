import { createClient } from '@/utils/supabase/server'
import { executeSearchWithRetry } from '@/services/search-service'
import { AgentService } from '@/services/agent-service'
import { NextResponse } from 'next/server'

/**
 * POST /api/search/execute
 * Execute a search for a specific topic
 *
 * Body: { topicId: string }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { topicId } = body

    if (!topicId) {
      return NextResponse.json({ error: 'Missing required field: topicId' }, { status: 400 })
    }

    // Verify topic exists and belongs to user
    const { data: topic, error: topicError } = await supabase
      .from('topics')
      .select('id, user_id, title, description, master_prompt')
      .eq('id', topicId)
      .eq('user_id', user.id)
      .single()

    if (topicError || !topic) {
      return NextResponse.json({ error: 'Topic not found or access denied' }, { status: 404 })
    }

    // Get or create agent for this topic
    const masterPrompt =
      topic.master_prompt || `Find articles about ${topic.title}. ${topic.description || ''}`

    const { agentData } = await AgentService.getOrCreateAgent(
      user.id,
      topicId,
      topic.title,
      masterPrompt
    )

    if (agentData.status !== 'active') {
      return NextResponse.json(
        { error: `Agent is not active (status: ${agentData.status})` },
        { status: 400 }
      )
    }

    // Execute search with retry logic
    const searchResults = await executeSearchWithRetry(agentData.agent_id, 3)

    return NextResponse.json({
      success: true,
      topic: topic.title,
      agentId: agentData.agent_id,
      results: searchResults,
    })
  } catch (error) {
    console.error('Error executing search:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to execute search',
      },
      { status: 500 }
    )
  }
}
