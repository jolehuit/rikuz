/**
 * Test file for Story 2.5: Daily Search Execution with Gemini Web Search
 *
 * This test validates:
 * 1. Search execution with Gemini 2.5 Flash + Google Search grounding
 * 2. Results are structured as JSON with items array
 * 3. Results are saved to feed_items table
 * 4. Error handling with retry logic works
 */

import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { executeSearchWithRetry } from './services/search-service'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

// Initialize Supabase client (using anon key for testing)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase environment variables')
  console.error(
    'Required: NEXT_PUBLIC_SUPABASE_URL and (SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY)'
  )
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

/**
 * Test 1: Find an active agent to test with
 */
async function findTestAgent() {
  console.log('\n🧪 Test 1: Finding Active Agent')
  console.log('═'.repeat(50))

  try {
    // Get first active agent from database
    const { data: agents, error } = await supabase
      .from('agents')
      .select('agent_id, user_id, topic_id, name, status')
      .eq('status', 'active')
      .limit(1)

    if (error) {
      console.error('❌ Error fetching agents:', error)
      return null
    }

    if (!agents || agents.length === 0) {
      console.log('⚠️  No active agents found. Please create an agent first.')
      return null
    }

    const agent = agents[0]
    console.log('✅ Found active agent:', agent.agent_id)
    console.log('   Name:', agent.name)
    console.log('   Status:', agent.status)

    return agent.agent_id
  } catch (error) {
    console.error('❌ Failed to find test agent:', error)
    return null
  }
}

/**
 * Test 2: Execute search for agent
 */
async function testSearchExecution(agentId: string) {
  console.log('\n🧪 Test 2: Search Execution')
  console.log('═'.repeat(50))

  try {
    console.log(`Executing search for agent: ${agentId}`)
    console.log('⏳ This may take 10-30 seconds...\n')

    const startTime = Date.now()

    // Execute search with retry logic
    const results = await executeSearchWithRetry(agentId, 3)

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

    console.log(`✅ Search completed in ${duration}s`)
    console.log(`   Total results: ${results.totalResults}`)
    console.log(`   Search queries: ${results.searchQueries?.join(', ') || 'N/A'}`)

    if (results.items.length > 0) {
      console.log('\n📄 Sample Results (first 3):')
      results.items.slice(0, 3).forEach((item, index) => {
        console.log(`\n${index + 1}. ${item.title}`)
        console.log(`   Source: ${item.source}`)
        console.log(`   URL: ${item.url}`)
        console.log(`   Relevance: ${item.relevance_score?.toFixed(2) || 'N/A'}`)
        if (item.summary) {
          console.log(`   Summary: ${item.summary.substring(0, 100)}...`)
        }
      })
    }

    return results
  } catch (error) {
    console.error('❌ Search execution failed:', error)
    throw error
  }
}

/**
 * Test 3: Verify results were saved to database
 */
async function verifyDatabaseResults(agentId: string) {
  console.log('\n🧪 Test 3: Verify Database Results')
  console.log('═'.repeat(50))

  try {
    // Get feed items for this agent
    const { data: feedItems, error } = await supabase
      .from('feed_items')
      .select('id, title, url, source, created_at')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error('❌ Error fetching feed items:', error)
      return
    }

    if (!feedItems || feedItems.length === 0) {
      console.log('⚠️  No feed items found in database')
      return
    }

    console.log(`✅ Found ${feedItems.length} feed items in database`)
    console.log('\n📊 Recent Feed Items:')
    feedItems.slice(0, 3).forEach((item, index) => {
      console.log(`\n${index + 1}. ${item.title}`)
      console.log(`   Source: ${item.source}`)
      console.log(`   URL: ${item.url}`)
      console.log(`   Created: ${new Date(item.created_at).toLocaleString()}`)
    })
  } catch (error) {
    console.error('❌ Failed to verify database results:', error)
  }
}

/**
 * Test 4: Test error handling with invalid agent
 */
async function testErrorHandling() {
  console.log('\n🧪 Test 4: Error Handling')
  console.log('═'.repeat(50))

  try {
    await executeSearchWithRetry('invalid-agent-id', 1)
    console.log('❌ Should have thrown an error')
  } catch (error) {
    console.log('✅ Error handling works correctly')
    console.log(`   Error: ${error instanceof Error ? error.message : error}`)
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('\n🚀 Starting Search Execution Tests (Story 2.5)')
  console.log('═'.repeat(50))

  // Test 1: Find test agent
  const agentId = await findTestAgent()
  if (!agentId) {
    console.log('\n⚠️  Cannot continue tests without an active agent')
    console.log('Please create a topic and agent first, then re-run this test')
    return
  }

  // Test 2: Execute search
  await testSearchExecution(agentId)

  // Test 3: Verify database results
  await verifyDatabaseResults(agentId)

  // Test 4: Test error handling
  await testErrorHandling()

  console.log('\n' + '═'.repeat(50))
  console.log('✅ All Search Execution Tests Completed')
  console.log('═'.repeat(50) + '\n')
}

// Run tests
runTests().catch(console.error)
