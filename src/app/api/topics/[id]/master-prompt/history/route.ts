import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getMasterPromptHistory, rollbackMasterPrompt } from '@/services/masterPromptHistory'

/**
 * GET /api/topics/[id]/master-prompt/history
 *
 * Get Master Prompt history for a topic
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: topicId } = await params

  try {
    const history = await getMasterPromptHistory(user.id, topicId)
    return NextResponse.json({ history })
  } catch (error) {
    console.error('Error fetching Master Prompt history:', error)
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
  }
}

/**
 * POST /api/topics/[id]/master-prompt/history
 *
 * Rollback to a previous Master Prompt version
 * Body: { historyId: string }
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: topicId } = await params

  try {
    const body = await request.json()
    const { historyId } = body

    if (!historyId) {
      return NextResponse.json({ error: 'historyId is required' }, { status: 400 })
    }

    const result = await rollbackMasterPrompt(user.id, topicId, historyId)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Master Prompt rolled back successfully',
    })
  } catch (error) {
    console.error('Error rolling back Master Prompt:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
