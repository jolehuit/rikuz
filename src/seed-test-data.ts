/**
 * Seed Test Data Script
 * Creates test user, topic, and agent for Epic 2 validation
 *
 * Run with: bun run src/seed-test-data.ts
 */

import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function seedTestData() {
  console.log('🌱 Seeding Test Data for Epic 2 Validation')
  console.log('═'.repeat(50))

  try {
    // Step 1: Create test user
    console.log('\n📝 Step 1: Creating test user...')

    const testEmail = 'test@rikuz.dev'
    const testPassword = 'TestPassword123!'

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    let userId: string

    const existingUser = existingUsers?.users?.find((u) => u.email === testEmail)

    if (existingUser) {
      console.log('✅ Test user already exists:', testEmail)
      userId = existingUser.id
    } else {
      // Create new user
      const { data: newUser, error: userError } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true,
      })

      if (userError || !newUser.user) {
        throw new Error(`Failed to create user: ${userError?.message}`)
      }

      userId = newUser.user.id
      console.log('✅ Created test user:', testEmail)
      console.log('   User ID:', userId)
    }

    // Step 2: Create test topic
    console.log('\n📝 Step 2: Creating test topic...')

    const { data: existingTopics } = await supabase
      .from('topics')
      .select('id, title')
      .eq('user_id', userId)
      .eq('title', 'React Performance Testing')

    let topicId: string

    if (existingTopics && existingTopics.length > 0) {
      console.log('✅ Test topic already exists')
      topicId = existingTopics[0].id
    } else {
      const { data: newTopic, error: topicError } = await supabase
        .from('topics')
        .insert({
          user_id: userId,
          title: 'React Performance Testing',
          description: 'Latest news and updates about React performance optimization',
          keywords: ['react', 'performance', 'optimization', 'web development'],
          categorization_result: {
            sources: ['GitHub', 'Reddit', 'HackerNews', 'Dev.to', 'Medium'],
            keywords: ['react', 'performance', 'optimization', 'rendering', 'hooks'],
            context:
              'Technical articles and discussions about React performance optimization techniques',
          },
          master_prompt:
            'Search for the latest articles, discussions, and updates about React performance optimization. Focus on practical tips, new techniques, and real-world case studies. Look for content from GitHub repositories, Reddit discussions (r/reactjs), HackerNews, technical blogs, and development forums.',
          status: 'active',
        })
        .select('id')
        .single()

      if (topicError || !newTopic) {
        throw new Error(`Failed to create topic: ${topicError?.message}`)
      }

      topicId = newTopic.id
      console.log('✅ Created test topic')
      console.log('   Topic ID:', topicId)
    }

    // Step 3: Create test agent using AgentService
    console.log('\n📝 Step 3: Creating test agent...')

    const agentId = `agent-${userId}-${topicId}`

    const { data: existingAgents } = await supabase
      .from('agents')
      .select('agent_id')
      .eq('agent_id', agentId)

    if (existingAgents && existingAgents.length > 0) {
      console.log('✅ Test agent already exists')
      console.log('   Agent ID:', agentId)
    } else {
      // Get topic data for master prompt
      const { data: topic } = await supabase
        .from('topics')
        .select('title, master_prompt')
        .eq('id', topicId)
        .single()

      const { data: newAgent, error: agentError } = await supabase
        .from('agents')
        .insert({
          agent_id: agentId,
          user_id: userId,
          topic_id: topicId,
          name: topic?.title || 'Test Agent',
          instructions: topic?.master_prompt || 'Search for relevant content',
          master_prompt: topic?.master_prompt,
          status: 'active',
        })
        .select('*')
        .single()

      if (agentError || !newAgent) {
        throw new Error(`Failed to create agent: ${agentError?.message}`)
      }

      console.log('✅ Created test agent')
      console.log('   Agent ID:', agentId)
    }

    // Summary
    console.log('\n' + '═'.repeat(50))
    console.log('✅ Test Data Seeded Successfully!')
    console.log('═'.repeat(50))
    console.log('\n📊 Summary:')
    console.log(`   User: ${testEmail} (${userId})`)
    console.log(`   Password: ${testPassword}`)
    console.log(`   Topic ID: ${topicId}`)
    console.log(`   Agent ID: ${agentId}`)
    console.log('\n🧪 You can now run the tests:')
    console.log('   bun run src/test-search-execution.ts')
    console.log('   bun run src/test-queue-performance.ts')
    console.log('═'.repeat(50) + '\n')
  } catch (error) {
    console.error('\n❌ Failed to seed test data:', error)
    process.exit(1)
  }
}

// Run seeding
seedTestData().catch(console.error)
