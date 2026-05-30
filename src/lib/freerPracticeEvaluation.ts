/**
 * Rule-based evaluation for "Your turn — freer practice" (no external API required).
 * Server-safe — used from the evaluate API route.
 */

export type FreerEvalMode = 'typed' | 'spoken'

export interface FreerEvaluationInput {
  text: string
  mode: FreerEvalMode
  activityPrompt: string
  /** Browser SpeechRecognition confidence 0–1, when available */
  speechConfidence?: number
}

export interface FreerEvaluationResult {
  summary: string
  scores: {
    taskFit: number
    structure: number
    pronunciation: number | null
  }
  strengths: string[]
  improvements: string[]
}

const CONNECTOR_RE = /\b(en|maar|want)\b/i
const DUTCH_HINT_RE =
  /\b(ik|je|jij|u|we|wij|de|het|een|niet|vandaag|gisteren|morgen|graag|alstublieft|dank|hoe|wat|waar|wanneer)\b/i

function extractPhraseBankLemmas(activity: string): string[] {
  const normalized = activity.replace(/\r\n/g, '\n')
  const lines = normalized.split('\n')
  const out: string[] = []
  let inBank = false
  for (const line of lines) {
    if (/phrase bank/i.test(line)) {
      inBank = true
      continue
    }
    if (!inBank) continue
    const h = line.trim()
    if (
      /^\*\*(your task|writing task|speaking task|checklist|example starter)/i.test(h) ||
      /^\*\*your task/i.test(h)
    )
      break
    const trimmed = line.trim()
    if (trimmed.startsWith('•')) {
      const raw = trimmed.replace(/^•\s*/, '').replace(/\*\*/g, '').split(/[↔—–,]/)[0].trim()
      const lemma = raw.toLowerCase()
      if (lemma.length >= 2 && lemma.length < 40) out.push(lemma)
    }
  }
  return [...new Set(out)]
}

function countSentences(text: string): number {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (!cleaned) return 0
  const parts = cleaned.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean)
  return Math.max(parts.length, cleaned.includes('?') || cleaned.includes('.') || cleaned.includes('!') ? parts.length : 1)
}

function sentenceScore(count: number): number {
  if (count >= 4 && count <= 6) return 100
  if (count === 3 || count === 7) return 82
  if (count === 2 || count === 8) return 65
  if (count === 1) return 40
  if (count > 8) return 70
  return 35
}

function pronunciationFromConfidence(mode: FreerEvalMode, c?: number): number | null {
  if (mode !== 'spoken') return null
  if (c == null || Number.isNaN(c)) return 62
  return Math.round(Math.min(100, Math.max(35, 45 + c * 55)))
}

export function evaluateFreerPractice(input: FreerEvaluationInput): FreerEvaluationResult {
  const text = input.text.replace(/\s+/g, ' ').trim()
  const lemmas = extractPhraseBankLemmas(input.activityPrompt)
  const lower = text.toLowerCase()

  const sentences = countSentences(text)
  const hasQuestion = /\?/.test(text)
  const hasConnector = CONNECTOR_RE.test(text)
  const dutchish = DUTCH_HINT_RE.test(text) || /[àáâãäåæçèéêëìíîïñòóôõöùúûüýÿ]/i.test(text)

  const usedBank = lemmas.filter((w) => lower.includes(w))
  const bankScore =
    lemmas.length === 0 ? 75 : Math.min(100, Math.round((usedBank.length / Math.min(lemmas.length, 6)) * 100))

  let structure = 50
  structure += hasQuestion ? 25 : 0
  structure += hasConnector ? 25 : 0
  structure = Math.min(100, structure)

  let taskFit = Math.round(sentenceScore(sentences) * 0.45 + bankScore * 0.35 + (dutchish ? 20 : 5))
  taskFit = Math.min(100, taskFit)

  const strengths: string[] = []
  const improvements: string[] = []

  if (sentences >= 4 && sentences <= 6) strengths.push('Length is in the 4–6 sentence ballpark.')
  else if (sentences < 4) improvements.push('Try expanding to about 4–6 short sentences about the theme.')
  else improvements.push('You wrote a lot — consider tightening to 4–6 clear sentences.')

  if (hasQuestion) strengths.push('You included a question.')
  else improvements.push('Add at least one Dutch question (the task asks for it).')

  if (hasConnector) strengths.push('You used a connector (en / maar / want).')
  else improvements.push('Link ideas with **en**, **maar**, or **want**.')

  if (usedBank.length >= 2) strengths.push(`You used ${usedBank.length} phrase-bank words — nice reuse.`)
  else if (lemmas.length >= 4)
    improvements.push('Weave in more words from the phrase bank so vocabulary sticks.')

  if (dutchish) strengths.push('Text looks plausibly Dutch-heavy (good for this exercise).')
  else improvements.push('Shift toward Dutch for the core message; English is fine only for gaps you cannot fill yet.')

  if (input.mode === 'spoken' && input.speechConfidence != null && input.speechConfidence < 0.55) {
    improvements.push('Speech recognition was unsure — speak a bit closer to the mic or try typing a clean-up.')
  }

  const pronunciation = pronunciationFromConfidence(input.mode, input.speechConfidence)

  const summary =
    taskFit >= 75
      ? 'Solid attempt — you are hitting several task requirements.'
      : taskFit >= 55
        ? 'Good start — tighten structure and vocabulary to match the brief.'
        : 'Keep going — focus on length, a question, and a connector next.'

  return {
    summary,
    scores: {
      taskFit,
      structure,
      pronunciation,
    },
    strengths,
    improvements,
  }
}
