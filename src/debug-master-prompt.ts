// Debug script for Master Prompt validation
import 'dotenv/config'
import { masterPromptGenerator } from './mastra/agents/master-prompt-generator'
import type { CategorizationResult, TopicContext } from './mastra/agents/master-prompt-generator'

const sampleCategorizationResult: CategorizationResult = {
  sources: ['github', 'stackoverflow', 'blogs', 'medium'],
  keywords: ['react', 'performance', 'optimization', 'hooks', 'components', 'memory'],
  context: 'This topic focuses on React performance optimization techniques and best practices.',
}

const sampleTopicContext: TopicContext = {
  title: 'React Performance Optimization',
  description: 'Learn advanced techniques for optimizing React application performance',
  userPreferences: {
    language: 'en',
    difficulty: 'intermediate',
    timeFrame: 'recent',
    contentTypes: ['tutorials', 'examples'],
  },
}

const masterPrompt = masterPromptGenerator.generateMasterPrompt(
  sampleTopicContext,
  sampleCategorizationResult
)

console.log('=== GENERATED MASTER PROMPT ===')
console.log(masterPrompt)
console.log('\n=== LENGTH ===')
console.log(`${masterPrompt.length} characters`)

console.log('\n=== VALIDATION RESULT ===')
const validation = masterPromptGenerator.validateMasterPrompt(masterPrompt)
console.log(JSON.stringify(validation, null, 2))
