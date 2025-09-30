import { Mastra } from '@mastra/core'
import { google } from '@ai-sdk/google'
import pino from 'pino'

// Logger for cost tracking and monitoring
export const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport:
    process.env.NODE_ENV !== 'production'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
})

// Gemini 2.5 Flash model configuration
export const gemini = google('gemini-2.5-flash', {
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
})

// Rate limiting configuration for Gemini API (60 requests per minute)
export const RATE_LIMIT_CONFIG = {
  GEMINI_MAX_REQUESTS_PER_MINUTE: 60,
  GEMINI_REQUEST_WINDOW_MS: 60 * 1000, // 1 minute in milliseconds
}

// Main Mastra instance configuration
export const mastra = new Mastra({
  agents: {},
  tools: {},
  workflows: {},
})

// Agent compartmentalization utility - creates unique agent IDs per user+topic
export function createAgentId(userId: string, topicId: string): string {
  return `agent-${userId}-${topicId}`
}

// Logging utility for Gemini API calls (cost tracking)
export function logGeminiCall(
  agentId: string,
  inputTokens: number,
  outputTokens: number,
  requestDuration: number
) {
  logger.info(
    {
      service: 'gemini',
      agentId,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      requestDuration,
      timestamp: new Date().toISOString(),
    },
    'Gemini API call completed'
  )
}
