/**
 * Print AI module-generation prompt (stdout). Does not call an LLM.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.json tools/generate-module.ts
 */
import {
  MODULE_AUTHOR_SYSTEM_PROMPT,
  moduleAuthorUserPrompt,
} from '../src/lib/content-generation/modulePromptTemplates'

const sample = moduleAuthorUserPrompt({
  moduleId: 'a2-m04-health-pharmacy',
  title: 'Health & pharmacy basics',
  band: 'A2.2',
  theme: 'Symptoms, pharmacy requests, simple advice',
  lessonCount: 10,
})

console.log('=== SYSTEM ===\n')
console.log(MODULE_AUTHOR_SYSTEM_PROMPT)
console.log('\n=== USER (example) ===\n')
console.log(sample)
