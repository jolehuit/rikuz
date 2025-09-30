import { logger, RATE_LIMIT_CONFIG } from '../index'

interface QueueItem<T = unknown> {
  id: string
  agentId: string
  execute: () => Promise<T>
  resolve: (value: T) => void
  reject: (error: unknown) => void
  retryCount: number
  maxRetries: number
  createdAt: Date
}

class GeminiRateLimitQueue {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private queue: QueueItem<any>[] = []
  private processing = false
  private requestTimes: number[] = []

  constructor() {
    // Clean up old request times every minute
    setInterval(() => {
      this.cleanupOldRequestTimes()
    }, RATE_LIMIT_CONFIG.GEMINI_REQUEST_WINDOW_MS)
  }

  private cleanupOldRequestTimes() {
    const now = Date.now()
    const cutoff = now - RATE_LIMIT_CONFIG.GEMINI_REQUEST_WINDOW_MS
    this.requestTimes = this.requestTimes.filter((time) => time > cutoff)
  }

  private canMakeRequest(): boolean {
    this.cleanupOldRequestTimes()
    return this.requestTimes.length < RATE_LIMIT_CONFIG.GEMINI_MAX_REQUESTS_PER_MINUTE
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private calculateBackoffDelay(retryCount: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s, etc.
    return Math.min(1000 * Math.pow(2, retryCount), 30000) // Max 30 seconds
  }

  async add<T>(agentId: string, operation: () => Promise<T>, maxRetries = 3): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const queueItem: QueueItem<T> = {
        id: `${agentId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        agentId,
        execute: operation,
        resolve,
        reject,
        retryCount: 0,
        maxRetries,
        createdAt: new Date(),
      }

      this.queue.push(queueItem)
      logger.debug(`Added item to Gemini queue: ${queueItem.id} for agent: ${agentId}`)

      this.processQueue()
    })
  }

  private async processQueue() {
    if (this.processing) {
      return
    }

    this.processing = true

    try {
      while (this.queue.length > 0) {
        if (!this.canMakeRequest()) {
          // Wait until we can make another request
          const oldestRequestTime = Math.min(...this.requestTimes)
          const waitTime = Math.max(
            0,
            RATE_LIMIT_CONFIG.GEMINI_REQUEST_WINDOW_MS - (Date.now() - oldestRequestTime)
          )

          logger.debug(`Rate limit reached, waiting ${waitTime}ms`)
          await this.delay(waitTime + 100) // Add small buffer
          continue
        }

        const item = this.queue.shift()
        if (!item) continue

        try {
          logger.debug(`Processing queue item: ${item.id}`)
          this.requestTimes.push(Date.now())

          const startTime = Date.now()
          const result = await item.execute()
          const duration = Date.now() - startTime

          logger.debug(`Queue item ${item.id} completed in ${duration}ms`)
          item.resolve(result)
        } catch (error) {
          item.retryCount++

          if (item.retryCount <= item.maxRetries) {
            const backoffDelay = this.calculateBackoffDelay(item.retryCount - 1)
            logger.warn(
              `Queue item ${item.id} failed (attempt ${item.retryCount}/${item.maxRetries}), retrying in ${backoffDelay}ms`
            )

            // Add back to queue after delay
            setTimeout(() => {
              this.queue.unshift(item)
              this.processQueue()
            }, backoffDelay)
          } else {
            logger.error(`Queue item ${item.id} failed after ${item.maxRetries} attempts`)
            item.reject(error)
          }
        }
      }
    } finally {
      this.processing = false
    }
  }

  getQueueStatus() {
    this.cleanupOldRequestTimes()
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      requestsInWindow: this.requestTimes.length,
      canMakeRequest: this.canMakeRequest(),
    }
  }
}

// Export singleton instance
export const geminiQueue = new GeminiRateLimitQueue()
