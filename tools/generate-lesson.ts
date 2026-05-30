/**
 * Print AI lesson-generation prompts (stdout). Does not call an LLM.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.json tools/generate-lesson.ts
 */
import {
  LESSON_AUTHOR_SYSTEM_PROMPT,
  lessonAuthorUserPrompt,
  LESSON_JSON_SHAPE_REMINDER,
} from '../src/lib/content-generation/lessonPromptTemplates'

const sample = lessonAuthorUserPrompt({
  moduleTitle: 'People & daily rhythm',
  moduleId: 'a2-m01-people-daily',
  band: 'A2.1',
  lessonOrder: 3,
  lessonTitleHint: 'Talking about weekend plans in Dutch (still A2).',
  grammarTargetIds: ['a2.1-present-tense'],
  vocabTargetIds: ['lemma-vandaag', 'lemma-morgen', 'lemma-gaan'],
  learningGoal: 'Learners can swap one-line plans for the weekend.',
  priorLessonSummaries: ['Greetings and “how are you”', 'Time-of-day greetings'],
})

console.log('=== SYSTEM ===\n')
console.log(LESSON_AUTHOR_SYSTEM_PROMPT)
console.log('\n=== USER (example) ===\n')
console.log(sample)
console.log('\n=== SHAPE REMINDER ===\n')
console.log(LESSON_JSON_SHAPE_REMINDER)
