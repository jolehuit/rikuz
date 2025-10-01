import { NextResponse } from 'next/server'

/**
 * GET /api/jobs/trigger
 * Manual trigger for job processing (for development/testing)
 */
export async function GET() {
  try {
    // Call the process endpoint
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const cronSecret = process.env.CRON_SECRET || 'dev-secret'

    const response = await fetch(`${baseUrl}/api/jobs/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cronSecret}`,
      },
    })

    const result = await response.json()

    return NextResponse.json({
      message: 'Job processing triggered',
      result,
    })
  } catch (error) {
    console.error('Error triggering job processing:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to trigger job processing',
      },
      { status: 500 }
    )
  }
}
