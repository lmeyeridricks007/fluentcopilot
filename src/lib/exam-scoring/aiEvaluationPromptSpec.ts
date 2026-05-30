/**
 * Prompt contract for LLM evaluators — category-first, JSON-only output.
 * Copy into system/user messages; keep in sync with `aiRubricMapper` Zod schemas.
 */

export const SPEAKING_AI_JSON_SCHEMA_REMINDER = `
You must respond with a single JSON object only (no markdown), shape:
{
  "scores": {
    "execution": 0-3 (integer),
    "vocabulary": 0-2,
    "grammar": 0-2,
    "fluency": 0-2,
    "clearness": 0-1,
    "pronunciation": 0-2
  },
  "rationales": { "<categoryKey>": "one short sentence of evidence in English" },
  "certainty": 0-1 optional,
  "internalReasoning": "optional, not shown to user"
}

Rules:
1. Score **execution** first: 0 = does not address the task / unintelligible / off-topic; 1 = partial; 2 = mostly complete; 3 = fully addresses prompt at A2 level.
2. If execution is 0, set **all other scores to 0** (mandatory gating).
3. Be conservative: prefer mid scores when uncertain; do not inflate.
4. Grammar/vocabulary: penalize errors that block understanding more than slips.
5. Pronunciation: from transcript intelligibility only unless audio analysis is provided; if transcript missing, cap pronunciation at 1 unless execution is 0.
6. Clearness: structure and ease of following the answer (0-1).
`.trim()

export const WRITING_AI_JSON_SCHEMA_REMINDER = `
You must respond with a single JSON object only (no markdown), shape:
{
  "scores": {
    "execution": 0-3,
    "grammar": 0-2,
    "spelling": 0-2,
    "clearness": 0-1,
    "vocabulary": 0-2
  },
  "rationales": { "<categoryKey>": "one short sentence of evidence in English" },
  "certainty": 0-1 optional,
  "internalReasoning": "optional"
}

Rules:
1. **execution** first: 0 = task not done / wrong genre / far below length; 1 = partial coverage; 2 = covers main points; 3 = meets prompt + required points at A2.
2. If execution is 0, set **all other scores to 0**.
3. Spelling: minor slips vs pervasive errors affecting reading.
4. Grammar: A2 tolerance — meaning-breaking errors cost more.
5. Vocabulary: range appropriate to task; repetition OK at low scores.
`.trim()
