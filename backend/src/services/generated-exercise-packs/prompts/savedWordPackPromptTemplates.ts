/**
 * Prompt templates for LLM-generated saved-word interactive mini-packs.
 * Tone: concise, real-life Dutch, no textbook filler.
 */

import type { ExercisePackLevel } from '../../../domain/generatedExercisePack/generatedExercisePackTypes'

/** System role + global rules. */
export const SAVED_WORD_PACK_SYSTEM = `You are the content engine for FluentCopilot, a Dutch learning app for adults.
You output ONE JSON object only (no markdown fences, no commentary).

Rules:
- Explanations in simple English; Dutch must be natural, level-appropriate (lean A2–B1 unless told otherwise).
- Real-life first: cafés, trains, messages, colleagues, shops — not fairy tales.
- Keep strings concise: titles ≤ 80 chars, bullet-style lines short.
- MCQ: exactly 4 options per question, exactly ONE option with isCorrect: true. Labels in English for meaning questions; Dutch lines for usage questions.
- Never invent URLs for audio; set referenceAudioUrl to null (the app uses device TTS).
- scenario_jumpoff: use scenarioId as a slug like "train-station", "supermarket-shop", "cafe-chat". ctaLabel ≤ 60 chars. reason one sentence.
- read_aloud_rep: textNl should be 1–3 short Dutch lines including the target word; readAloudHref must be "/app/talk/read-aloud?readAloudProfile=" + URI-encoded profile (use profile "saved-word:" + lowercase Dutch lemma).
- Blocks array order = learner journey order. Total blocks MUST be between 4 and 7 inclusive.
- Include these block types in order when possible:
  1) explanation_card
  2) multiple_choice_meaning
  3) hear_and_repeat
  4) multiple_choice_usage OR choose_best_phrase (pick one type)
  5) build_a_sentence OR write_your_own_line (pick one; prefer write_your_own_line for production-style output)
  6) say_it_aloud OR record_and_compare (pick one)
  7) scenario_jumpoff (optional fourth link-style beat — if you already have 7 blocks, include it; if at 7 blocks without it, swap step 6 for a lighter say_it_aloud and keep scenario_jumpoff)
- Each block object shape:
  { "type": "<ExerciseBlockType>", "title"?: string, "subtitle"?: string, "instruction"?: string, "skillTags": string[], "estimatedSeconds": number, "config": { ... } }
- Do NOT include "id", "sourceCaptureIds", "completionState", or "result" — the server adds those.
- explanation_card.config: { "dutch", "englishMeaning", "shortUsageNote"?, "exampleLines": [{ "dutch", "english"? }] } with 2–4 example lines.
- multiple_choice_meaning.config: { "prompt", "options": [{ "id","label","isCorrect" }], "correctExplanation" }
- hear_and_repeat.config: { "targetText", "referenceAudioUrl": null, "hint"?, "repeatCount": 2 }
- multiple_choice_usage / choose_best_phrase: same option shape; Dutch options for usage.
- build_a_sentence.config: { "prompt", "requiredWords": string[] (must include the lemma), "suggestedAnswer"?, "evaluationMode": "rule_based" }
- write_your_own_line.config: { "prompt", "targetWordOrPhrase", "evaluationMode": "llm", "feedbackStyle": "light", "minChars": 8 }
- say_it_aloud.config: { "instruction", "targetNl" }
- record_and_compare.config: { "instruction", "targetNl", "maxRecordingSeconds": 22 }
- scenario_jumpoff.config: { "scenarioId", "ctaLabel", "reason", "href"?: string } — href may be "/app/talk" or "/app/talk/language-coach?focus=" + encoded short English focus.
`

/** Extra system lines when the lemma is "gezellig" (cultural load, not dictionary-only). */
export const GEZELLIG_SPECIAL_APPENDIX = `
Special case — lemma is "gezellig":
- Stress vibe and social warmth: people, evenings, places, "het was gezellig" — not "efficient" or "strictly polite".
- Give at least 3 example lines that sound like real Dutch chat (short).
- Usage MC distractors should be plausible mistakes learners make (too formal, wrong register, or calques from English), not nonsense Dutch.
- Keep explanations in simple English but capture nuance: cosiness + company, not only "cosy room".
`

export const SAVED_WORD_PACK_JSON_CONTRACT = `
Return JSON with this top-level shape:
{
  "title": string,
  "subtitle": string,
  "theme": string,
  "estimatedMinutes": number,
  "xpPotential": number,
  "blocks": [ /* 4 to 7 block objects as specified */ ]
}
`

export function buildSavedWordPackUserMessage(input: {
  word: string
  level: ExercisePackLevel
  meaningHint: string | null
  usageHint: string | null
  exampleLinesNl: string[]
  captureContext: string | null
}): string {
  const lines = input.exampleLinesNl.length ? input.exampleLinesNl.join('\n') : '(none)'
  return [
    SAVED_WORD_PACK_JSON_CONTRACT.trim(),
    '',
    `Target Dutch lemma: "${input.word.trim()}"`,
    `Learner level hint: ${input.level}`,
    input.meaningHint ? `Prior meaning guess (may refine): ${input.meaningHint}` : 'No prior meaning guess.',
    input.usageHint ? `Prior context note: ${input.usageHint}` : 'No prior context note.',
    `Seed example lines (reuse or improve; keep Dutch natural):\n${lines}`,
    input.captureContext ? `Where the learner saw/heard it: ${input.captureContext}` : '',
    '',
    'Generate the pack JSON now.',
  ]
    .filter(Boolean)
    .join('\n')
}
