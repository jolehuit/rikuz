import { Agent } from '@mastra/core/agent'
import { gemini } from '../index'
import { FeedbackAggregationResult } from '@/services/feedbackAggregation'
import { z } from 'zod'

/**
 * Refinement Agent - Analyzes feedback and updates Master Prompts
 *
 * This agent analyzes aggregated user feedback and proposes optimized Master Prompts
 * that better align with user preferences while maintaining the core structure.
 */
export const refinementAgent = new Agent({
  name: 'refinement-agent',
  instructions: `You are a Master Prompt Refinement Agent. Your role is to analyze user feedback and update Master Prompts to better serve user preferences.

## Your Task:
Analyze the provided feedback data and the current Master Prompt, then generate an IMPROVED Master Prompt that:

1. **Preserves Core Structure**: Keep the essential elements of the original prompt
2. **Adjusts Source Priorities**: Prioritize sources based on user likes/dislikes
3. **Refines Content Style**: Adapt to user preferences shown in comments
4. **Adds Filtering Rules**: Include patterns to filter out disliked content

## Feedback Analysis Guidelines:

### Source Preferences:
- If like_ratio > 0.7 for a source: Mark as HIGH PRIORITY
- If like_ratio < 0.3 for a source: Mark as LOW PRIORITY or exclude
- Prioritize sources with most likes in preferred_sources array

### User Comments Analysis:
- Extract recurring keywords and themes from user_comments
- Identify content preferences (technical depth, beginner-friendly, news vs analysis, etc.)
- Note specific filters requested (e.g., "no cryptocurrency", "focus on open-source")

### Content Adjustments:
- Adjust technical depth based on feedback
- Modify content type focus (tutorials, news, analysis, projects)
- Add explicit exclusion rules for disliked topics

## Output Format:
Return a JSON object with:
{
  "updated_master_prompt": "The improved Master Prompt text",
  "changes_summary": "Brief summary of what was changed and why",
  "confidence_score": 0.0-1.0 (how confident you are in these changes)
}

IMPORTANT: The updated Master Prompt should be a complete, ready-to-use prompt that can replace the current one.`,
  model: gemini,
})

/**
 * Analyze feedback and generate an updated Master Prompt
 *
 * @param currentMasterPrompt - The current Master Prompt
 * @param feedback - Aggregated feedback data
 * @returns Object containing updated Master Prompt and change summary
 */
export async function refineMasterPrompt(
  currentMasterPrompt: string,
  feedback: FeedbackAggregationResult
): Promise<{
  updated_master_prompt: string
  changes_summary: string
  confidence_score: number
}> {
  const feedbackContext = `
## Current Master Prompt:
${currentMasterPrompt}

## Feedback Data:
- Total Feedback: ${feedback.total_feedback} (${feedback.likes} likes, ${feedback.dislikes} dislikes)
- Like Ratio: ${(feedback.like_ratio * 100).toFixed(1)}%

### Preferred Sources (by likes):
${feedback.preferred_sources.map((s) => `- ${s.source}: ${s.count} likes`).join('\n')}

### User Comments:
${feedback.user_comments.map((c) => `- "${c.comment}" (on: ${c.feed_item_title})`).join('\n')}
`

  const outputSchema = z.object({
    updated_master_prompt: z.string(),
    changes_summary: z.string(),
    confidence_score: z.number().min(0).max(1),
  })

  const response = await refinementAgent.generate(feedbackContext, {
    output: outputSchema,
  })

  return response.object as z.infer<typeof outputSchema>
}
