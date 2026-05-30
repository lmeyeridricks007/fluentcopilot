import {
  effectiveWritingFormBullets,
  extractWritingFormSlotBodies,
  formFillAnswerUsesSeparatedFields,
  formFillLayoutScore01,
  isPlausibleFormFillSlotContent,
  writingExamTaskLooksFormFill,
} from './writingExamFillInCompose'
import { CANONICAL_TASK_OVERLAYS } from './examScoringOverlays'
import { applyVoiceBlendToHeuristicScores } from './examVoiceScoring'
import type {
  ExamLevel,
  ExamRunMode,
  ExamScoringBlueprint,
  ExamScoringDimension,
  ExamTaskAttempt,
  ExamTaskInstance,
  ExamTaskType,
  ExamVoiceAssessmentSnapshot,
} from './types'

/** Comma-separated option ids (order-free); duplicates removed. */
export function parseMcqSubmissionIds(answerText: string): string[] {
  const parts = answerText
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return [...new Set(parts)].sort()
}

export function mcqSubmissionMatchesCorrect(correctOptionIds: string[], answerText: string): boolean {
  if (!correctOptionIds.length) return false
  const correct = [...new Set(correctOptionIds)].sort()
  const picked = parseMcqSubmissionIds(answerText)
  if (picked.length !== correct.length) return false
  return picked.every((v, i) => v === correct[i])
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(1, n))
}

/** Simulation: stricter exam-like shrink of heuristic (higher blueprint.strictnessSimulation => stricter). */
function simulationScale(blueprint: ExamScoringBlueprint, level: ExamLevel): number {
  const t = Math.max(0.85, blueprint.strictnessSimulation)
  const levelTight = level === 'B1' ? 0.9 : level === 'A1' ? 0.96 : 0.93
  return clamp01((0.91 / t) * levelTight)
}

/** Training: formative lift vs same heuristic (leniencyTraining >=1 rewards practice). */
function trainingScale(blueprint: ExamScoringBlueprint, level: ExamLevel, retriesUsed: number): number {
  const len = Math.max(0.95, blueprint.leniencyTraining)
  const levelEase = level === 'A1' ? 1.04 : level === 'B1' ? 0.98 : 1.02
  const retryBump = 1 + Math.min(3, retriesUsed) * 0.035
  return clamp01(0.86 * len * levelEase * retryBump)
}

/** Lightweight proxy features — avoids ML; stable for tests. */
function answerFeatures(answer: string): { words: number; hasQuestion: boolean; avgWordLen: number } {
  const trimmed = answer.trim()
  const words = trimmed ? trimmed.split(/\s+/).length : 0
  const letters = trimmed.replace(/\s+/g, '')
  const avgWordLen = words > 0 ? letters.length / words : 0
  return { words, hasQuestion: /\?/.test(trimmed), avgWordLen }
}

function lettersOnlyToken(tok: string): string {
  return tok.replace(/[^a-zA-Z]/g, '')
}

/** Count Latin vowels plus Dutch "ij". */
function vowelUnitsInLetters(s: string): number {
  const lower = s.toLowerCase()
  let n = 0
  for (let i = 0; i < lower.length; i += 1) {
    const c = lower[i]!
    if ('aeiouy'.includes(c)) {
      n += 1
      continue
    }
    if (c === 'i' && lower[i + 1] === 'j') {
      n += 1
      i += 1
    }
  }
  return n
}

/**
 * Keyboard mash / empty / non-words — should not score like a partial attempt.
 * Exported for form-fill report feedback (field-level tips).
 */
export function isWritingExamGibberish(answer: string): boolean {
  const t = answer.trim()
  if (!t) return true
  const tokens = t.split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return true

  const allLetters = tokens.map(lettersOnlyToken).join('')
  if (allLetters.length === 0) return true

  if (tokens.length === 1) {
    const w = lettersOnlyToken(tokens[0]!)
    if (w.length <= 1) return true
    if (/^(.)\1+$/i.test(w)) return true
    if (vowelUnitsInLetters(w) === 0 && w.length <= 10) return true
  }

  if (tokens.length <= 3) {
    const joined = tokens.map(lettersOnlyToken).join('')
    if (joined.length >= 2 && vowelUnitsInLetters(joined) === 0) return true
  }

  return false
}

type WritingExamAttemptTier = 'gibberish' | 'too_short' | 'thin' | 'normal'

function writingExamAttemptTier(answer: string, words: number): WritingExamAttemptTier {
  if (isWritingExamGibberish(answer)) return 'gibberish'
  if (words < 5) return 'too_short'
  if (words < 14) return 'thin'
  return 'normal'
}

function isWritingExamFormFillTask(task?: ExamTaskInstance, answer?: string): boolean {
  if (task?.taskType !== 'writing_task_exam') return false
  return writingExamTaskLooksFormFill(task, answer) && effectiveWritingFormBullets(task, answer ?? '').length > 0
}

/** Tier from prose fields only — policy numbers / codes must not mark the whole form as gibberish. */
function formFillAnswerTierForScoring(
  slots: string[],
  bullets: string[],
): WritingExamAttemptTier {
  const prose = slots
    .map((s, i) => ({ s: s.trim(), label: bullets[i] ?? '' }))
    .filter(({ s, label }) => s.length > 0 && !isPlausibleFormFillSlotContent(label, s))
    .map(({ s }) => s)
    .join(' ')
  const words = prose.split(/\s+/).filter(Boolean).length
  if (!prose.length && slots.some((s) => s.trim().length > 0)) return 'normal'
  return writingExamAttemptTier(prose, words)
}

function applyWritingExamTierToScore(raw: number, dim: ExamScoringDimension, tier: WritingExamAttemptTier): number {
  if (tier === 'normal') return clamp01(raw)
  if (tier === 'thin') {
    const cap =
      dim === 'task_completion'
        ? 0.62
        : dim === 'natural_wording' || dim === 'grammar_control'
          ? 0.72
          : 0.78
    return clamp01(Math.min(raw * (dim === 'task_completion' ? 0.82 : 0.9), cap))
  }
  if (tier === 'too_short') {
    const cap =
      dim === 'task_completion'
        ? 0.26
        : dim === 'natural_wording' || dim === 'grammar_control'
          ? 0.34
          : dim === 'structure'
            ? 0.32
            : 0.3
    return clamp01(Math.min(raw * (dim === 'task_completion' ? 0.38 : 0.52), cap))
  }
  /* gibberish — caps are absolute */
  const g: Partial<Record<ExamScoringDimension, number>> = {
    task_completion: 0.1,
    natural_wording: 0.12,
    grammar_control: 0.12,
    structure: 0.1,
    politeness: 0.12,
  }
  return clamp01(Math.min(raw * 0.25, g[dim] ?? 0.12))
}

/**
 * Heuristics for `writing_task_exam`: functional adequacy first, everyday wording,
 * basic grammar (present + simple perfect cues), structure, and greeting/closing (formality).
 * Form-fill (`form_fill` / invulbullets): fields complete, layout, plausibility — not mail politeness.
 */
function writingExamHeuristicScore(
  dim: ExamScoringDimension,
  answer: string,
  level: ExamLevel,
  task?: ExamTaskInstance,
): number | undefined {
  const bullets = task ? effectiveWritingFormBullets(task, answer) : []
  if (isWritingExamFormFillTask(task, answer) && bullets.length) {
    const slots = extractWritingFormSlotBodies(answer, bullets)
    const nonempty = slots.filter((s) => s.trim().length > 0).length
    const substantive = slots.filter((s, i) => {
      const t = s.trim()
      if (t.length < 2) return false
      const label = bullets[i] ?? ''
      if (isPlausibleFormFillSlotContent(label, t)) return true
      return !isWritingExamGibberish(t)
    }).length
    const n = bullets.length
    const fillRatio = n ? nonempty / n : 0
    const qualRatio = n ? substantive / n : 0
    const { words } = answerFeatures(answer)
    const tier = formFillAnswerTierForScoring(slots, bullets)
    const separated = formFillAnswerUsesSeparatedFields(answer, bullets)
    const labelled = bullets.filter((b) => answer.includes(`${b}:`)).length

    switch (dim) {
      case 'task_completion':
        return applyWritingExamTierToScore(
          clamp01(0.18 + 0.58 * qualRatio + 0.12 * Math.min(1, words / 42)),
          dim,
          tier,
        )
      case 'completeness':
        return applyWritingExamTierToScore(clamp01(0.14 + 0.78 * fillRatio), dim, tier)
      case 'structure': {
        const layoutFloor = formFillLayoutScore01(answer, bullets)
        if (layoutFloor != null) {
          return layoutFloor
        }
        if (separated) {
          return applyWritingExamTierToScore(
            clamp01(0.76 + 0.14 * fillRatio + 0.1 * qualRatio),
            dim,
            tier,
          )
        }
        return applyWritingExamTierToScore(
          clamp01(0.22 + 0.52 * (labelled / Math.max(1, n)) + (/\n/.test(answer) ? 0.14 : 0)),
          dim,
          tier,
        )
      }
      case 'grammar_control': {
        let g = 0.22
        for (let si = 0; si < slots.length; si += 1) {
          const s = slots[si] ?? ''
          const label = bullets[si] ?? ''
          const w = s.trim().split(/\s+/).filter(Boolean).length
          if (w === 0) continue
          if (isPlausibleFormFillSlotContent(label, s)) {
            g += 0.14
            continue
          }
          const st = writingExamAttemptTier(s, w)
          if (st === 'gibberish') g += 0.03
          else g += 0.1 + Math.min(0.12, w / 28)
        }
        return applyWritingExamTierToScore(clamp01(g), dim, tier)
      }
      case 'relevance': {
        const joined = slots.join(' ').toLowerCase()
        const lastRaw = slots[slots.length - 1] ?? ''
        const last = lastRaw.toLowerCase()
        let r = 0.28 + 0.32 * qualRatio
        if (/\b\d{4}\s*[a-z]{2}\b|\b\d{4}[a-z]{2}\b/i.test(answer)) r += 0.1
        if (/\b(straat|laan|weg|plein|hof|dreef|dijk|kade|singel)\b/i.test(joined)) r += 0.08
        // Topic + intent cues (A2): "Ik wil graag meer lezen" should count — \blees\b alone misses "lezen".
        const topicCue =
          /\b(bibli|boek|boeken|lees|lezen|leest|lenen|stud|studie|taal|cursus|inburg|oefen|kinder|pas\b|uitleen|romans)\b/i.test(
            last,
          ) ||
          /\b(bibli|boek|boeken|lees|lezen|lenen|stud|studie|taal|cursus|inburg|oefen|kinder|pas\b)\b/i.test(joined)
        const intentCue =
          /\b(ik wil|ik zou|ik mag|omdat|want|daarom|graag|meer|weer|helpen|leren|Nederlands|oefenen)\b/i.test(last)
        if (topicCue) r += 0.16
        else if (intentCue && lastRaw.trim().length >= 10) r += 0.12
        const firstTok = lettersOnlyToken(last.split(/\s+/).find(Boolean) ?? '')
        if (last.trim() && vowelUnitsInLetters(firstTok) === 0) r -= 0.2
        if (level === 'A2' && qualRatio >= 1 && !isWritingExamGibberish(lastRaw)) r += 0.07
        return applyWritingExamTierToScore(clamp01(r), dim, tier)
      }
      default:
        return undefined
    }
  }

  const { words, hasQuestion, avgWordLen } = answerFeatures(answer)
  const tier = writingExamAttemptTier(answer, words)

  switch (dim) {
    case 'task_completion': {
      if (tier === 'gibberish') return 0.08
      const minFloor = level === 'A1' ? 4 : level === 'A2' ? 6 : 8
      const stretch = level === 'A1' ? 22 : level === 'A2' ? 34 : 30
      const lenBoost = clamp01((words - minFloor) / stretch)
      const base = words >= minFloor ? 0.52 + lenBoost * 0.42 : 0.18 + lenBoost * 0.22
      const structured =
        /\n/.test(answer) || /(?:^|\n)\s*[-*•]/.test(answer) || /:\s*\S/m.test(answer) ? 0.06 : 0
      return applyWritingExamTierToScore(clamp01(base + structured), dim, tier)
    }
    case 'natural_wording': {
      if (tier === 'gibberish') return 0.08
      const tokens = answer.trim().split(/\s+/).filter(Boolean)
      const freakLong = tokens.filter((t) => t.replace(/[^a-zA-Z]/g, '').length > 16).length
      const lenOk = avgWordLen >= 3.2 && avgWordLen <= 9.5 ? 0.14 : avgWordLen > 11 ? -0.06 : 0.04
      const punct = /[.!?]/.test(answer) ? 0.05 : 0
      const q = hasQuestion ? 0.04 : 0
      const vowelPoor =
        tokens.length > 0 && tokens.every((tok) => vowelUnitsInLetters(lettersOnlyToken(tok)) === 0) ? -0.18 : 0
      const raw = clamp01(
        0.42 + Math.min(0.22, words / 50) + lenOk + punct + q - Math.min(0.22, freakLong * 0.08) + vowelPoor,
      )
      return applyWritingExamTierToScore(raw, dim, tier)
    }
    case 'grammar_control': {
      if (tier === 'gibberish') return 0.09
      let g = 0.38 + Math.min(0.2, words / 55)
      if (/\b(ik|jij|je|u|wij|we|hij|zij|ze)\s+\S+/i.test(answer)) g += 0.14
      if (/\b(werk|woon|ga|kom|ben|heb|eet|wil|moet|kan|mag)\w*\b/i.test(answer)) g += 0.08
      const perfectCue =
        /\b(ben|bent|is|zijn|heb|hebt|heeft|hebben)\s+[a-zA-Z]{3,}(?:ge[a-z]{2,}|[a-z]+t)\b/i.test(answer) ||
        /\b[a-z]{3,}ge(?:daan|had|zegd|kocht|werkt|woond)\w*\b/i.test(answer) ||
        /\b(ge(?:weest|had|daan|zegd|kocht|werkt|woond))\b/i.test(answer)
      if (perfectCue) g += 0.12
      if (words < 4 && !/\b(ik|je|u)\b/i.test(answer)) g -= 0.12
      return applyWritingExamTierToScore(clamp01(g), dim, tier)
    }
    case 'structure': {
      if (tier === 'gibberish') return 0.07
      const lines = answer.split(/\n/).filter((l) => l.trim().length > 0).length
      const sentences = (answer.match(/[.!?]+/g) ?? []).length
      let s = 0.36 + Math.min(0.16, lines * 0.045) + Math.min(0.2, sentences * 0.07)
      if (/\b(maar|want|omdat|dus|en|eerst|daarna|tot slot)\b/i.test(answer)) s += 0.1
      if (words < 5 && sentences === 0) s -= 0.1
      return applyWritingExamTierToScore(clamp01(s), dim, tier)
    }
    case 'politeness': {
      if (tier === 'gibberish') return 0.06
      const register =
        task?.writingExamStratum === 'informal_social' || /app-bericht/i.test(task?.promptNl ?? '')
          ? 'informal_app'
          : task?.writingExamStratum === 'formal_email' || /Situatie \(wonen\)|Je richt je tot/i.test(task?.promptNl ?? '')
            ? 'formal_mail'
            : 'general'

      if (register === 'informal_app') {
        const greeting = /\b(hoi|hey|hallo|dag)\b/i.test(answer)
        const namedHi = /\bhoi\s+[A-ZÀ-ÿ]/i.test(answer)
        const closing = /\b(groetjes|groeten|groete|doei|xx)\b/i.test(answer)
        let p = words <= 4 ? 0.28 : 0.42
        if (greeting) p += namedHi ? 0.28 : 0.22
        if (closing) p += /\bgroetjes|groeten\b/i.test(answer) ? 0.26 : 0.18
        if (/\bgeachte\b/i.test(answer)) p -= 0.22
        if (/\bmet vriendelijke groet\b/i.test(answer) && !/\bgeachte\b/i.test(answer)) p -= 0.08
        return applyWritingExamTierToScore(clamp01(p), dim, tier)
      }

      const greeting =
        /\b(geachte|beste|goedemorgen|goedemiddag|goedenavond|hoi|hallo)\b/i.test(answer)
      const closing =
        /\b(hoogachtend|met vriendelijke groet|groeten|groetjes|vriendelijke groet|tot ziens|bedankt|dank je|dank u)\b/i.test(
          answer,
        )
      const courtesy = /(alstublieft|alsjeblieft|mag ik|kunt u|graag|zou u)/i.test(answer)
      const base = words <= 2 ? 0.12 : words <= 5 ? 0.22 : 0.38
      let p = base
      if (greeting) p += 0.24
      if (closing) p += 0.22
      if (courtesy) p += 0.1
      const mismatch = /\bgeachte\b/i.test(answer) && /\b(hoi|groetjes)\b/i.test(answer) ? -0.08 : 0
      return applyWritingExamTierToScore(clamp01(p + mismatch), dim, tier)
    }
    default:
      return undefined
  }
}

/**
 * Reactive speaking tasks (`Spreekreacties`, "ask the bakery", etc.) naturally produce one calm
 * Dutch sentence of 4–8 words — penalising those at the same word floor as a roleplay or opinion
 * monologue produced 41–47% scores for objectively correct replies. Lower the floor for these.
 */
function minWordsForSpeakingTaskType(taskType: ExamTaskType, level: ExamLevel): number {
  const base = level === 'A1' ? 4 : level === 'A2' ? 6 : 8
  if (taskType === 'follow_up_response') return Math.max(3, base - 2)
  if (taskType === 'short_response' || taskType === 'practical_request') return Math.max(4, base - 1)
  return base
}

/**
 * Recognise that a short reply was a real, engaged answer — not just letters on a page.
 * `cooperative` catches the canonical Dutch proposal phrases used in `follow_up_response`
 * (e.g. "Zullen wij de trappen nemen?"). `empathy` catches reassuring replies for the same.
 * `topicalOverlap` counts content tokens (≥4 letters) shared with the prompt.
 */
export function speakingContentSignals(
  answer: string,
  task: ExamTaskInstance | undefined,
): {
  hasQuestion: boolean
  cooperative: boolean
  empathy: boolean
  acknowledgment: boolean
  topicalOverlap: number
} {
  const a = answer.toLowerCase()
  const hasQuestion = /\?/.test(a)
  const cooperative = /\b(zullen we|zullen wij|zal ik|laten we|kun je|kunt u|kunnen we|wil je|wilt u|mag ik|ik kan|ik help)\b/.test(a)
  const empathy = /\b(vervelend|naar voor|sorry|jammer|wat erg|geen probleem|begrip|begrijp|snap|niet erg|gelukkig)\b/.test(a)
  const acknowledgment = /^(ja|natuurlijk|tuurlijk|oké|ok|prima|zeker|akkoord)\b/.test(a)
  let topicalOverlap = 0
  if (task?.promptNl) {
    const STOP = new Set([
      'maar','want','dat','omdat','dus','niet','heel','heeft','hebt','hebben','wordt','worden','zijn','waren','meer',
      'ook','nog','door','voor','naar','over','onze','onze','jouw','mijn','deze','deze','deze','iets','soms',
    ])
    const promptTokens = new Set(
      a
        .replace(/[^a-zà-ÿ\s]/gi, ' ')
        .split(/\s+/)
        .filter((t) => t.length >= 4 && !STOP.has(t)),
    )
    if (promptTokens.size > 0) {
      const promptLower = task.promptNl.toLowerCase()
      for (const tok of promptTokens) {
        if (promptLower.includes(tok)) topicalOverlap += 1
        if (topicalOverlap >= 3) break
      }
    }
  }
  return { hasQuestion, cooperative, empathy, acknowledgment, topicalOverlap }
}

function heuristicDimensionScore(
  dim: ExamScoringDimension,
  taskType: ExamTaskType,
  answer: string,
  level: ExamLevel,
  task?: ExamTaskInstance,
): number {
  if (taskType === 'writing_task_exam') {
    const specialized = writingExamHeuristicScore(dim, answer, level, task)
    if (specialized !== undefined) return specialized
  }

  const { words, hasQuestion, avgWordLen } = answerFeatures(answer)
  const minWords = minWordsForSpeakingTaskType(taskType, level)
  /**
   * Softer ramp: at exactly `minWords` we now sit at ~0.29 instead of ~0.07. That gives a fair
   * baseline for a one-sentence reply that fully meets the task, while still rewarding longer
   * replies. We also lift very long answers via a small saturation bump up to ~+0.1.
   */
  const softLength = clamp01((words - minWords + 4) / 14)

  const sig = speakingContentSignals(answer, task)
  /** Bonus pool for short reactive speaking tasks — caps each dimension's content lift so it can't dominate. */
  const isReactive =
    taskType === 'follow_up_response' || taskType === 'short_response' || taskType === 'practical_request'
  const reactiveSig = isReactive
    ? {
        responsiveness:
          (sig.hasQuestion ? 0.08 : 0) +
          (sig.cooperative ? 0.1 : 0) +
          (sig.empathy ? 0.08 : 0) +
          (sig.acknowledgment ? 0.04 : 0),
        continuation: (sig.hasQuestion ? 0.06 : 0) + (sig.cooperative ? 0.08 : 0),
        relevance: Math.min(0.18, sig.topicalOverlap * 0.06) + (sig.cooperative ? 0.04 : 0),
        structure: (sig.cooperative ? 0.04 : 0) + (sig.empathy ? 0.04 : 0),
        natural: (sig.cooperative ? 0.04 : 0) + (sig.empathy ? 0.04 : 0) + (sig.hasQuestion ? 0.04 : 0),
        understand: (sig.cooperative ? 0.04 : 0) + (sig.topicalOverlap > 0 ? 0.04 : 0),
      }
    : { responsiveness: 0, continuation: 0, relevance: 0, structure: 0, natural: 0, understand: 0 }

  switch (dim) {
    case 'task_completion':
      return words >= minWords ? 0.82 + softLength * 0.15 : 0.45 + softLength * 0.3
    case 'understandability':
      return clamp01(0.55 + softLength * 0.35 + (avgWordLen > 4 ? 0.08 : 0) + reactiveSig.understand)
    case 'grammar_control':
      return clamp01(0.5 + softLength * 0.3 + (/^(ik|wij|je|jij|u)\b/i.test(answer) ? 0.12 : 0))
    case 'natural_wording':
      return clamp01(
        0.52 +
          softLength * 0.28 +
          (hasQuestion && taskType === 'practical_request' ? 0.12 : 0) +
          reactiveSig.natural,
      )
    case 'pronunciation_delivery':
      return clamp01(0.58 + softLength * 0.22)
    case 'structure':
      return clamp01(
        0.5 +
          softLength * 0.35 +
          (/,|maar|want|omdat|dus|eerst|daarna/i.test(answer) ? 0.1 : 0) +
          reactiveSig.structure,
      )
    case 'directness':
      return clamp01(0.55 + softLength * 0.35 + (taskType === 'practical_request' && words >= minWords ? 0.06 : 0))
    case 'politeness':
      return clamp01(0.55 + (/(alstublieft|alsjeblieft|dank|bedankt|mag ik)/i.test(answer) ? 0.25 : 0.1))
    case 'completion':
      return clamp01(
        0.52 +
          softLength * 0.38 +
          (taskType === 'practical_request' && /(graag|alstublieft|kunt u|mag ik)/i.test(answer) ? 0.08 : 0),
      )
    case 'stance':
      return clamp01(0.5 + softLength * 0.3 + (/(ik vind|naar mijn mening|volgens mij)/i.test(answer) ? 0.15 : 0))
    case 'reason':
      return clamp01(0.48 + softLength * 0.32 + (/(omdat|want|daarom|reden)/i.test(answer) ? 0.18 : 0))
    case 'responsiveness':
      return clamp01(
        0.52 +
          softLength * 0.35 +
          (taskType === 'follow_up_response' && words >= minWords ? 0.06 : 0) +
          reactiveSig.responsiveness,
      )
    case 'continuation':
      return clamp01(
        0.5 + softLength * 0.33 + (/\b(en|ook|daarna|verder)\b/i.test(answer) ? 0.08 : 0) + reactiveSig.continuation,
      )
    case 'relevance':
      return clamp01(0.54 + softLength * 0.32 + reactiveSig.relevance)
    case 'sequence':
      return clamp01(0.48 + softLength * 0.3 + (/(eerst|dan|vervolgens|tot slot)/i.test(answer) ? 0.18 : 0))
    case 'clarity':
      return clamp01(
        0.52 +
          softLength * 0.36 +
          (taskType === 'practical_request' || taskType === 'storytelling' ? 0.04 : 0),
      )
    case 'tense_flow':
      return clamp01(0.5 + softLength * 0.3 + (/(vroeger|nu|straks|gisteren|morgen)/i.test(answer) ? 0.12 : 0))
    case 'completeness':
      return clamp01(0.5 + softLength * 0.38)
    case 'listening_accuracy':
      return clamp01(0.55 + softLength * 0.3)
    default:
      return clamp01(0.5 + softLength * 0.3)
  }
}

function mergeWeights(
  blueprint: ExamScoringBlueprint,
  taskType: ExamTaskType,
): Partial<Record<ExamScoringDimension, number>> {
  const core = { ...blueprint.coreWeights }
  const canonical = CANONICAL_TASK_OVERLAYS[taskType] ?? {}
  const profileOverlay = blueprint.overlaysByTask[taskType]?.weights ?? {}
  return { ...core, ...canonical, ...profileOverlay }
}

export function scoreTaskAttempt(params: {
  task: ExamTaskInstance
  answerText: string
  blueprint: ExamScoringBlueprint
  level: ExamLevel
  mode: ExamRunMode
  retriesUsed: number
  /** Optional Azure pronunciation metrics for the same audio clip (A2 speaking). */
  voice?: ExamVoiceAssessmentSnapshot | null
}): { scores: Partial<Record<ExamScoringDimension, number>>; composite: number } {
  if (
    (params.task.taskType === 'knowledge_mcq' || params.task.taskType === 'listening_mcq_exam') &&
    params.task.mcq
  ) {
    const ok = mcqSubmissionMatchesCorrect(params.task.mcq.correctOptionIds, params.answerText)
    const weights = mergeWeights(params.blueprint, params.task.taskType)
    const dims = params.task.scoringDimensions.length
      ? params.task.scoringDimensions
      : (Object.keys(weights) as ExamScoringDimension[])
    /** Simulation MCQ: match exam-style right/wrong — 100% when keyed answer matches, not a softened rubric curve. */
    if (params.mode === 'simulation' && ok) {
      const scores: Partial<Record<ExamScoringDimension, number>> = {}
      for (const dim of dims) scores[dim] = 1
      return { scores, composite: 1 }
    }
    const modeScale =
      params.mode === 'simulation'
        ? simulationScale(params.blueprint, params.level)
        : trainingScale(params.blueprint, params.level, params.retriesUsed)
    const baseTask = ok ? 0.93 : 0.18
    const baseRel = ok ? 0.9 : 0.2
    const scores: Partial<Record<ExamScoringDimension, number>> = {}
    let wSum = 0
    let acc = 0
    for (const dim of dims) {
      const w = weights[dim] ?? 1
      let raw = 0.5
      if (dim === 'task_completion') raw = baseTask
      else if (dim === 'relevance' || dim === 'listening_accuracy') raw = baseRel
      else raw = ok ? 0.85 : 0.25
      raw = clamp01(raw * modeScale)
      scores[dim] = raw
      acc += raw * w
      wSum += w
    }
    const composite = wSum > 0 ? clamp01(acc / wSum) : 0
    return { scores, composite }
  }

  const weights = mergeWeights(params.blueprint, params.task.taskType)
  const dims = params.task.scoringDimensions.length
    ? params.task.scoringDimensions
    : (Object.keys(weights) as ExamScoringDimension[])

  const modeScale =
    params.mode === 'simulation'
      ? simulationScale(params.blueprint, params.level)
      : trainingScale(params.blueprint, params.level, params.retriesUsed)

  let scores: Partial<Record<ExamScoringDimension, number>> = {}
  for (const dim of dims) {
    const base = heuristicDimensionScore(
      dim,
      params.task.taskType,
      params.answerText,
      params.level,
      params.task,
    )
    const raw = clamp01(base * modeScale)
    scores[dim] = raw
  }
  if (params.voice) {
    scores = applyVoiceBlendToHeuristicScores({
      scores,
      dims,
      level: params.level,
      voice: params.voice,
    })
  }
  if (params.task.taskType === 'writing_task_exam' && writingExamTaskLooksFormFill(params.task, params.answerText)) {
    const layoutBullets = effectiveWritingFormBullets(params.task, params.answerText)
    const layout01 = formFillLayoutScore01(params.answerText, layoutBullets)
    /* Multi-box layout is handled by the UI — do not apply simulation strictness scaling to this dimension. */
    if (layout01 != null && dims.includes('structure')) {
      scores.structure = layout01
    }
  }
  let wSum = 0
  let acc = 0
  for (const dim of dims) {
    const w = weights[dim] ?? 1
    const raw = scores[dim] ?? 0.5
    acc += raw * w
    wSum += w
  }
  const composite = wSum > 0 ? clamp01(acc / wSum) : 0
  return { scores, composite }
}

export function aggregateAttempts(attempts: ExamTaskAttempt[]): Partial<Record<ExamScoringDimension, number>> {
  const sums: Partial<Record<ExamScoringDimension, number>> = {}
  const counts: Partial<Record<ExamScoringDimension, number>> = {}
  for (const a of attempts) {
    for (const [k, v] of Object.entries(a.scores)) {
      const dim = k as ExamScoringDimension
      if (typeof v !== 'number') continue
      sums[dim] = (sums[dim] ?? 0) + v
      counts[dim] = (counts[dim] ?? 0) + 1
    }
  }
  const out: Partial<Record<ExamScoringDimension, number>> = {}
  for (const k of Object.keys(sums)) {
    const dim = k as ExamScoringDimension
    const c = counts[dim] ?? 1
    out[dim] = clamp01((sums[dim] ?? 0) / c)
  }
  return out
}

export function aggregateByTaskType(attempts: ExamTaskAttempt[]): Partial<Record<ExamTaskType, number>> {
  const sums: Partial<Record<ExamTaskType, number>> = {}
  const counts: Partial<Record<ExamTaskType, number>> = {}
  for (const a of attempts) {
    sums[a.taskType] = (sums[a.taskType] ?? 0) + a.composite
    counts[a.taskType] = (counts[a.taskType] ?? 0) + 1
  }
  const out: Partial<Record<ExamTaskType, number>> = {}
  for (const k of Object.keys(sums)) {
    const tt = k as ExamTaskType
    const c = counts[tt] ?? 1
    out[tt] = clamp01((sums[tt] ?? 0) / c)
  }
  return out
}

export type SectionAggregate = { score01: number; count: number }

/** Section-level mean composite for simulation reporting. */
export function aggregateBySection(attempts: ExamTaskAttempt[]): Record<string, SectionAggregate> {
  const sums: Record<string, { sum: number; n: number }> = {}
  for (const a of attempts) {
    const id = a.sectionId || 'unknown'
    if (!sums[id]) sums[id] = { sum: 0, n: 0 }
    sums[id].sum += a.composite
    sums[id].n += 1
  }
  const out: Record<string, SectionAggregate> = {}
  for (const [id, agg] of Object.entries(sums)) {
    out[id] = { score01: agg.n ? clamp01(agg.sum / agg.n) : 0, count: agg.n }
  }
  return out
}

/** Compare first vs second half of session attempts (time-ordered) for formative “what improved”. */
export function dimensionsImprovedFormative(attempts: ExamTaskAttempt[], threshold = 0.05): ExamScoringDimension[] {
  if (attempts.length < 2) return []
  const sorted = [...attempts].sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))
  const mid = Math.floor(sorted.length / 2)
  const first = aggregateAttempts(sorted.slice(0, Math.max(1, mid)))
  const second = aggregateAttempts(sorted.slice(mid))
  const out: ExamScoringDimension[] = []
  for (const k of new Set([...Object.keys(first), ...Object.keys(second)])) {
    const dim = k as ExamScoringDimension
    const d = (second[dim] ?? 0) - (first[dim] ?? 0)
    if (d >= threshold) out.push(dim)
  }
  return out
}

export function meanComposite01(attempts: ExamTaskAttempt[]): number {
  if (!attempts.length) return 0
  return clamp01(attempts.reduce((s, a) => s + a.composite, 0) / attempts.length)
}

/** Formative quality: mean composite + small bonus if later attempts outperform earlier ones. */
export function computeTrainingQualityScore01(attempts: ExamTaskAttempt[]): number {
  if (!attempts.length) return 0
  const mean = meanComposite01(attempts)
  const sorted = [...attempts].sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))
  if (sorted.length < 2) return clamp01(mean * 1.02)
  const mid = Math.floor(sorted.length / 2)
  const early = meanComposite01(sorted.slice(0, Math.max(1, mid)))
  const late = meanComposite01(sorted.slice(mid))
  const trend = late - early
  return clamp01(mean + Math.max(0, trend) * 0.2)
}

/** 0–1: average lift from first to last attempt per task with retries; null if no multi-attempt task. */
export function computeRetryLift01(attempts: ExamTaskAttempt[]): number | null {
  const byTask = new Map<string, ExamTaskAttempt[]>()
  for (const a of attempts) {
    const list = byTask.get(a.taskId) ?? []
    list.push(a)
    byTask.set(a.taskId, list)
  }
  const lifts: number[] = []
  for (const arr of byTask.values()) {
    if (arr.length < 2) continue
    arr.sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))
    lifts.push(arr[arr.length - 1].composite - arr[0].composite)
  }
  if (!lifts.length) return null
  const avg = lifts.reduce((s, x) => s + x, 0) / lifts.length
  return clamp01(0.5 + avg)
}
