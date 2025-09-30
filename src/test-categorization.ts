// Manual test script for categorization agent
import 'dotenv/config'
import { categorizationAgent } from './mastra/agents/categorization-agent'

async function testCategorization() {
  console.log('🧪 Testing Categorization Agent\n')

  const testTopics = [
    'React performance optimization',
    'Machine Learning with Python',
    'Web3 and Blockchain Development',
    'Next.js 14 App Router best practices',
  ]

  for (const topic of testTopics) {
    try {
      console.log(`📝 Testing: "${topic}"`)
      console.log('⏳ Categorizing...')

      const startTime = Date.now()
      const result = await categorizationAgent.categorize(topic)
      const duration = Date.now() - startTime

      console.log(`✅ Completed in ${duration}ms\n`)

      console.log(`📊 Results:`)
      console.log(`   Sources (${result.sources.length}): ${result.sources.join(', ')}`)
      console.log(`   Keywords (${result.keywords.length}): ${result.keywords.join(', ')}`)
      console.log(`   Context: ${result.context}\n`)

      // Validate the result
      const validation = categorizationAgent.validateCategorization(result)
      if (validation.valid) {
        console.log('✅ Validation: PASSED')
      } else {
        console.log('❌ Validation: FAILED')
        console.log(`   Issues: ${validation.issues.join(', ')}`)
      }

      console.log('\n' + '='.repeat(80) + '\n')
    } catch (error) {
      console.error(`❌ Error categorizing "${topic}":`, error)
      console.log('\n' + '='.repeat(80) + '\n')
    }
  }

  // Test queue status
  const queueStatus = categorizationAgent.getStatus().queueStatus
  console.log('📈 Queue Status:')
  console.log(`   Queue Length: ${queueStatus.queueLength}`)
  console.log(`   Processing: ${queueStatus.processing}`)
  console.log(`   Requests in Window: ${queueStatus.requestsInWindow}`)
  console.log(`   Can Make Request: ${queueStatus.canMakeRequest}`)
}

// Run the test
testCategorization().catch((error) => {
  console.error('Test failed:', error)
  process.exit(1)
})
