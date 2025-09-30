import { createClient } from '@/utils/supabase/server'
import { AgentService } from '@/services/agent-service'
import { NextResponse } from 'next/server'

/**
 * GET /api/agents/[agentId]
 * Get a specific agent by ID
 */
export async function GET(request: Request, { params }: { params: Promise<{ agentId: string }> }) {
  try {
    const supabase = await createClient()
    const { agentId } = await params

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get agent
    const agent = await AgentService.getAgentById(agentId)

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Verify ownership
    if (agent.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({ agent })
  } catch (error) {
    console.error('Error fetching agent:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch agent' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/agents/[agentId]
 * Update an agent's Master Prompt or status
 *
 * Body: { masterPrompt?: string, status?: 'active' | 'inactive' | 'archived' }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const supabase = await createClient()
    const { agentId } = await params

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify agent exists and belongs to user
    const agent = await AgentService.getAgentById(agentId)

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    if (agent.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const { masterPrompt, status } = body

    let updatedAgent

    // Update Master Prompt if provided
    if (masterPrompt) {
      updatedAgent = await AgentService.updateAgent(agentId, masterPrompt)
    }

    // Update status if provided
    if (status && ['active', 'inactive', 'archived'].includes(status)) {
      updatedAgent = await AgentService.updateAgentStatus(agentId, status)
    }

    if (!updatedAgent) {
      return NextResponse.json({ error: 'No valid fields provided for update' }, { status: 400 })
    }

    return NextResponse.json({ agent: updatedAgent })
  } catch (error) {
    console.error('Error updating agent:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update agent' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/agents/[agentId]
 * Delete an agent
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const supabase = await createClient()
    const { agentId } = await params

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify agent exists and belongs to user
    const agent = await AgentService.getAgentById(agentId)

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    if (agent.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Delete agent
    await AgentService.deleteAgent(agentId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting agent:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete agent' },
      { status: 500 }
    )
  }
}
