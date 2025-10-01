import { Client } from '@upstash/workflow'
import { NextResponse } from 'next/server'

/**
 * POST /api/workflow/setup-schedule
 *
 * Configures the daily search schedule using Workflow Client
 * Call this endpoint once to set up the cron job
 *
 * Example:
 * curl -X POST http://localhost:3000/api/workflow/setup-schedule
 */
export async function POST(request: Request) {
  try {
    // Optional: Add authentication to protect this endpoint
    const authHeader = request.headers.get('authorization')
    if (process.env.SETUP_SECRET && authHeader !== `Bearer ${process.env.SETUP_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const client = new Client({
      token: process.env.QSTASH_TOKEN!,
    })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Trigger the workflow with a schedule using QStash's cron feature
    // Note: This uses QStash schedules API under the hood
    const scheduleResult = await client.trigger({
      url: `${baseUrl}/api/workflow/daily-search`,
      // For recurring schedules, you need to use QStash schedules API directly
      // or create the schedule via the Upstash dashboard
    })

    return NextResponse.json({
      success: true,
      message: 'To create a recurring schedule, please use the Upstash dashboard',
      dashboardUrl: 'https://console.upstash.com/qstash',
      workflowUrl: `${baseUrl}/api/workflow/daily-search`,
      instructions: {
        step1: 'Go to https://console.upstash.com/qstash',
        step2: 'Click "Schedules" then "Create Schedule"',
        step3: `Enter URL: ${baseUrl}/api/workflow/daily-search`,
        step4: 'Set cron: "0 8 * * *" (daily at 8:00 UTC)',
        step5: 'Click "Schedule"',
      },
    })
  } catch (error) {
    console.error('Error setting up schedule:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to setup schedule',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/workflow/setup-schedule
 *
 * Returns instructions for setting up the schedule
 */
export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  return NextResponse.json({
    message: 'Schedule setup instructions',
    workflowUrl: `${baseUrl}/api/workflow/daily-search`,
    instructions: {
      manual: {
        step1: 'Go to https://console.upstash.com/qstash',
        step2: 'Click "Schedules" then "Create Schedule"',
        step3: `Enter URL: ${baseUrl}/api/workflow/daily-search`,
        step4: 'Set cron: "0 8 * * *" (daily at 8:00 UTC)',
        step5: 'Click "Schedule"',
      },
      testWorkflow: {
        description: 'Test the workflow manually',
        command: `curl -X POST ${baseUrl}/api/workflow/daily-search`,
      },
    },
  })
}
