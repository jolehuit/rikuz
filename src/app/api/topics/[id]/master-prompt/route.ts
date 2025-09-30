import { NextRequest, NextResponse } from 'next/server'
import { masterPromptService } from '@/lib/services/master-prompt-service'
import { logger } from '@/mastra/index'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { userPreferences } = body

    if (!id) {
      return NextResponse.json({ error: 'Topic ID is required' }, { status: 400 })
    }

    logger.info(`API: Generating Master Prompt for topic ${id}`)

    const result = await masterPromptService.generateAndStoreMasterPrompt(id, userPreferences)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      masterPrompt: result.masterPrompt,
    })
  } catch (error) {
    logger.error('API: Master Prompt generation error:', error)

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'Topic ID is required' }, { status: 400 })
    }

    const result = await masterPromptService.getTopicMasterPrompt(id)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.masterPrompt ? 200 : 404 })
    }

    return NextResponse.json({
      success: true,
      masterPrompt: result.masterPrompt,
      validation: result.validation,
    })
  } catch (error) {
    logger.error('API: Get Master Prompt error:', error)

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { userPreferences } = body

    if (!id) {
      return NextResponse.json({ error: 'Topic ID is required' }, { status: 400 })
    }

    if (!userPreferences) {
      return NextResponse.json({ error: 'User preferences are required' }, { status: 400 })
    }

    logger.info(`API: Updating Master Prompt preferences for topic ${id}`)

    const result = await masterPromptService.updateMasterPromptWithPreferences(id, userPreferences)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      masterPrompt: result.masterPrompt,
    })
  } catch (error) {
    logger.error('API: Master Prompt update error:', error)

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
