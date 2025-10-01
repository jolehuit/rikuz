import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { refineMasterPromptForTopic } from '@/services/masterPromptRefinement'

/**
 * POST /api/feedback/refine
 *
 * Trigger Master Prompt refinement based on feedback
 * This endpoint should be called after the user provides feedback
 *
 * Body: { topicId: string }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { topicId } = body

    if (!topicId) {
      return NextResponse.json({ error: 'topicId is required' }, { status: 400 })
    }

    // Refine the Master Prompt
    const result = await refineMasterPromptForTopic(user.id, topicId)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to refine Master Prompt' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Your agent has learned from your feedback!',
      changes_summary: result.changes_summary,
    })
  } catch (error) {
    console.error('Error refining Master Prompt:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
