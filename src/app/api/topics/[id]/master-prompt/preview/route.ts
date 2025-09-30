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

    logger.info(`API: Previewing Master Prompt for topic ${id}`)

    const result = await masterPromptService.previewMasterPrompt(id, userPreferences)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      masterPrompt: result.masterPrompt,
      validation: result.validation,
    })
  } catch (error) {
    logger.error('API: Master Prompt preview error:', error)

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
