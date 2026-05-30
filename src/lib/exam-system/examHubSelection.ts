import type { ExamLevel, ExamModalityKey } from './types'
import type { UserProfileDocumentV1 } from '@/lib/storage/storageTypes'
import { getUserCurrentLevelSelfReportId } from '@/lib/profile/profileSelectors'
import { cefrFromLevelSelfReport } from '@/features/onboarding/onboardingOptions'

const LEVEL_ORDER: ExamLevel[] = ['A1', 'A2', 'B1']

/** Suffix order for `program_modality` exam codes (e.g. `inburgering_speaking`). */
export const EXAM_MODALITY_ORDER: ExamModalityKey[] = ['speaking', 'listening', 'writing', 'reading', 'knm']

/** Minimal row shape for hub grouping (matches API `ExamProfileSummary`). */
export type ExamHubProfileRow = {
  examId: string
  examCode: string
  level: ExamLevel
}

/** Full exam codes for default sort when listing rows (legacy helper). */
export const EXAM_CODE_ORDER = [
  'inburgering_speaking',
  'inburgering_listening',
  'inburgering_writing',
  'inburgering_reading',
  'inburgering_knm',
] as const

const MODALITY_LABEL: Record<string, string> = {
  speaking: 'Speaking',
  listening: 'Listening',
  writing: 'Writing',
  reading: 'Reading',
  knm: 'KNM',
}

const MODALITY_LABEL_FULLCODE: Record<string, string> = {
  inburgering_speaking: 'Speaking',
  inburgering_listening: 'Listening',
  inburgering_writing: 'Writing',
  inburgering_reading: 'Reading',
  inburgering_knm: 'KNM',
}

export function normalizeExamLevel(raw: string | null | undefined): ExamLevel {
  if (!raw) return 'A2'
  const u = raw.trim().toUpperCase()
  if (u.startsWith('A0') || u.includes('BEGINNER')) return 'A1'
  if (u.startsWith('A1') || /\bA1\b/.test(u)) return 'A1'
  if (u.startsWith('A2') || /\bA2\b/.test(u)) return 'A2'
  if (u.startsWith('B1') || /\bB1\b/.test(u)) return 'B1'
  if (u.startsWith('B2') || u.startsWith('C1') || u.startsWith('C2')) return 'B1'
  return 'A2'
}

/**
 * Exam hub / setup default level: onboarding self-report and profile CEFR first (beats stale mock
 * `currentLevel: A1`), then study path, then session — so the hub matches Settings / onboarding.
 */
export function preferredExamLevelFromLearner(
  user: { currentLevel?: string } | null | undefined,
  profileDoc: UserProfileDocumentV1 | null | undefined,
  activeStudyLevel?: string | null | undefined,
): ExamLevel {
  const study = activeStudyLevel?.trim()
  const studyNorm = study ? normalizeExamLevel(study) : null

  if (profileDoc) {
    const selfId = getUserCurrentLevelSelfReportId(profileDoc)
    if (selfId) return normalizeExamLevel(cefrFromLevelSelfReport(selfId))
  }

  const docLevel = profileDoc?.currentLevel?.trim()
  const docNorm = docLevel ? normalizeExamLevel(docLevel) : null

  // Study path level is an explicit settings choice; prefer it over untouched mock `currentLevel: A1`.
  if (studyNorm && docNorm === 'A1' && studyNorm !== 'A1') {
    const hasSelfReport = profileDoc ? Boolean(getUserCurrentLevelSelfReportId(profileDoc)) : false
    if (!hasSelfReport) return studyNorm
  }

  if (docNorm) return docNorm
  if (studyNorm) return studyNorm

  const sessionLevel = user?.currentLevel?.trim()
  if (sessionLevel) return normalizeExamLevel(sessionLevel)

  return 'A2'
}

/** Split `program_modality` (e.g. `inburgering_speaking`). Unknown shapes return modality `''`. */
export function parseExamCode(examCode: string): { program: string; modality: ExamModalityKey | '' } {
  for (const mod of EXAM_MODALITY_ORDER) {
    const suf = `_${mod}`
    if (examCode.endsWith(suf) && examCode.length > suf.length) {
      return { program: examCode.slice(0, -suf.length), modality: mod }
    }
  }
  return { program: examCode, modality: '' }
}

export function examCodeForParts(program: string, modality: string): string {
  return `${program}_${modality}`
}

export function labelForProgram(program: string): string {
  if (program === 'inburgering') return 'Inburgering'
  return program
    .split(/[_-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

export function labelForModality(modality: string): string {
  return MODALITY_LABEL[modality] ?? modality.replace(/_/g, ' ')
}

export function labelForExamCode(examCode: string): string {
  const { modality } = parseExamCode(examCode)
  if (modality) return labelForModality(modality)
  return MODALITY_LABEL_FULLCODE[examCode] ?? examCode.replace(/^inburgering_/, '').replace(/_/g, ' ')
}

export function programsFromProfiles(profiles: ExamHubProfileRow[]): string[] {
  const set = new Set<string>()
  for (const p of profiles) {
    set.add(parseExamCode(p.examCode).program)
  }
  const preferred = ['inburgering']
  return [...set].sort((a, b) => {
    const ia = preferred.indexOf(a)
    const ib = preferred.indexOf(b)
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
    return a.localeCompare(b)
  })
}

export function modalitiesForProgram(profiles: ExamHubProfileRow[], program: string): ExamModalityKey[] {
  const out = new Set<ExamModalityKey>()
  for (const p of profiles) {
    const { program: pr, modality } = parseExamCode(p.examCode)
    if (pr === program && modality) out.add(modality)
  }
  return sortModalities([...out])
}

export function sortModalities(modalities: ExamModalityKey[]): ExamModalityKey[] {
  const rank = (m: ExamModalityKey) => EXAM_MODALITY_ORDER.indexOf(m)
  return [...modalities].sort((a, b) => rank(a) - rank(b))
}

export function sortExamCodes(codes: string[]): string[] {
  const rank = (c: string) => {
    const i = (EXAM_CODE_ORDER as readonly string[]).indexOf(c)
    return i === -1 ? 99 : i
  }
  return [...codes].sort((a, b) => rank(a) - rank(b))
}

export function groupProfilesByExamCode(profiles: ExamHubProfileRow[]): Map<string, ExamHubProfileRow[]> {
  const m = new Map<string, ExamHubProfileRow[]>()
  for (const p of profiles) {
    const list = m.get(p.examCode) ?? []
    list.push(p)
    m.set(p.examCode, list)
  }
  for (const list of m.values()) {
    list.sort((a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level))
  }
  return m
}

export function profileIdFor(examCode: string, level: ExamLevel): string {
  return `${examCode}_${level}`
}

/** Parse catalog `examId` shaped like `<examCode>_<A1|A2|B1>` (e.g. `inburgering_speaking_A2`). */
export function parseExamProfileId(examId: string): { examCode: string; level: ExamLevel } | null {
  const m = examId.match(/^(.+)_(A1|A2|B1)$/)
  if (!m?.[1] || !m[2]) return null
  return { examCode: m[1], level: m[2] as ExamLevel }
}

export function resolveProfileId(
  grouped: Map<string, ExamHubProfileRow[]>,
  examCode: string,
  level: ExamLevel,
): string | null {
  const row = grouped.get(examCode)?.find((p) => p.level === level)
  return row?.examId ?? null
}

export function resolveProfileIdFromParts(
  profiles: ExamHubProfileRow[],
  program: string,
  modality: string,
  level: ExamLevel,
): string | null {
  const examCode = examCodeForParts(program, modality)
  const row = profiles.find((p) => p.examCode === examCode && p.level === level)
  return row?.examId ?? null
}

export function levelsForProgramModality(
  profiles: ExamHubProfileRow[],
  program: string,
  modality: string,
): ExamLevel[] {
  const examCode = examCodeForParts(program, modality)
  const have = new Set(profiles.filter((p) => p.examCode === examCode).map((p) => p.level))
  return LEVEL_ORDER.filter((lv) => have.has(lv))
}

/**
 * Pick the catalog `examId` for the learner's preferred CEFR band, keeping program + modality from
 * `profileFromUrl` when present (e.g. hub link with `inburgering_writing_A1` → same module at A2).
 */
export function resolveExamProfileIdForPreferredLevel(
  profiles: ExamHubProfileRow[],
  preferredLevel: ExamLevel,
  opts?: { profileFromUrl?: string; fallbackExamCode?: string },
): string {
  if (!profiles.length) return profileIdFor(opts?.fallbackExamCode ?? 'inburgering_speaking', preferredLevel)

  const remapUrlToPreferred = (urlId: string): string | null => {
    const row = profiles.find((p) => p.examId === urlId)
    const examCode = row?.examCode ?? parseExamProfileId(urlId)?.examCode
    if (!examCode) return null
    const { program, modality } = parseExamCode(examCode)
    return resolveProfileIdFromParts(profiles, program, modality || 'speaking', preferredLevel)
  }

  const fromUrl = opts?.profileFromUrl?.trim()
  if (fromUrl) {
    const remapped = remapUrlToPreferred(fromUrl)
    if (remapped) return remapped
  }

  const fallbackCode = opts?.fallbackExamCode ?? 'inburgering_speaking'
  return (
    profiles.find((p) => p.examCode === fallbackCode && p.level === preferredLevel)?.examId ??
    profiles.find((p) => p.level === preferredLevel)?.examId ??
    profiles[0]!.examId
  )
}
