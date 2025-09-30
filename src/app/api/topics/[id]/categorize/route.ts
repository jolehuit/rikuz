import { NextRequest, NextResponse } from 'next/server'
import { categorizationService } from '@/lib/services/categorization-service'
import { logger } from '@/mastra/lib/logger'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'Topic ID is required' }, { status: 400 })
    }

    logger.info(`API: Categorizing topic ${id}`)

    const result = await categorizationService.recategorizeTopic(id)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      categorization: result.categorization,
    })
  } catch (error) {
    logger.error('API: Categorization error:', error)

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'Topic ID is required' }, { status: 400 })
    }

    const result = await categorizationService.getTopicCategorization(id)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      categorization: result.categorization,
    })
  } catch (error) {
    logger.error('API: Get categorization error:', error)

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
