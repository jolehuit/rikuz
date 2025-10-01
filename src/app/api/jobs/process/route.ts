import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { executeSearchWithRetry } from '@/services/search-service'
import { AgentService } from '@/services/agent-service'
import { NextResponse } from 'next/server'

/**
 * POST /api/jobs/process
 * Process pending search jobs (called by cron or manual trigger)
 */
export async function POST(request: Request) {
  try {
    // Get authorization header for cron authentication
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'dev-secret'

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use service role key for cron job (bypasses RLS)
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get pending jobs (oldest first, limit 5 at a time)
    // Note: We filter by retry_count < max_retries in the query
    const { data: allPendingJobs, error: jobsError } = await supabase
      .from('search_jobs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10) // Fetch more to filter

    if (jobsError) {
      console.error('Error fetching jobs:', jobsError)
      return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
    }

    // Filter jobs that haven't exceeded max retries
    const jobs = (allPendingJobs || [])
      .filter((job) => job.retry_count < job.max_retries)
      .slice(0, 5) // Take first 5

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ message: 'No pending jobs', processed: 0 })
    }

    const results = []

    // Process each job
    for (const job of jobs) {
      try {
        console.log(`[JOB PROCESSOR] Processing job ${job.id} for topic ${job.topic_id}`)

        // Mark job as processing
        await supabase
          .from('search_jobs')
          .update({
            status: 'processing',
            started_at: new Date().toISOString(),
          })
          .eq('id', job.id)

        // Update topic status
        await supabase
          .from('topics')
          .update({
            search_status: 'searching',
            last_search_at: new Date().toISOString(),
          })
          .eq('id', job.topic_id)

        // Get topic details
        const { data: topic } = await supabase
          .from('topics')
          .select('id, title, description, master_prompt')
          .eq('id', job.topic_id)
          .single()

        if (!topic) {
          throw new Error('Topic not found')
        }

        // Get or create agent
        const masterPrompt =
          topic.master_prompt || `Find articles about ${topic.title}. ${topic.description || ''}`

        const { agentData } = await AgentService.getOrCreateAgent(
          job.user_id,
          job.topic_id,
          topic.title,
          masterPrompt
        )

        // Execute search
        const searchResults = await executeSearchWithRetry(agentData.agent_id, 3)

        // Mark job as completed
        await supabase
          .from('search_jobs')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', job.id)

        // Update topic status
        await supabase
          .from('topics')
          .update({
            search_status: 'completed',
          })
          .eq('id', job.topic_id)

        results.push({
          jobId: job.id,
          topicId: job.topic_id,
          status: 'success',
          articlesFound: searchResults?.totalResults || 0,
        })

        console.log(
          `[JOB PROCESSOR] Job ${job.id} completed successfully. Found ${searchResults?.totalResults || 0} articles`
        )
      } catch (error) {
        console.error(`[JOB PROCESSOR] Error processing job ${job.id}:`, error)

        const errorMessage = error instanceof Error ? error.message : 'Unknown error'

        // Increment retry count
        const newRetryCount = job.retry_count + 1
        const isFailed = newRetryCount >= job.max_retries

        await supabase
          .from('search_jobs')
          .update({
            status: isFailed ? 'failed' : 'pending',
            retry_count: newRetryCount,
            error_message: errorMessage,
          })
          .eq('id', job.id)

        // Update topic status
        await supabase
          .from('topics')
          .update({
            search_status: isFailed ? 'failed' : 'pending',
          })
          .eq('id', job.topic_id)

        results.push({
          jobId: job.id,
          topicId: job.topic_id,
          status: 'error',
          error: errorMessage,
          retryCount: newRetryCount,
        })
      }
    }

    return NextResponse.json({
      message: 'Jobs processed',
      processed: results.length,
      results,
    })
  } catch (error) {
    console.error('[JOB PROCESSOR] Fatal error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to process jobs',
      },
      { status: 500 }
    )
  }
}

/**
 * Runtime configuration for Vercel Serverless Functions
 * maxDuration: Maximum execution time in seconds (5 minutes - Hobby plan limit)
 */
export const maxDuration = 300 // 5 minutes (Vercel Hobby plan limit)
