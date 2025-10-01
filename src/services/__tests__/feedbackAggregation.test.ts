import { describe, it, expect, beforeEach, vi } from 'vitest'
import { aggregateFeedback } from '../feedbackAggregation'
import * as supabaseServer from '@/utils/supabase/server'

// Mock Supabase client
vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}))

const createMockSupabaseChain = (finalData: unknown, finalError: unknown = null) => {
  const mockEq2 = vi.fn().mockResolvedValue({ data: finalData, error: finalError })
  const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 })
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 })
  const mockFrom = vi.fn().mockReturnValue({ select: mockSelect })

  return { from: mockFrom }
}

describe('aggregateFeedback', () => {
  const mockUserId = 'user-123'
  const mockTopicId = 'topic-456'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return null when no feedback exists', async () => {
    const mockSupabase = createMockSupabaseChain([], null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(supabaseServer, 'createClient').mockResolvedValue(mockSupabase as any)

    const result = await aggregateFeedback(mockUserId, mockTopicId)
    expect(result).toBeNull()
  })

  it('should calculate correct like ratio with multiple feedbacks', async () => {
    const mockFeedbackData = [
      {
        id: '1',
        type: 'like',
        comment: null,
        created_at: '2025-01-01T10:00:00Z',
        feed_item_id: 'item-1',
        feed_items: {
          id: 'item-1',
          title: 'Article 1',
          source: 'Reddit',
          topic_id: mockTopicId,
        },
      },
      {
        id: '2',
        type: 'like',
        comment: null,
        created_at: '2025-01-02T10:00:00Z',
        feed_item_id: 'item-2',
        feed_items: {
          id: 'item-2',
          title: 'Article 2',
          source: 'HackerNews',
          topic_id: mockTopicId,
        },
      },
      {
        id: '3',
        type: 'dislike',
        comment: null,
        created_at: '2025-01-03T10:00:00Z',
        feed_item_id: 'item-3',
        feed_items: {
          id: 'item-3',
          title: 'Article 3',
          source: 'Reddit',
          topic_id: mockTopicId,
        },
      },
    ]

    const mockSupabase = createMockSupabaseChain(mockFeedbackData, null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(supabaseServer, 'createClient').mockResolvedValue(mockSupabase as any)

    const result = await aggregateFeedback(mockUserId, mockTopicId)

    expect(result).not.toBeNull()
    expect(result?.like_ratio).toBeCloseTo(0.6667, 4) // 2 likes / 3 total
    expect(result?.likes).toBe(2)
    expect(result?.dislikes).toBe(1)
    expect(result?.total_feedback).toBe(3)
  })

  it('should identify preferred sources correctly', async () => {
    const mockFeedbackData = [
      {
        id: '1',
        type: 'like',
        comment: null,
        created_at: '2025-01-01T10:00:00Z',
        feed_item_id: 'item-1',
        feed_items: {
          id: 'item-1',
          title: 'Article 1',
          source: 'Reddit',
          topic_id: mockTopicId,
        },
      },
      {
        id: '2',
        type: 'like',
        comment: null,
        created_at: '2025-01-02T10:00:00Z',
        feed_item_id: 'item-2',
        feed_items: {
          id: 'item-2',
          title: 'Article 2',
          source: 'Reddit',
          topic_id: mockTopicId,
        },
      },
      {
        id: '3',
        type: 'like',
        comment: null,
        created_at: '2025-01-03T10:00:00Z',
        feed_item_id: 'item-3',
        feed_items: {
          id: 'item-3',
          title: 'Article 3',
          source: 'HackerNews',
          topic_id: mockTopicId,
        },
      },
    ]

    const mockSupabase = createMockSupabaseChain(mockFeedbackData, null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(supabaseServer, 'createClient').mockResolvedValue(mockSupabase as any)

    const result = await aggregateFeedback(mockUserId, mockTopicId)

    expect(result).not.toBeNull()
    expect(result?.preferred_sources).toHaveLength(2)
    expect(result?.preferred_sources[0]).toEqual({ source: 'Reddit', count: 2 })
    expect(result?.preferred_sources[1]).toEqual({ source: 'HackerNews', count: 1 })
  })

  it('should extract user comments correctly', async () => {
    const mockFeedbackData = [
      {
        id: '1',
        type: 'like',
        comment: 'Great article!',
        created_at: '2025-01-02T10:00:00Z',
        feed_item_id: 'item-1',
        feed_items: {
          id: 'item-1',
          title: 'Article 1',
          source: 'Reddit',
          topic_id: mockTopicId,
        },
      },
      {
        id: '2',
        type: 'dislike',
        comment: 'Not relevant',
        created_at: '2025-01-01T10:00:00Z',
        feed_item_id: 'item-2',
        feed_items: {
          id: 'item-2',
          title: 'Article 2',
          source: 'HackerNews',
          topic_id: mockTopicId,
        },
      },
    ]

    const mockSupabase = createMockSupabaseChain(mockFeedbackData, null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(supabaseServer, 'createClient').mockResolvedValue(mockSupabase as any)

    const result = await aggregateFeedback(mockUserId, mockTopicId)

    expect(result).not.toBeNull()
    expect(result?.user_comments).toHaveLength(2)
    expect(result?.user_comments[0].comment).toBe('Great article!')
    expect(result?.user_comments[0].feed_item_title).toBe('Article 1')
    // Should be sorted by most recent first
    expect(new Date(result!.user_comments[0].created_at).getTime()).toBeGreaterThan(
      new Date(result!.user_comments[1].created_at).getTime()
    )
  })

  it('should handle errors from Supabase', async () => {
    const mockSupabase = createMockSupabaseChain(null, { message: 'Database error' })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(supabaseServer, 'createClient').mockResolvedValue(mockSupabase as any)

    await expect(aggregateFeedback(mockUserId, mockTopicId)).rejects.toThrow(
      'Failed to fetch feedback: Database error'
    )
  })
})
