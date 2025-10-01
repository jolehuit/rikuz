import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

/**
 * POST /api/topics
 * Create a new topic and queue a search job
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
    const { title, description, keywords } = body

    if (!title) {
      return NextResponse.json({ error: 'Missing required field: title' }, { status: 400 })
    }

    // Create topic
    const { data: topic, error: topicError } = await supabase
      .from('topics')
      .insert({
        title: title.trim(),
        description: description?.trim() || null,
        keywords: keywords || [],
        user_id: user.id,
        search_status: 'pending',
      })
      .select()
      .single()

    if (topicError) {
      console.error('Error creating topic:', topicError)
      return NextResponse.json({ error: 'Failed to create topic' }, { status: 500 })
    }

    // Create search job
    const { data: job, error: jobError } = await supabase
      .from('search_jobs')
      .insert({
        topic_id: topic.id,
        user_id: user.id,
        status: 'pending',
      })
      .select()
      .single()

    if (jobError) {
      console.error('Error creating search job:', jobError)
      // Topic is created but job failed - not critical
      // The job can be retried manually later
    }

    return NextResponse.json({
      success: true,
      topic,
      job: job || null,
      message: 'Topic created. Search will start shortly in the background.',
    })
  } catch (error) {
    console.error('Error in topic creation:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create topic',
      },
      { status: 500 }
    )
  }
}
