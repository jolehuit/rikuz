import { NextRequest, NextResponse } from 'next/server'
import { categorizationService } from '@/lib/services/categorization-service'
import { logger } from '@/mastra/index'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { topicIds } = body

    if (!topicIds || !Array.isArray(topicIds) || topicIds.length === 0) {
      return NextResponse.json(
        { error: 'topicIds array is required and must not be empty' },
        { status: 400 }
      )
    }

    if (topicIds.length > 50) {
      return NextResponse.json({ error: 'Maximum 50 topics allowed per batch' }, { status: 400 })
    }

    logger.info(`API: Batch categorizing ${topicIds.length} topics`)

    const result = await categorizationService.categorizeBatchTopics(topicIds)

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    logger.error('API: Batch categorization error:', error)

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
