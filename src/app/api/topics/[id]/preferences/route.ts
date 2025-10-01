import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { refineMasterPromptWithPreferences } from '@/services/preferencesRefinement'

/**
 * GET /api/topics/[id]/preferences
 *
 * Get topic preferences
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: topicId } = await params

  try {
    const { data, error } = await supabase
      .from('topics')
      .select('preferences')
      .eq('id', topicId)
      .eq('user_id', user.id)
      .single()

    if (error) throw error

    return NextResponse.json({ preferences: data.preferences || {} })
  } catch (error) {
    console.error('Error fetching preferences:', error)
    return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 })
  }
}

/**
 * PUT /api/topics/[id]/preferences
 *
 * Update topic preferences and refine Master Prompt
 * Body: { preferences: TopicPreferences }
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()

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
    const { preferences } = body

    if (!preferences) {
      return NextResponse.json({ error: 'preferences is required' }, { status: 400 })
    }

    // 1. Save preferences to topics table
    const { error: updateError } = await supabase
      .from('topics')
      .update({
        preferences,
        updated_at: new Date().toISOString(),
      })
      .eq('id', topicId)
      .eq('user_id', user.id)

    if (updateError) {
      throw updateError
    }

    // 2. Trigger Master Prompt refinement with new preferences
    const refinementResult = await refineMasterPromptWithPreferences(user.id, topicId, preferences)

    if (!refinementResult.success) {
      console.warn('Failed to refine Master Prompt:', refinementResult.error)
      // Don't fail the whole request, preferences are still saved
    }

    return NextResponse.json({
      success: true,
      message: 'Preferences saved and agent updated!',
      changes_summary: refinementResult.changes_summary,
    })
  } catch (error) {
    console.error('Error saving preferences:', error)
    return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 })
  }
}
