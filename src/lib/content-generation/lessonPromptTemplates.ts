/**
 * LLM prompts for authoring a single Dutch A2 lesson as JSON (Stage 5).
 * Paste into Cursor / your provider; output must pass `lessonSchema` + `contentValidator`.
 */
import {
  MAX_STEP_PROMPT_CHARS,
  MAX_MCQ_QUESTION_CHARS,
  LESSON_DURATION_MIN,
  LESSON_DURATION_MAX,
  CONTENT_FORMAT_VERSION,
} from '@/lib/content-generation/contentRules'

export const LESSON_AUTHOR_SYSTEM_PROMPT = `You are a senior Dutch-as-foreign-language author for CEFR A2 learners.
You output ONLY valid JSON — no markdown fences, no commentary.
The JSON must conform to the provided Zod lesson schema: id, moduleId, title, lessonType, order, cefrLevel, durationEstimate, grammarTargets[], vocabTargets[], canDoStatements[], steps[], reviewItemRefs[], mistakeFocus[], metadata.
Every step MUST include: id, type (discriminated), and where applicable interactionConfig + feedbackConfig + content.
Use practical spoken Dutch; short mobile-friendly strings; avoid long grammar essays in prompts.
Target audience: English-speaking adults learning Dutch for daily life.`

export function lessonAuthorUserPrompt(input: {
  moduleTitle: string
  moduleId: string
  band: string
  lessonOrder: number
  lessonTitleHint: string
  grammarTargetIds: string[]
  vocabTargetIds: string[]
  learningGoal: string
  priorLessonSummaries?: string[]
}): string {
  return `Author ONE lesson JSON for module "${input.moduleTitle}" (${input.moduleId}), band ${input.band}.

Constraints:
- contentFormatVersion: ${CONTENT_FORMAT_VERSION}
- cefrLevel: "A2"
- lessonType: one of input | pattern | practice | speaking | writing | task | review | checkpoint (use checkpoint only for short band/module milestone lessons placed between clusters on the path)
- order: ${input.lessonOrder}
- durationEstimate: between ${LESSON_DURATION_MIN} and ${LESSON_DURATION_MAX} minutes
- grammarTargets (ids only): ${JSON.stringify(input.grammarTargetIds)}
- vocabTargets (ids only): ${JSON.stringify(input.vocabTargetIds)}
- canDoStatements: 1–3 short EN strings (learner-facing)
- steps: include at least one receptive step (listening | mcq | reorder | fill_blank | discovery | listen_read), one productive step as its own step with type speaking | writing | scenario_chat (recap mini-tasks do NOT count), and a final recap step (type recap).
- Step prompts ≤ ${MAX_STEP_PROMPT_CHARS} chars; MCQ stems ≤ ${MAX_MCQ_QUESTION_CHARS} chars.
- Provide feedbackConfig on interactive steps (hint / incorrectFeedback / errorTags where useful).
- reviewItemRefs: leave [] (pipeline fills) OR list stable ids rev-{lessonId}-vt-* / rev-{lessonId}-gt-* if you know them.
- mistakeFocus: optional array of taxonomy tags e.g. word-order, vocab, register.

Lesson focus: ${input.lessonTitleHint}
Module learning context: ${input.learningGoal}
${input.priorLessonSummaries?.length ? `Prior lessons in module:\n- ${input.priorLessonSummaries.join('\n- ')}` : ''}

Return a single JSON object matching the lesson schema.`
}

export const LESSON_JSON_SHAPE_REMINDER = `Required top-level keys:
id, moduleId, title, lessonType, order, cefrLevel, durationEstimate, grammarTargets, vocabTargets, canDoStatements, steps, metadata
Optional: reviewItemRefs, mistakeFocus

Step types union: preview | listening | listen_read | discovery | grammar_card | mcq | reorder | fill_blank | speaking | writing | scenario_chat | recap`
