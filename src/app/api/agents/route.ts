import { createClient } from '@/lib/supabase/server'
import { AgentService } from '@/services/agent-service'
import { NextResponse } from 'next/server'

/**
 * GET /api/agents
 * Get all agents for the authenticated user
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user agents
    const agents = await AgentService.getUserAgents(user.id)

    return NextResponse.json({ agents })
  } catch (error) {
    console.error('Error fetching agents:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch agents',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/agents
 * Create a new agent for a user+topic combination
 *
 * Body: { topicId: string, topicName: string, masterPrompt: string }
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
    const { topicId, topicName, masterPrompt } = body

    // Validate input
    if (!topicId || !topicName || !masterPrompt) {
      return NextResponse.json(
        { error: 'Missing required fields: topicId, topicName, masterPrompt' },
        { status: 400 }
      )
    }

    // Verify topic exists and belongs to user
    const { data: topic, error: topicError } = await supabase
      .from('topics')
      .select('id, user_id')
      .eq('id', topicId)
      .eq('user_id', user.id)
      .single()

    if (topicError || !topic) {
      return NextResponse.json({ error: 'Topic not found or access denied' }, { status: 404 })
    }

    // Create agent
    const { agentData } = await AgentService.createAgent({
      userId: user.id,
      topicId,
      topicName,
      masterPrompt,
    })

    return NextResponse.json({ agent: agentData }, { status: 201 })
  } catch (error) {
    console.error('Error creating agent:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create agent',
      },
      { status: 500 }
    )
  }
}
