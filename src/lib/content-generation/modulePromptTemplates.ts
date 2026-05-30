/**
 * Prompts for generating a full A2 module (10–12 lessons) with consistent progression.
 */
import {
  MODULE_LESSON_TARGET_MIN,
  MODULE_LESSON_TARGET_MAX,
  CONTENT_FORMAT_VERSION,
} from '@/lib/content-generation/contentRules'

export const MODULE_AUTHOR_SYSTEM_PROMPT = `You are a curriculum lead for Dutch CEFR A2.
You design a MODULE as JSON matching the module schema: id, title, band (A2.1 | A2.2 | A2.3), description, order, learningGoals[], grammarTargets[] (full objects), vocabTargets[] (full objects), lessons[] (full lesson objects), metadata.
Output ONLY JSON, no prose.
Lessons must reference grammarTargets/vocabTargets by id only inside each lesson.
Avoid repeating the same step pattern across consecutive lessons; vary listening / speaking / micro-output.
Each lesson must satisfy mobile session length, include at least one top-level productive step (speaking | writing | scenario_chat) — recap-only production does not count — and end with recap.`

export function moduleAuthorUserPrompt(input: {
  moduleId: string
  title: string
  band: 'A2.1' | 'A2.2' | 'A2.3'
  theme: string
  lessonCount?: number
}): string {
  const n = input.lessonCount ?? MODULE_LESSON_TARGET_MIN
  return `Generate a Dutch A2 module JSON.

Module id: ${input.moduleId}
Title: ${input.title}
Band: ${input.band}
Theme: ${input.theme}
contentFormatVersion: ${CONTENT_FORMAT_VERSION}

Requirements:
- ${MODULE_LESSON_TARGET_MIN}–${MODULE_LESSON_TARGET_MAX} lessons; you MUST output exactly ${n} lessons for this run.
- Unique lesson ids (kebab-case) and step ids per lesson.
- Rich grammarTargets (3–5) and vocabTargets (18–36) appropriate to theme.
- learningGoals: 2–4 short EN outcomes.
- Lesson order 0..n-1; progressive difficulty within A2.
- Every lesson: canDoStatements, steps with discriminated types, metadata.

Return one JSON object parseable by moduleSchema.`
}
