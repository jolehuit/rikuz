// Manual test script for Master Prompt generation
import 'dotenv/config'
import { masterPromptGenerator, type TopicContext } from './mastra/agents/master-prompt-generator'
import type { CategorizationResult } from './mastra/agents/categorization-agent'

async function testMasterPromptGeneration() {
  console.log('🧪 Testing Master Prompt Generation\n')

  const testCases = [
    {
      name: 'React Performance Optimization',
      topicContext: {
        title: 'React Performance Optimization',
        description: 'Advanced techniques for optimizing React application performance',
        userPreferences: {
          difficulty: 'intermediate' as const,
          timeFrame: 'recent' as const,
          contentTypes: ['tutorials', 'examples'],
          language: 'en',
        },
      },
      categorization: {
        sources: ['github', 'stackoverflow', 'blogs', 'medium'],
        keywords: ['react', 'performance', 'optimization', 'hooks', 'components'],
        context: 'React performance optimization techniques and best practices.',
      },
    },
    {
      name: 'Machine Learning with Python',
      topicContext: {
        title: 'Machine Learning with Python',
        description: 'Deep learning frameworks and practical ML implementation',
        userPreferences: {
          difficulty: 'advanced' as const,
          includeAcademic: true,
          contentTypes: ['research', 'tutorials'],
          language: 'en',
        },
      },
      categorization: {
        sources: ['github', 'academic', 'medium', 'youtube'],
        keywords: ['machine learning', 'python', 'tensorflow', 'pytorch', 'neural networks'],
        context: 'Focus on practical ML implementation and frameworks',
      },
    },
    {
      name: 'Startup Fundraising Strategies',
      topicContext: {
        title: 'Startup Fundraising Strategies',
        description: 'Early-stage fundraising and investor relations',
        userPreferences: {
          difficulty: 'intermediate' as const,
          timeFrame: 'recent' as const,
          contentTypes: ['case-studies', 'expert-insights'],
        },
      },
      categorization: {
        sources: ['hackernews', 'linkedin', 'blogs', 'podcasts'],
        keywords: ['startup', 'fundraising', 'venture-capital', 'investors', 'seed-round'],
        context: 'Entrepreneurship and business development strategies',
      },
    },
  ]

  for (const testCase of testCases) {
    try {
      console.log(`📝 Testing: "${testCase.name}"`)
      console.log('⏳ Generating Master Prompt...')

      const startTime = Date.now()
      const masterPrompt = masterPromptGenerator.generateMasterPrompt(
        testCase.topicContext as TopicContext,
        testCase.categorization as CategorizationResult
      )
      const duration = Date.now() - startTime

      console.log(`✅ Generated in ${duration}ms (${masterPrompt.length} chars)\n`)

      // Validate the prompt
      const validation = masterPromptGenerator.validateMasterPrompt(masterPrompt)
      console.log(`📊 Validation Score: ${validation.score}/100`)

      if (validation.valid) {
        console.log('✅ Validation: PASSED')
      } else {
        console.log('❌ Validation: FAILED')
        console.log(`   Issues: ${validation.issues.join(', ')}`)
      }

      if (validation.suggestions.length > 0) {
        console.log(`💡 Suggestions: ${validation.suggestions.join(', ')}`)
      }

      // Show key sections
      console.log('\n📋 Key Sections Present:')
      const sections = [
        'TOPIC FOCUS',
        'SEARCH STRATEGY',
        'CONTENT QUALITY CRITERIA',
        'OUTPUT REQUIREMENTS',
        'WEB SEARCH EXECUTION',
      ]
      sections.forEach((section) => {
        const present = masterPrompt.includes(section)
        console.log(`   ${present ? '✅' : '❌'} ${section}`)
      })

      // Show search queries sample
      console.log('\n🔍 Sample Search Queries:')
      const queries = testCase.categorization.keywords.slice(0, 3)
      queries.forEach((query) => {
        console.log(`   - "${query}"`)
      })
      console.log(`   - "${queries[0]} site:${testCase.categorization.sources[0]}.com"`)

      // Test preferences integration
      if (testCase.topicContext.userPreferences) {
        console.log('\n⚙️ User Preferences Integration:')
        const prefs = testCase.topicContext.userPreferences
        if (prefs.difficulty) {
          console.log(
            `   ${masterPrompt.includes(prefs.difficulty) ? '✅' : '❌'} Difficulty: ${prefs.difficulty}`
          )
        }
        if (prefs.timeFrame) {
          const timeIndicator = prefs.timeFrame === 'recent' ? '6 months' : 'all time'
          console.log(
            `   ${masterPrompt.includes(timeIndicator) ? '✅' : '❌'} Time Frame: ${prefs.timeFrame}`
          )
        }
        if (prefs.includeAcademic) {
          console.log(`   ${masterPrompt.includes('Academic') ? '✅' : '❌'} Include Academic`)
        }
      }

      console.log('\n' + '='.repeat(80) + '\n')
    } catch (error) {
      console.error(`❌ Error generating Master Prompt for "${testCase.name}":`, error)
      console.log('\n' + '='.repeat(80) + '\n')
    }
  }

  // Test regeneration with preference changes
  console.log('🔄 Testing Master Prompt Regeneration')

  const originalPrompt = masterPromptGenerator.generateMasterPrompt(
    testCases[0].topicContext as TopicContext,
    testCases[0].categorization as CategorizationResult
  )

  const newPreferences = {
    difficulty: 'beginner' as const,
    language: 'fr',
    timeFrame: 'all-time' as const,
  }

  const regeneratedPrompt = masterPromptGenerator.regenerateMasterPrompt(
    originalPrompt,
    newPreferences,
    testCases[0].topicContext as TopicContext,
    testCases[0].categorization as CategorizationResult
  )

  console.log('✅ Regeneration completed')
  console.log(`   Original: ${originalPrompt.length} chars`)
  console.log(`   Regenerated: ${regeneratedPrompt.length} chars`)
  console.log(`   Different: ${originalPrompt !== regeneratedPrompt ? 'Yes' : 'No'}`)
  console.log(`   Contains "beginner": ${regeneratedPrompt.includes('beginner') ? 'Yes' : 'No'}`)
  console.log(`   Contains "fr": ${regeneratedPrompt.includes('fr') ? 'Yes' : 'No'}`)

  // Test generator status
  console.log('\n📈 Generator Status:')
  const status = masterPromptGenerator.getStatus()
  console.log(`   Name: ${status.name}`)
  console.log(`   Ready: ${status.ready}`)
  console.log(`   Version: ${status.version}`)
  console.log(`   Supported Sources: ${status.supportedSources.length}`)

  console.log('\n✅ All Master Prompt Generation Tests Completed!')
}

// Run the test
testMasterPromptGeneration().catch((error) => {
  console.error('Test failed:', error)
  process.exit(1)
})
