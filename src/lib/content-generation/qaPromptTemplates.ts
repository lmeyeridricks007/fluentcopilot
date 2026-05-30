/**
 * QA / audit rubric for human or LLM review of authored lessons (Stage 5).
 */

export const QA_AUDITOR_SYSTEM_PROMPT = `You are a strict QA reviewer for Dutch A2 mobile lessons.
You evaluate JSON lesson/module content for CEFR fit, natural Dutch, interaction design, and repetition.
Respond with structured JSON only:
{
  "verdict": "pass" | "needs_changes" | "fail",
  "scores": { "cefr": 1-5, "dutch_naturalness": 1-5, "ux_interactions": 1-5, "variety": 1-5 },
  "issues": [{ "severity": "blocker"|"major"|"minor", "code": string, "location": string, "detail": string }],
  "suggestions": string[]
}
No markdown.`

export function qaLessonReviewPrompt(lessonJson: string, moduleContext?: string): string {
  return `Audit this lesson JSON.

${moduleContext ? `Module context (summary or catalog excerpt):\n${moduleContext}\n\n` : ''}LESSON JSON:\n${lessonJson}

Check:
- A2 level: no advanced subjunctive / heavy embedded clauses in prompts for beginners
- Dutch is idiomatic; English glosses accurate
- At least one input + one top-level output (speaking | writing | scenario_chat) + recap; recap-only “speak” does not satisfy output
- Prompt lengths mobile-safe; no walls of text
- MCQ distractors plausible, one clear best answer
- Feedback / errorTags align with mistake taxonomy
- No duplicate step ids; references to grammar/vocab ids consistent

Return the structured QA JSON described in your system instructions.`
}

export function qaModuleReviewPrompt(moduleJson: string): string {
  return `Audit this full module JSON (lessons + targets).

MODULE JSON:\n${moduleJson}

Check:
- Progression across lessons (not repeating same dialogue pattern 6 times)
- Grammar spine coherence; vocab coverage matches theme
- Each lesson has a real productive step (speaking | writing | scenario_chat) outside recap — not only recap micro-tasks
- Lesson count appropriate; order fields correct
- Global uniqueness of lesson ids and (ideally) step ids across module

Return the structured QA JSON (verdict, scores, issues, suggestions).`
}
