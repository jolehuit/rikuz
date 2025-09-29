// Types for local storage data
export interface LocalTopic {
  id: string
  title: string
  description?: string
  keywords: string[]
  status: 'active' | 'paused' | 'archived'
  created_at: string
  updated_at: string
}

export interface LocalFeedItem {
  id: string
  topic_id: string
  title: string
  url: string
  source?: string
  summary?: string
  published_at?: string
  created_at: string
}

// Local storage keys
const KEYS = {
  TOPICS: 'rikuz_topics',
  FEED_ITEMS: 'rikuz_feed_items',
  SAVED_ITEMS: 'rikuz_saved_items',
  FEEDBACK: 'rikuz_feedback',
}

// Topics management
export const localTopics = {
  getAll: (): LocalTopic[] => {
    if (typeof window === 'undefined') return []
    const stored = localStorage.getItem(KEYS.TOPICS)
    return stored ? JSON.parse(stored) : []
  },

  create: (topic: Omit<LocalTopic, 'id' | 'created_at' | 'updated_at'>): LocalTopic => {
    const newTopic: LocalTopic = {
      ...topic,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const topics = localTopics.getAll()
    topics.push(newTopic)
    localStorage.setItem(KEYS.TOPICS, JSON.stringify(topics))

    return newTopic
  },

  update: (id: string, updates: Partial<LocalTopic>): LocalTopic | null => {
    const topics = localTopics.getAll()
    const index = topics.findIndex((t) => t.id === id)

    if (index === -1) return null

    topics[index] = {
      ...topics[index],
      ...updates,
      updated_at: new Date().toISOString(),
    }

    localStorage.setItem(KEYS.TOPICS, JSON.stringify(topics))
    return topics[index]
  },

  delete: (id: string): boolean => {
    const topics = localTopics.getAll()
    const filtered = topics.filter((t) => t.id !== id)

    if (filtered.length === topics.length) return false

    localStorage.setItem(KEYS.TOPICS, JSON.stringify(filtered))

    // Also delete related feed items
    const feedItems = localFeedItems.getAll()
    const filteredFeedItems = feedItems.filter((item) => item.topic_id !== id)
    localStorage.setItem(KEYS.FEED_ITEMS, JSON.stringify(filteredFeedItems))

    return true
  },
}

// Feed items management
export const localFeedItems = {
  getAll: (): LocalFeedItem[] => {
    if (typeof window === 'undefined') return []
    const stored = localStorage.getItem(KEYS.FEED_ITEMS)
    return stored ? JSON.parse(stored) : []
  },

  getByTopic: (topicId: string): LocalFeedItem[] => {
    return localFeedItems.getAll().filter((item) => item.topic_id === topicId)
  },

  create: (item: Omit<LocalFeedItem, 'id' | 'created_at'>): LocalFeedItem => {
    const newItem: LocalFeedItem = {
      ...item,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    }

    const items = localFeedItems.getAll()
    items.push(newItem)
    localStorage.setItem(KEYS.FEED_ITEMS, JSON.stringify(items))

    return newItem
  },

  delete: (id: string): boolean => {
    const items = localFeedItems.getAll()
    const filtered = items.filter((item) => item.id !== id)

    if (filtered.length === items.length) return false

    localStorage.setItem(KEYS.FEED_ITEMS, JSON.stringify(filtered))
    return true
  },
}

// Saved items management
export const localSavedItems = {
  getAll: (): string[] => {
    if (typeof window === 'undefined') return []
    const stored = localStorage.getItem(KEYS.SAVED_ITEMS)
    return stored ? JSON.parse(stored) : []
  },

  add: (feedItemId: string): void => {
    const saved = localSavedItems.getAll()
    if (!saved.includes(feedItemId)) {
      saved.push(feedItemId)
      localStorage.setItem(KEYS.SAVED_ITEMS, JSON.stringify(saved))
    }
  },

  remove: (feedItemId: string): void => {
    const saved = localSavedItems.getAll()
    const filtered = saved.filter((id) => id !== feedItemId)
    localStorage.setItem(KEYS.SAVED_ITEMS, JSON.stringify(filtered))
  },

  isSaved: (feedItemId: string): boolean => {
    return localSavedItems.getAll().includes(feedItemId)
  },
}

// Feedback management
export const localFeedback = {
  getAll: (): Record<string, { type: 'like' | 'dislike'; comment?: string }> => {
    if (typeof window === 'undefined') return {}
    const stored = localStorage.getItem(KEYS.FEEDBACK)
    return stored ? JSON.parse(stored) : {}
  },

  set: (feedItemId: string, type: 'like' | 'dislike', comment?: string): void => {
    const feedback = localFeedback.getAll()
    feedback[feedItemId] = { type, comment }
    localStorage.setItem(KEYS.FEEDBACK, JSON.stringify(feedback))
  },

  get: (feedItemId: string): { type: 'like' | 'dislike'; comment?: string } | null => {
    const feedback = localFeedback.getAll()
    return feedback[feedItemId] || null
  },

  remove: (feedItemId: string): void => {
    const feedback = localFeedback.getAll()
    delete feedback[feedItemId]
    localStorage.setItem(KEYS.FEEDBACK, JSON.stringify(feedback))
  },
}

// Clear all data
export const clearAllLocalData = (): void => {
  Object.values(KEYS).forEach((key) => {
    localStorage.removeItem(key)
  })
}
