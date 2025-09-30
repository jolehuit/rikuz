// Test setup file
import { beforeAll } from 'vitest'
import dotenv from 'dotenv'

beforeAll(() => {
  // Load environment variables for testing
  dotenv.config({ path: '.env.local' })

  // Mock environment variables for tests if not provided
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-api-key'
  }

  // Mock Supabase environment variables for tests
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  }
})
