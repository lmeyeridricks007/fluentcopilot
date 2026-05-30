/**
 * Local history + structured reports for "From your day" personalized practice packs
 * (session type `personalized_practice` in UI / history).
 */

import { STORAGE_NS } from '@/lib/storage/storageKeys'
import type { DayPracticePackApi, QuickCaptureItem } from '@/lib/api/quickCaptureClient'
import type { DayPracticeStep } from '@/features/quick-capture/dayPackFromCaptures'
import { capturePreviewText, parseQuickCaptureEnrichment, typeLabel } from '@/features/library/capture/parseQuickCaptureEnrichment'

const HISTORY_KEY = (userId: string) => `${STORAGE_NS}.personalized-practice-history.${userId}`
const HISTORY_MAX = 48

export const PERSONALIZED_PRACTICE_SCHEMA_VERSION = 1 as const

export type PersonalizedPracticeReportV1 = {
  schemaVersion: typeof PERSONALIZED_PRACTICE_SCHEMA_VERSION
  packId: string
  progressionSessionId: string
  title: string
  localDateYmd: string
  completedAt: string
  practicePackMode: 'quick_rep' | 'standard' | 'deeper_debrief'
  themeSummary: string
  sourceThemes: string[]
  /** Human-readable capture modalities in this pack, e.g. `["Word","Voice"]`. */
  sourceCaptureTypeLabels?: string[]
  /** 0–100 from pack step / beat completion. */
  completionPct?: number
  /** `interactive` when the session used generated exercise blocks; otherwise checklist-style steps. */
  flowKind?: 'interactive' | 'checklist'
  /** Optional: interactive block completion when flow is interactive. */
  interactiveMeta?: { exercisesCompleted: number; exercisesTotal: number } | null
  /** Lines pulled from captures + recap — what real-world material you practiced. */
  fromToday: { bullets: string[] }
  /** Corrections, struggle captures, friction you rehearsed. */
  repaired: { bullets: string[] }
  /** Recap + patterns called out in the pack. */
  learned: { bullets: string[] }
  /** What you finished in this session (plain-language). */
  completedWork?: { bullets: string[] }
  /** Strongest-next / coach follow-ups suggested in-pack. */
  nextPractice: { bullets: string[] }
  /** Single line for recap headers / momentum. */
  nextRecommendation?: string | null
  /** Pack captures and their Library lifecycle at completion time. */
  libraryCaptures?: { bullets: string[] }
  /** Library / long-term retention guidance. */
  savedLongTerm: { bullets: string[] }
  stats: {
    stepsTotal: number
    stepsCompleted: number
    captureCount: number
  }
}

export type PersonalizedPracticeHistoryEntry = {
  packId: string
  progressionSessionId: string
  userId: string
  title: string
  localDateYmd: string
  endedAt: string
  themeSummary: string
  sourceThemes: string[]
  xpAwarded: number
  completed: boolean
  practicePackMode: 'quick_rep' | 'standard' | 'deeper_debrief'
  report: PersonalizedPracticeReportV1
}

function coerceReport(r: PersonalizedPracticeReportV1): PersonalizedPracticeReportV1 {
  const stats = r.stats
  const pct =
    typeof r.completionPct === 'number'
      ? r.completionPct
      : Math.min(100, Math.round((stats.stepsCompleted / Math.max(1, stats.stepsTotal)) * 100))
  const nextRec = r.nextRecommendation ?? r.nextPractice?.bullets?.[0] ?? null
  return {
    ...r,
    sourceCaptureTypeLabels: r.sourceCaptureTypeLabels?.length ? r.sourceCaptureTypeLabels : r.sourceThemes.slice(0, 6),
    completionPct: pct,
    flowKind: r.flowKind ?? 'checklist',
    completedWork: r.completedWork ?? {
      bullets: [`Pack progress: ${stats.stepsCompleted}/${stats.stepsTotal} steps.`],
    },
    nextRecommendation: nextRec,
    libraryCaptures: r.libraryCaptures ?? { bullets: [] },
  }
}

function parseHistory(raw: string | null): PersonalizedPracticeHistoryEntry[] {
  if (!raw) return []
  try {
    const j = JSON.parse(raw) as unknown
    if (!Array.isArray(j)) return []
    return j
      .filter(
        (row): row is PersonalizedPracticeHistoryEntry =>
          Boolean(row) &&
          typeof row === 'object' &&
          typeof (row as PersonalizedPracticeHistoryEntry).packId === 'string' &&
          typeof (row as PersonalizedPracticeHistoryEntry).report === 'object',
      )
      .map((row) => ({ ...row, report: coerceReport(row.report) }))
  } catch {
    return []
  }
}

export function listPersonalizedPracticeHistory(userId: string): PersonalizedPracticeHistoryEntry[] {
  if (typeof window === 'undefined') return []
  return parseHistory(window.localStorage.getItem(HISTORY_KEY(userId)))
}

export function getPersonalizedPracticeHistoryEntry(
  userId: string,
  packId: string,
): PersonalizedPracticeHistoryEntry | null {
  return listPersonalizedPracticeHistory(userId).find((e) => e.packId === packId) ?? null
}

export function progressionSessionIdForFromYourDayPack(packId: string): string {
  return `from-your-day:${packId}`
}

export function appendPersonalizedPracticeSession(entry: PersonalizedPracticeHistoryEntry): void {
  if (typeof window === 'undefined') return
  const prev = parseHistory(window.localStorage.getItem(HISTORY_KEY(entry.userId)))
  const without = prev.filter((e) => e.packId !== entry.packId)
  const next = [entry, ...without].slice(0, HISTORY_MAX)
  try {
    window.localStorage.setItem(HISTORY_KEY(entry.userId), JSON.stringify(next))
  } catch {
    /* quota */
  }
}

function captureLine(c: QuickCaptureItem): string {
  const t = (c.bodyPrimary ?? c.transcript ?? '').trim()
  const type = c.captureType.replace(/_/g, ' ')
  return t ? `${type}: ${t.slice(0, 120)}${t.length > 120 ? '…' : ''}` : type
}

function statusInLibraryLine(status: QuickCaptureItem['status']): string {
  switch (status) {
    case 'ready_for_practice':
      return 'Ready to practice'
    case 'included_in_practice':
      return 'Included in pack'
    case 'practiced':
      return 'Practiced'
    case 'saved_long_term':
      return 'Saved long-term'
    case 'new':
      return 'New'
    case 'enriched':
      return 'Enriched'
    case 'archived':
      return 'Archived'
    default:
      return status
  }
}

export function buildPersonalizedPracticeReport(params: {
  pack: DayPracticePackApi
  steps: DayPracticeStep[]
  captureById: Map<string, QuickCaptureItem>
  packCaptureIds: string[]
  themeSummary: string
  practicePackMode: 'quick_rep' | 'standard' | 'deeper_debrief'
  weaknessTags: string[]
  stepsCompleted: number
  stepsTotal: number
  completedAt: string
  flowKind: 'interactive' | 'checklist'
  interactiveMeta?: { exercisesCompleted: number; exercisesTotal: number } | null
}): PersonalizedPracticeReportV1 {
  const packId = params.pack.id
  const progressionSessionId = progressionSessionIdForFromYourDayPack(packId)
  const caps = params.packCaptureIds.map((id) => params.captureById.get(id)).filter(Boolean) as QuickCaptureItem[]

  const typeLabelsOrdered: string[] = []
  const seenTypes = new Set<string>()
  for (const c of caps) {
    const lab = typeLabel(c.captureType)
    if (!seenTypes.has(lab)) {
      seenTypes.add(lab)
      typeLabelsOrdered.push(lab)
    }
  }

  const totalBeats = Math.max(1, params.stepsTotal)
  const completionPct = Math.min(100, Math.round((params.stepsCompleted / totalBeats) * 100))

  const fromToday: string[] = []
  const recap = params.steps.find((s) => s.kind === 'short_recap')
  if (recap && recap.kind === 'short_recap' && Array.isArray(recap.bullets)) {
    for (const b of recap.bullets.slice(0, 6)) {
      const t = String(b).trim()
      if (t) fromToday.push(t)
    }
  }
  for (const c of caps.slice(0, 8)) {
    fromToday.push(captureLine(c))
  }

  const repaired: string[] = []
  for (const s of params.steps) {
    if (s.kind === 'correction_rep') {
      const situation = 'situation' in s ? String(s.situation).trim() : ''
      const fix = 'correctedNl' in s ? String(s.correctedNl).trim() : ''
      if (situation || fix) repaired.push([situation && `Situation: ${situation}`, fix && `Line to use: ${fix}`].filter(Boolean).join(' · '))
    }
  }
  for (const c of caps.filter((x) => x.captureType === 'log_struggle')) {
    const p = (c.bodyPrimary ?? '').trim()
    const sec = (c.bodySecondary ?? '').trim()
    if (p || sec) repaired.push(['Struggle note', p, sec].filter(Boolean).join(' — ').slice(0, 200))
  }
  if (params.weaknessTags.length) {
    repaired.push(`Signals you are working: ${params.weaknessTags.slice(0, 5).join(', ')}`)
  }

  const learned: string[] = []
  if (recap && recap.kind === 'short_recap') {
    const hl = 'headline' in recap && typeof recap.headline === 'string' ? recap.headline.trim() : ''
    if (hl) learned.push(hl)
  }
  for (const s of params.steps) {
    if (s.kind === 'word_rep' && 'dutch' in s) {
      const w = String(s.dutch).trim()
      if (w) learned.push(`Word rep: ${w.slice(0, 80)}`)
    }
    if (s.kind === 'phrase_rep' && 'dutch' in s) {
      const w = String(s.dutch).trim()
      if (w) learned.push(`Phrase rep: ${w.slice(0, 100)}`)
    }
    if (s.kind === 'mini_scenario' && 'scenarioSlug' in s) {
      learned.push(`Mini scenario: ${String(s.scenarioSlug).replace(/-/g, ' ')}`)
    }
  }

  const nextPractice: string[] = []
  for (const s of params.steps) {
    if (s.kind === 'strongest_next' && 'prompt' in s) {
      const p = String(s.prompt).trim()
      if (p) nextPractice.push(p.slice(0, 220))
    }
    if (s.kind === 'coach_debrief' && 'prompt' in s) {
      const p = String(s.prompt).trim()
      if (p) nextPractice.push(`Coach follow-up: ${p.slice(0, 180)}`)
    }
  }
  if (!nextPractice.length) {
    nextPractice.push('Revisit one capture tomorrow in Library and say it aloud once before you need it.')
  }

  const nextRecommendation = nextPractice[0] ?? null

  const completedWork: string[] = []
  if (params.flowKind === 'interactive' && params.interactiveMeta) {
    const { exercisesCompleted, exercisesTotal } = params.interactiveMeta
    completedWork.push(`Interactive pack: ${exercisesCompleted}/${Math.max(1, exercisesTotal)} beats completed.`)
  }
  completedWork.push(`Pack progress: ${params.stepsCompleted}/${params.stepsTotal} checklist steps marked for credit.`)

  const libraryCaptures: string[] = []
  for (const c of caps.slice(0, 12)) {
    const en = parseQuickCaptureEnrichment(c)
    const preview = capturePreviewText(c, en).slice(0, 72)
    libraryCaptures.push(`${typeLabel(c.captureType)} — ${preview} (${statusInLibraryLine(c.status)})`)
  }

  const savedLongTerm = [
    'Practiced captures stay in Library under Practiced — open any card to replay text or jump back into a pack for that day.',
    'Mark must-keep lines as Saved for long-term so they stay easy to find.',
  ]

  const themeParts = params.themeSummary
    .split(/·|,|\||\//)
    .map((s) => s.trim())
    .filter(Boolean)
  const sourceThemes = themeParts.length ? themeParts.slice(0, 6) : caps.map((c) => c.captureType.replace(/_/g, ' ')).slice(0, 4)

  return {
    schemaVersion: PERSONALIZED_PRACTICE_SCHEMA_VERSION,
    packId,
    progressionSessionId,
    title: params.pack.title?.trim() || 'From your day',
    localDateYmd: params.pack.localDate,
    completedAt: params.completedAt,
    practicePackMode: params.practicePackMode,
    themeSummary: params.themeSummary,
    sourceThemes,
    sourceCaptureTypeLabels: typeLabelsOrdered,
    completionPct,
    flowKind: params.flowKind,
    interactiveMeta: params.interactiveMeta ?? null,
    fromToday: { bullets: [...new Set(fromToday)].slice(0, 12) },
    repaired: { bullets: [...new Set(repaired)].slice(0, 10) },
    learned: { bullets: [...new Set(learned)].slice(0, 12) },
    completedWork: { bullets: completedWork },
    nextPractice: { bullets: nextPractice.slice(0, 6) },
    nextRecommendation,
    libraryCaptures: { bullets: libraryCaptures },
    savedLongTerm: { bullets: savedLongTerm },
    stats: {
      stepsTotal: params.stepsTotal,
      stepsCompleted: params.stepsCompleted,
      captureCount: caps.length,
    },
  }
}
