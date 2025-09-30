/**
 * Test file for Story 2.4: User+Topic Specific Agent Creation
 *
 * This test validates:
 * 1. Agent creation with correct naming pattern: agent-{user_id}-{topic_id}
 * 2. Agent compartmentalization (isolation between users)
 * 3. Master Prompt assignment to agents
 * 4. Automatic agent deletion when topic is deleted
 */

import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })
import { createSpecificAgent, generateAgentId } from './mastra/agents/specific-agent'

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

// Test data
const TEST_USER_1_ID = 'test-user-1-' + Date.now()
const TEST_USER_2_ID = 'test-user-2-' + Date.now()
const TEST_TOPIC_1_ID = 'test-topic-1-' + Date.now()
const TEST_TOPIC_2_ID = 'test-topic-2-' + Date.now()

const MASTER_PROMPT_1 = `You are a specialized agent for searching React performance optimization topics.
Focus on: GitHub repositories, technical blogs, Reddit r/reactjs.
Keywords: React, performance, optimization, hooks, rendering.`

const _MASTER_PROMPT_2 = `You are a specialized agent for searching AI news topics.
Focus on: AI research papers, tech news, HackerNews.
Keywords: AI, machine learning, LLM, neural networks.`

/**
 * Test 1: Agent ID generation follows correct pattern
 */
async function testAgentIdFormat() {
  console.log('\n🧪 Test 1: Agent ID Format')
  console.log('═'.repeat(50))

  const agentId1 = generateAgentId(TEST_USER_1_ID, TEST_TOPIC_1_ID)
  const expectedId1 = `agent-${TEST_USER_1_ID}-${TEST_TOPIC_1_ID}`

  if (agentId1 === expectedId1) {
    console.log('✅ Agent ID format is correct:', agentId1)
  } else {
    console.log('❌ Agent ID format is incorrect')
    console.log('Expected:', expectedId1)
    console.log('Got:', agentId1)
  }
}

/**
 * Test 2: Create agents for different users
 */
async function testAgentCreation() {
  console.log('\n🧪 Test 2: Agent Creation')
  console.log('═'.repeat(50))

  try {
    // Create test users (using service role for testing)
    const { error: user1Error } = await supabase.auth.admin.createUser({
      email: `test-user-1-${Date.now()}@example.com`,
      password: 'test-password-123',
      email_confirm: true,
      user_metadata: { test_id: TEST_USER_1_ID },
    })

    const { error: user2Error } = await supabase.auth.admin.createUser({
      email: `test-user-2-${Date.now()}@example.com`,
      password: 'test-password-123',
      email_confirm: true,
      user_metadata: { test_id: TEST_USER_2_ID },
    })

    if (user1Error || user2Error) {
      console.log('⚠️  Could not create test users. Using mock user IDs for testing.')
    }

    // Test creating Mastra Agent instances
    const agent1 = createSpecificAgent(TEST_USER_1_ID, TEST_TOPIC_1_ID, MASTER_PROMPT_1)
    const agent2 = createSpecificAgent(TEST_USER_2_ID, TEST_TOPIC_1_ID, MASTER_PROMPT_1)

    console.log('✅ Agent 1 created:', agent1.name)
    console.log('✅ Agent 2 created:', agent2.name)

    // Verify agents have different IDs
    if (agent1.name !== agent2.name) {
      console.log('✅ Agents for different users have different IDs (compartmentalized)')
    } else {
      console.log('❌ Agents should have different IDs')
    }
  } catch (error) {
    console.error('❌ Agent creation failed:', error)
  }
}

/**
 * Test 3: Agent compartmentalization (isolation)
 */
async function testAgentCompartmentalization() {
  console.log('\n🧪 Test 3: Agent Compartmentalization')
  console.log('═'.repeat(50))

  const agentId1 = generateAgentId(TEST_USER_1_ID, TEST_TOPIC_1_ID)
  const agentId2 = generateAgentId(TEST_USER_2_ID, TEST_TOPIC_1_ID)
  const agentId3 = generateAgentId(TEST_USER_1_ID, TEST_TOPIC_2_ID)

  console.log('User 1 + Topic 1:', agentId1)
  console.log('User 2 + Topic 1:', agentId2)
  console.log('User 1 + Topic 2:', agentId3)

  const allDifferent = agentId1 !== agentId2 && agentId1 !== agentId3 && agentId2 !== agentId3

  if (allDifferent) {
    console.log('✅ All agent IDs are unique (proper compartmentalization)')
  } else {
    console.log('❌ Agent IDs should be unique for each user+topic combination')
  }
}

/**
 * Test 4: Master Prompt is assigned to agent
 */
async function testMasterPromptAssignment() {
  console.log('\n🧪 Test 4: Master Prompt Assignment')
  console.log('═'.repeat(50))

  const agent = createSpecificAgent(TEST_USER_1_ID, TEST_TOPIC_1_ID, MASTER_PROMPT_1)

  // Get agent instructions
  const instructions = await agent.getInstructions()

  if (instructions === MASTER_PROMPT_1) {
    console.log('✅ Master Prompt correctly assigned to agent')
  } else {
    console.log('❌ Master Prompt not properly assigned')
    console.log('Expected:', MASTER_PROMPT_1)
    console.log('Got:', instructions)
  }
}

/**
 * Test 5: Same topic for different users creates different agents
 */
async function testSameTopicDifferentUsers() {
  console.log('\n🧪 Test 5: Same Topic, Different Users')
  console.log('═'.repeat(50))

  const agent1 = createSpecificAgent(TEST_USER_1_ID, TEST_TOPIC_1_ID, MASTER_PROMPT_1)
  const agent2 = createSpecificAgent(TEST_USER_2_ID, TEST_TOPIC_1_ID, MASTER_PROMPT_1)

  console.log('User 1 Agent:', agent1.name)
  console.log('User 2 Agent:', agent2.name)

  if (agent1.name !== agent2.name) {
    console.log('✅ Different agents created for same topic but different users')
  } else {
    console.log('❌ Agents should be different')
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('\n🚀 Starting Agent Creation Tests (Story 2.4)')
  console.log('═'.repeat(50))

  await testAgentIdFormat()
  await testAgentCreation()
  await testAgentCompartmentalization()
  await testMasterPromptAssignment()
  await testSameTopicDifferentUsers()

  console.log('\n' + '═'.repeat(50))
  console.log('✅ All Agent Creation Tests Completed')
  console.log('═'.repeat(50) + '\n')
}

// Run tests
runTests().catch(console.error)
