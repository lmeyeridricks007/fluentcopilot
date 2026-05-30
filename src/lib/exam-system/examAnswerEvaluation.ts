import { z } from 'zod'
import type { ExamLlmAnswerEvaluation, ExamLlmAnswerFit, ExamLevel, ExamTaskAttempt, ExamTaskInstance } from './types'
import {
  examTaskWithFormFillRubricIfNeeded,
  extractWritingFormSlotBodies,
  isPlausibleFormFillSlotContent,
} from './writingExamFillInCompose'
import { isWritingExamGibberish, mcqSubmissionMatchesCorrect, speakingContentSignals } from './scoringEngine'
import { writingAnswerAddressesPrompt } from './writingAnswerPromptFit'
import { writingPromptIsInformalApp } from './writingExamRegister'
import type { ExamTaskType } from './types'

const LlmJsonSchema = z.object({
  fit: z.enum(['yes', 'mostly', 'partial', 'no']),
  confidence01: z.number().min(0).max(1),
  feedbackEn: z.string().min(1).max(900),
  gapsEn: z.array(z.string().max(220)).max(5).optional(),
  /** One short Dutch sentence that would be a strong A2 answer for this item (only when fit is partial or no). */
  exampleGoodNl: z.string().max(220).optional(),
})

function clip(s: string, max: number): string {
  const t = s.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return `${t.slice(0, Math.max(0, max - 1))}…`
}

function wordCount(s: string): number {
  return s.trim() ? s.trim().split(/\s+/).length : 0
}

function writingPromptIsOneSentenceTask(promptNl: string): boolean {
  return /één formele zin|één zin\b|Schrijf één\b/i.test(promptNl)
}

/** Minimum words before prose writing is treated as “too thin” for prompt-fit (apps are short). */
function minWordsForWritingPromptFit(promptNl: string, level: ExamLevel): number {
  if (writingPromptIsInformalApp(promptNl)) return level === 'A1' ? 8 : 10
  if (writingPromptIsOneSentenceTask(promptNl)) return level === 'A1' ? 5 : 7
  if (/weekvergadering|te ziek om veilig|Een klant wacht op een levering/i.test(promptNl)) {
    return level === 'A1' ? 12 : 16
  }
  return level === 'A1' ? 18 : 28
}

function informalAppAnswerLooksOnTopic(answer: string, promptNl: string): boolean {
  const sit = promptNl.match(/melden\s+(.+?)\./is)?.[1]?.toLowerCase() ?? ''
  if (sit && /\bboodschap/i.test(sit)) {
    return /\bboodschap|meeneem|meenem|inkopen\b/i.test(answer)
  }
  if (sit && /\bte laat\b/i.test(sit)) return /\b(laat|later|vertraagd|kom)\b/i.test(answer)
  if (sit && /\bziek\b/i.test(sit)) return /\bziek|niet mee|feest\b/i.test(answer)
  if (sit && /\bfilm\b/i.test(sit)) return /\bfilm|zaterdag|verzet/i.test(answer)
  if (sit && /\bsleutel\b/i.test(sit)) return /\bsleutel|mat\b/i.test(answer)
  if (sit && /\bwerk\b/i.test(sit)) return /\bwerk|weg|eerder\b/i.test(answer)
  return /\b(hoi|hey|dag|ik|je|jou|groet)/i.test(answer)
}

const SPOKEN_OPEN_TASK_TYPES = new Set<ExamTaskType>([
  'practical_request',
  'short_response',
  'roleplay',
  'describe_situation',
  'explain_process',
  'give_opinion',
  'justify_reason',
  'follow_up_response',
  'compare_options',
  'storytelling',
  'sequencing',
  'listening_response_exam',
])

function minWordsForSpeakingFit(taskType: ExamTaskType, level: ExamLevel): number {
  const base = level === 'A1' ? 4 : level === 'A2' ? 6 : 8
  if (taskType === 'follow_up_response') return Math.max(3, base - 2)
  if (taskType === 'short_response' || taskType === 'practical_request') return Math.max(4, base - 1)
  return base
}

function promptExpectsTwoSentences(promptNl: string): boolean {
  return /twee zinnen|één of twee zinnen|1 of 2 zinnen|two sentences/i.test(promptNl)
}

function promptIsFollowUp(promptNl: string): boolean {
  return /zegt:|reageer|wat zeg je|wat antwoord|hoe reageer/i.test(promptNl)
}

function promptIsPracticalRequest(promptNl: string): boolean {
  return /je belt|je spreekt.*aan|wat zeg je|vraag beleefd/i.test(promptNl)
}

function looksLikeKeyboardNoise(answer: string): boolean {
  const t = answer.trim()
  if (t.length < 3) return true
  if (/^(.)\1{4,}$/i.test(t.replace(/\s/g, ''))) return true
  const letters = (t.match(/[a-zà-ÿ]/gi) ?? []).length
  return letters > 0 && letters / t.length < 0.45
}

function deterministicSpeakingAnswerEvaluation(
  task: ExamTaskInstance,
  attempt: ExamTaskAttempt,
  level: ExamLevel,
  base: {
    taskId: string
    taskType: ExamTaskType
    evaluatedAt: string
    source: 'deterministic'
  },
): ExamLlmAnswerEvaluation {
  const answer = attempt.answerText.trim()
  const words = wordCount(answer)
  const minWords = minWordsForSpeakingFit(task.taskType, level)
  const sig = speakingContentSignals(answer, task)
  const gaps: string[] = []

  if (looksLikeKeyboardNoise(answer)) {
    return {
      ...base,
      fit: 'no',
      confidence01: 0.82,
      feedbackEn:
        'The transcript does not look like a real Dutch answer to this speaking prompt — try again with clear sentences.',
      gapsEn: ['Speak (or type) complete Dutch sentences that match what the situation asks for.'],
    }
  }

  const onTopic =
    sig.topicalOverlap >= 1 ||
    sig.empathy ||
    sig.cooperative ||
    sig.acknowledgment ||
    /\b(ik|we|u|je|graag|omdat|daarna|eerst|dan|wil|kan|mag|zou)\b/i.test(answer)

  if (words < Math.max(2, minWords - 2) || !onTopic) {
    const taskHint = promptIsFollowUp(task.promptNl)
      ? 'Acknowledge what the other person said, then add one helpful next step or question.'
      : promptIsPracticalRequest(task.promptNl)
        ? 'Say who you are (briefly), what you need, and use polite forms like “mag ik” or “alstublieft”.'
        : promptExpectsTwoSentences(task.promptNl)
          ? 'Give two short Dutch sentences that directly answer the question in the prompt.'
          : 'Answer the Dutch prompt directly in one or two clear sentences.'
    return {
      ...base,
      fit: 'partial',
      confidence01: 0.74,
      feedbackEn:
        words < 3
          ? 'Your answer is too short to show you understood the situation in the prompt.'
          : 'Your answer is very short or hard to connect to the prompt — add a bit more on-topic Dutch.',
      gapsEn: [taskHint],
    }
  }

  if (promptIsFollowUp(task.promptNl)) {
    const engaged = sig.empathy || sig.cooperative || sig.acknowledgment || sig.hasQuestion
    if (!engaged) {
      gaps.push('React to what they said (e.g. “Wat vervelend” / “Ik snap het”) before giving a solution.')
    }
    if (words < minWords) {
      gaps.push('Add one concrete next step or question (e.g. offer help or ask for details).')
    }
    if (gaps.length) {
      return {
        ...base,
        fit: 'partial',
        confidence01: 0.76,
        feedbackEn:
          'You responded, but a follow-up task usually needs empathy or support plus a clear next step toward solving the situation.',
        gapsEn: gaps,
      }
    }
    return {
      ...base,
      fit: 'yes',
      confidence01: 0.8,
      feedbackEn:
        'You reacted to what the other person said with on-topic Dutch and moved the situation forward — that matches this follow-up task.',
    }
  }

  if (promptExpectsTwoSentences(task.promptNl) && words < minWords) {
    return {
      ...base,
      fit: 'partial',
      confidence01: 0.75,
      feedbackEn:
        'You started to answer the topic, but the prompt asked for about two sentences — add one more short line with a reason or detail.',
      gapsEn: [
        'Use a linker like “omdat”, “daarom”, or “daarna” to connect two ideas.',
        task.trainingExampleNl?.trim()
          ? `Example shape: “${clip(task.trainingExampleNl.trim(), 120)}”`
          : 'Check the sample answer on this report for length and structure.',
      ].filter(Boolean),
    }
  }

  if (promptIsPracticalRequest(task.promptNl) && !sig.cooperative && !/\b(mag|wil|zou|kunt|alstublieft|graag)\b/i.test(answer)) {
    return {
      ...base,
      fit: 'partial',
      confidence01: 0.72,
      feedbackEn:
        'You said something on topic, but a phone or request task usually needs a clear polite ask (what you want and when).',
      gapsEn: ['Open with “Goedendag” and use “ik wil graag …” or “mag ik …”.'],
    }
  }

  if (sig.topicalOverlap === 0 && words < minWords + 2) {
    return {
      ...base,
      fit: 'mostly',
      confidence01: 0.7,
      feedbackEn:
        'Your answer has enough Dutch to count as a real attempt. Tie it more clearly to words or ideas in the prompt (names, places, actions).',
      gapsEn: ['Mention a detail from the question so the examiner hears you understood the situation.'],
    }
  }

  return {
    ...base,
    fit: words >= minWords ? 'yes' : 'mostly',
    confidence01: words >= minWords ? 0.78 : 0.72,
    feedbackEn:
      words >= minWords
        ? 'Your answer addresses the speaking prompt with on-topic Dutch at a length that fits this task.'
        : 'Your answer is on topic and understandable — adding one more short sentence would fully match prompts that ask for two sentences.',
  }
}

function nowIso(): string {
  return new Date().toISOString()
}

/** Rule-based fallback when OpenAI is unavailable or the request fails. */
export function deterministicExamAnswerEvaluation(
  task: ExamTaskInstance,
  attempt: ExamTaskAttempt,
  level: ExamLevel,
): ExamLlmAnswerEvaluation {
  const answer = attempt.answerText.trim()
  const base = {
    taskId: task.id,
    taskType: task.taskType,
    evaluatedAt: nowIso(),
    source: 'deterministic' as const,
  }

  if (task.taskType === 'knowledge_mcq' || task.taskType === 'listening_mcq_exam') {
    if (!answer) {
      return {
        ...base,
        fit: 'no',
        confidence01: 0.92,
        feedbackEn: 'No answer was selected, so this question was not addressed.',
        gapsEn: ['Choose the option(s) that best match the stem before submitting.'],
      }
    }
    const ok = task.mcq && mcqSubmissionMatchesCorrect(task.mcq.correctOptionIds, answer)
    if (ok) {
      return {
        ...base,
        fit: 'yes',
        confidence01: 0.9,
        feedbackEn: 'Your selected option(s) match the keyed answer for this item — you engaged with the question as asked.',
      }
    }
    return {
      ...base,
      fit: 'partial',
      confidence01: 0.72,
      feedbackEn: 'You submitted a choice, but it does not match the best answer for this stem — re-read the scenario and distractors.',
      gapsEn: ['Compare your selection with the correct key shown in the report.'],
    }
  }

  if (!answer) {
    return {
      ...base,
      fit: 'no',
      confidence01: 0.95,
      feedbackEn: 'Nothing was submitted, so the task prompt was not addressed.',
      gapsEn: ['Write or record a response that follows every part of the instructions.'],
    }
  }

  if (task.taskType === 'writing_task_exam') {
    const taskEff = examTaskWithFormFillRubricIfNeeded(task, answer)
    const bullets = taskEff.writingFillInBulletsNl
    if (bullets?.length) {
      const slots = extractWritingFormSlotBodies(answer, bullets)
      const empty = slots.filter((s) => !s.trim()).length
      const gibber = slots.filter((s, i) => {
        const t = s.trim()
        if (!t) return false
        const label = bullets[i] ?? ''
        if (isPlausibleFormFillSlotContent(label, t)) return false
        return isWritingExamGibberish(t)
      }).length
      if (empty === slots.length) {
        return {
          ...base,
          fit: 'no',
          confidence01: 0.9,
          feedbackEn: 'The form-style labels are present but the fields are empty — the question was not completed.',
          gapsEn: bullets.slice(0, 4).map((b) => `Fill “${b}” with Dutch content.`),
        }
      }
      if (gibber > 0 || empty > 0) {
        const library = /\bbibli|pas\b/i.test(bullets.join(' '))
        const exampleNl =
          library && level === 'A2'
            ? 'Ik wil graag boeken lenen om mijn Nederlands te oefenen.'
            : 'Vul elke regel met korte, duidelijke Nederlandse zinnen.'
        return {
          ...base,
          fit: gibber >= Math.ceil(slots.length / 2) ? 'no' : 'partial',
          confidence01: 0.78,
          feedbackEn:
            gibber > 0
              ? 'Several boxes read as nonsense or placeholders rather than meaningful Dutch for what each line asked.'
              : 'Some required lines are still empty or too thin compared with what the form asked for.',
          gapsEn: [
            empty ? `${empty} field(s) still empty.` : '',
            gibber ? `${gibber} field(s) look like random characters, not Dutch answers.` : '',
            `Example (A2 Dutch): “${exampleNl}”`,
          ].filter(Boolean),
        }
      }
      const lastSlot = (slots[slots.length - 1] ?? '').trim()
      const libraryContext = /\bbibli|pas\b/i.test(bullets.join(' '))
      if (level === 'A2' && libraryContext && lastSlot.length >= 6 && !isWritingExamGibberish(lastSlot)) {
        return {
          ...base,
          fit: 'yes',
          confidence01: 0.82,
          feedbackEn:
            'All boxes are filled with understandable Dutch. At A2 a short motivation (for example wanting to read more) is acceptable when it matches the library-card task.',
          gapsEn: [
            'Optional stronger line (not required): “Ik wil graag boeken lenen om mijn Nederlands te oefenen.”',
          ],
        }
      }
      return {
        ...base,
        fit: 'mostly',
        confidence01: 0.72,
        feedbackEn: 'Each line has text that looks like a serious attempt at the form.',
      }
    }

    const words = wordCount(answer)
    const minWords = minWordsForWritingPromptFit(task.promptNl, level)

    if (isWritingExamGibberish(answer) || words < Math.min(6, minWords - 2)) {
      return {
        ...base,
        fit: 'no',
        confidence01: 0.88,
        feedbackEn: 'The submission is far too short or reads as random characters, so it does not seriously address the writing prompt.',
        gapsEn: ['Write real Dutch sentences that cover every bullet in the assignment.'],
      }
    }

    if (!writingAnswerAddressesPrompt(answer, task.promptNl)) {
      const placeholder = /bla\s+bla|^(bla|test|asdf)\b/im.test(answer)
      return {
        ...base,
        fit: 'no',
        confidence01: 0.9,
        feedbackEn: placeholder
          ? 'Your answer does not address this question — it contains filler text (for example “bla bla”) instead of Dutch about the situation in the prompt.'
          : 'Your answer does not address this writing task. The Dutch you wrote is not about the situation, recipient, or request described in the question.',
        gapsEn: [
          'Read the question again and write a new answer: who you write to, what happened or what you need, and a fitting greeting and closing.',
        ],
      }
    }

    if (writingPromptIsInformalApp(task.promptNl)) {
      const onTopic = informalAppAnswerLooksOnTopic(answer, task.promptNl)
      if (onTopic && words >= minWords) {
        return {
          ...base,
          fit: 'yes',
          confidence01: 0.8,
          feedbackEn:
            'Your app message tells your friend what they need to know. Short is fine here — the sample answer is a minimal model, not a longer “required” version.',
          gapsEn: [
            'Check small grammar fixes (e.g. “laten weten”, “ik neem … mee”, “Groetjes,”) in the tips below.',
          ],
        }
      }
      if (onTopic && words >= 8) {
        return {
          ...base,
          fit: 'mostly',
          confidence01: 0.74,
          feedbackEn:
            'You addressed the app task with on-topic Dutch. A short message is expected — focus on clear grammar rather than adding more details.',
          gapsEn: ['Polish verb forms and the closing line; see grammar tips below.'],
        }
      }
      if (!onTopic) {
        return {
          ...base,
          fit: 'no',
          confidence01: 0.85,
          feedbackEn:
            'This app message does not tell your friend what the prompt asked for (for example bringing groceries or being late).',
          gapsEn: ['Write one or two short sentences that match the situation in the question.'],
        }
      }
    }

    if (words < minWords) {
      const thinGaps = writingPromptIsInformalApp(task.promptNl)
        ? [
            'One or two short sentences are enough: say what you want to tell your friend (e.g. that you bring the groceries).',
          ]
        : writingPromptIsOneSentenceTask(task.promptNl)
          ? ['Write one clear Dutch sentence that matches the instruction.']
          : ['Add missing details (who, what, when, why) so every part of the task is covered.']
      return {
        ...base,
        fit: 'partial',
        confidence01: 0.65,
        feedbackEn: writingPromptIsInformalApp(task.promptNl)
          ? 'There is some on-topic Dutch, but the message is still very short or unclear for this app task.'
          : 'There is some on-topic Dutch, but the answer is still thin relative to what the prompt asked for.',
        gapsEn: thinGaps,
      }
    }
    return {
      ...base,
      fit: 'mostly',
      confidence01: 0.62,
      feedbackEn: 'The answer has enough substance to look like a genuine attempt at the prompt — polish grammar and structure next.',
    }
  }

  if (SPOKEN_OPEN_TASK_TYPES.has(task.taskType)) {
    return deterministicSpeakingAnswerEvaluation(task, attempt, level, base)
  }

  if (task.taskType === 'read_aloud_exam') {
    if (wordCount(answer) < 4) {
      return {
        ...base,
        fit: 'no',
        confidence01: 0.85,
        feedbackEn: 'The transcript is too short to reflect the passage you were asked to read aloud.',
      }
    }
    return {
      ...base,
      fit: 'mostly',
      confidence01: 0.55,
      feedbackEn: 'Heuristic check only here: compare your transcript to the target line in the rubric and pronunciation feedback.',
    }
  }

  return {
    ...base,
    fit: wordCount(answer) < 6 ? 'partial' : 'mostly',
    confidence01: 0.58,
    feedbackEn:
      'Built-in check: your answer looks like a serious attempt. For task-specific guidance, use the rubric scores and tips below.',
    gapsEn: ['Enable AI answer review in settings for richer prompt-fit feedback on this item type.'],
  }
}

async function callOpenAiAnswerEvaluation(input: {
  model: string
  apiKey: string
  task: ExamTaskInstance
  attempt: ExamTaskAttempt
  level: ExamLevel
}): Promise<ExamLlmAnswerEvaluation | null> {
  const userPayload = {
    level: input.level,
    taskType: input.task.taskType,
    promptNl: clip(input.task.promptNl, 6000),
    promptEn: clip(input.task.promptEn ?? '', 2000),
    userAnswer: clip(input.attempt.answerText, 8000),
    modelAnswerNl: input.task.trainingExampleNl?.trim()
      ? clip(input.task.trainingExampleNl.trim(), 3000)
      : undefined,
    writingFillInBulletsNl: input.task.writingFillInBulletsNl,
    listeningScriptNl: input.task.listeningScriptNl?.trim()
      ? clip(input.task.listeningScriptNl.trim(), 4000)
      : undefined,
  }

  const system = `You are a fair Dutch Inburgering practice examiner assistant.
Judge ONLY whether the learner's submission **addresses what the exam prompt asked** (task fit, required format, and minimum seriousness).
Do NOT score politeness, perfect grammar, or native-like style — only whether they attempted the right task with meaningful content.

**A2 leniency:** At level A2, accept short, simple Dutch in forms (e.g. a one-sentence motivation like wanting to read more, or a compact address with postcode with or without a space). Do not demand B1 richness.

Rules:
- Empty or whitespace-only => fit "no".
- Keyboard mash, obvious placeholder, or meaningless tokens => fit "no".
- Partially follows instructions or only answers one part of a multi-part prompt => fit "partial".
- Clearly follows the prompt with minor gaps => "mostly".
- Fully satisfies the stated task for this item type => "yes".
Multiple-choice items are not sent to you; if you ever see one, return fit "yes" with low confidence.

When fit is "partial" or "no", set **exampleGoodNl** to one short Dutch sentence that would be a **strong A2-level** answer for the missing or weakest part (not C1 level).

Respond with JSON only: {"fit":"yes"|"mostly"|"partial"|"no","confidence01":0-1,"feedbackEn":"1-2 English sentences","gapsEn":["optional short bullets"],"exampleGoodNl":"optional Dutch example sentence"}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 25_000)
  let res: Response
  try {
    res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: input.model,
        temperature: 0.15,
        max_tokens: 500,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: JSON.stringify(userPayload) },
        ],
      }),
    })
  } finally {
    clearTimeout(timer)
  }

  if (!res.ok) {
    const err = await res.text().catch(() => '')
    console.warn('[examAnswerEvaluation] OpenAI HTTP', res.status, err.slice(0, 200))
    return null
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  const raw = data.choices?.[0]?.message?.content?.trim()
  if (!raw) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(raw) as unknown
  } catch {
    return null
  }
  const r = LlmJsonSchema.safeParse(parsed)
  if (!r.success) return null

  const gaps = [...(r.data.gapsEn?.map((g) => g.trim()).filter(Boolean) ?? [])]
  const exNl = r.data.exampleGoodNl?.trim()
  if (exNl && (r.data.fit === 'partial' || r.data.fit === 'no')) {
    gaps.push(`Example (A2 Dutch): “${exNl}”`)
  }

  return {
    taskId: input.task.id,
    taskType: input.task.taskType,
    fit: r.data.fit as ExamLlmAnswerFit,
    confidence01: r.data.confidence01,
    feedbackEn: r.data.feedbackEn.trim(),
    gapsEn: gaps.length ? gaps.slice(0, 6) : undefined,
    evaluatedAt: nowIso(),
    source: 'openai',
  }
}

/**
 * One-task evaluation: MCQ is always deterministic; open responses use OpenAI when configured.
 */
export async function evaluateExamTaskAnswer(params: {
  task: ExamTaskInstance
  attempt: ExamTaskAttempt
  level: ExamLevel
}): Promise<ExamLlmAnswerEvaluation> {
  const { task, attempt, level } = params

  if (task.taskType === 'knowledge_mcq' || task.taskType === 'listening_mcq_exam') {
    return deterministicExamAnswerEvaluation(task, attempt, level)
  }

  const disabled = process.env.EXAM_ANSWER_EVAL_LLM === '0' || process.env.EXAM_ANSWER_EVAL_LLM === 'false'
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (disabled || !apiKey) {
    return deterministicExamAnswerEvaluation(task, attempt, level)
  }

  const model = process.env.EXAM_ANSWER_EVAL_MODEL?.trim() || 'gpt-4o-mini'

  try {
    const llm = await callOpenAiAnswerEvaluation({ model, apiKey, task, attempt, level })
    if (llm) return llm
  } catch (e) {
    console.warn('[examAnswerEvaluation] OpenAI call failed', e)
  }
  return deterministicExamAnswerEvaluation(task, attempt, level)
}

export async function evaluateAllExamTaskAnswers(session: {
  tasks: ExamTaskInstance[]
  attempts: ExamTaskAttempt[]
  level: ExamLevel
}): Promise<Record<string, ExamLlmAnswerEvaluation>> {
  const latest = new Map<string, ExamTaskAttempt>()
  for (const a of session.attempts) {
    latest.set(a.taskId, a)
  }
  const entries = await Promise.all(
    session.tasks.map(async (task) => {
      const att = latest.get(task.id)
      if (!att) return null
      const evaluation = await evaluateExamTaskAnswer({ task, attempt: att, level: session.level })
      return [task.id, evaluation] as const
    }),
  )
  const out: Record<string, ExamLlmAnswerEvaluation> = {}
  for (const row of entries) {
    if (!row) continue
    out[row[0]] = row[1]
  }
  return out
}
