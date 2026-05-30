'use client'

import type { ReactNode } from 'react'
import { BookOpen, BookMarked, Headphones, Landmark, Mic2, PenLine } from 'lucide-react'
import clsx from 'clsx'
import type { ExamProfileSummary } from './examApi'
import type { ExamLevel, ExamModalityKey } from '@/lib/exam-system/types'
import {
  groupProfilesByExamCode,
  labelForModality,
  labelForProgram,
  levelsForProgramModality,
  modalitiesForProgram,
  parseExamCode,
  parseExamProfileId,
  programsFromProfiles,
  resolveProfileIdFromParts,
  sortExamCodes,
} from '@/lib/exam-system/examHubSelection'

const MODALITY_ICON: Record<string, ReactNode> = {
  speaking: <Mic2 className="h-4 w-4 shrink-0" aria-hidden />,
  listening: <Headphones className="h-4 w-4 shrink-0" aria-hidden />,
  writing: <PenLine className="h-4 w-4 shrink-0" aria-hidden />,
  reading: <BookOpen className="h-4 w-4 shrink-0" aria-hidden />,
  knm: <Landmark className="h-4 w-4 shrink-0" aria-hidden />,
}

type Props = {
  profiles: ExamProfileSummary[] | undefined
  profileId: string
  onProfileIdChange: (id: string) => void
  /** When `profileId` is missing from the list, prefer this level over `profiles[0]` (often A1). */
  preferredLevel?: ExamLevel
  /** Nested in another card (e.g. setup flows): drop top margin, slightly tighter padding. */
  embedded?: boolean
}

export function ExamHubProfilePicker({ profiles, profileId, onProfileIdChange, preferredLevel, embedded }: Props) {
  if (!profiles?.length) return null

  const grouped = groupProfilesByExamCode(profiles)
  const parsed = parseExamProfileId(profileId)
  const active =
    profiles.find((p) => p.examId === profileId) ??
    (parsed && preferredLevel
      ? profiles.find((p) => p.examCode === parsed.examCode && p.level === preferredLevel)
      : preferredLevel
        ? profiles.find((p) => p.level === preferredLevel)
        : undefined) ??
    profiles[0]
  const parsedCode = parseExamCode(active.examCode)
  const modRaw = parsedCode.modality
  let program = parsedCode.program
  let modality: ExamModalityKey = modRaw || 'speaking'
  if (!modRaw) {
    const fb = sortExamCodes([...grouped.keys()])[0]
    const p2 = parseExamCode(fb)
    program = p2.program || program
    modality = p2.modality || 'speaking'
  }
  const level = active.level

  const programs = programsFromProfiles(profiles)
  const modalities = modalitiesForProgram(profiles, program)
  const levelChoices = levelsForProgramModality(profiles, program, modality)

  if (profiles.length < 2) return null

  const apply = (patch: Partial<{ program: string; modality: ExamModalityKey; level: ExamLevel }>) => {
    let p = patch.program ?? program
    let m = patch.modality ?? modality
    let l = patch.level ?? level

    const progs = programsFromProfiles(profiles)
    if (!progs.includes(p)) p = progs[0] ?? p

    const mods = modalitiesForProgram(profiles, p)
    if (!mods.includes(m)) m = mods[0] ?? m

    const levels = levelsForProgramModality(profiles, p, m)
    if (!levels.includes(l)) l = levels[0] ?? 'A2'

    const id = resolveProfileIdFromParts(profiles, p, m, l)
    if (id) onProfileIdChange(id)
  }

  const showLevelRow = levelChoices.length > 1
  const showProgramRow = programs.length > 0

  return (
    <div
      className={clsx(
        'space-y-4 rounded-2xl border border-slate-200/90 bg-white/70 shadow-inner shadow-slate-900/[0.03] backdrop-blur-sm',
        embedded ? 'mt-0 p-3.5' : 'mt-5 p-4',
      )}
    >
      {showProgramRow ? (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 mb-2">Exam program</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Exam program">
            {programs.map((prog) => {
              const selected = prog === program
              return (
                <button
                  key={prog}
                  type="button"
                  onClick={() => apply({ program: prog })}
                  className={clsx(
                    'inline-flex min-h-10 items-center gap-2 rounded-xl px-3.5 py-2 text-caption font-semibold transition-colors',
                    selected
                      ? 'bg-violet-700 text-white shadow-sm ring-1 ring-violet-500/30'
                      : 'border border-slate-200/90 bg-white text-ink-primary hover:border-violet-300 hover:bg-violet-50/50',
                  )}
                >
                  <BookMarked className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                  {labelForProgram(prog)}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      {showLevelRow ? (
        <div className={clsx(showProgramRow && 'pt-1 border-t border-slate-100')}>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 mb-2">Level</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Exam level">
            {levelChoices.map((lv) => {
              const selected = lv === level
              return (
                <button
                  key={lv}
                  type="button"
                  onClick={() => apply({ level: lv })}
                  className={clsx(
                    'min-h-10 min-w-[3.25rem] rounded-xl px-3.5 text-caption font-bold tabular-nums transition-colors',
                    selected
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'border border-slate-200/90 bg-white text-ink-primary hover:border-slate-300 hover:bg-slate-50',
                  )}
                >
                  {lv}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      <div className={clsx((showProgramRow || showLevelRow) && 'pt-1 border-t border-slate-100')}>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 mb-2">Exam module</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label="Exam module">
          {modalities.map((mod) => {
            const selected = mod === modality
            const icon = MODALITY_ICON[mod] ?? <Mic2 className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
            const label = labelForModality(mod)
            const available = levelsForProgramModality(profiles, program, mod).length > 0
            return (
              <button
                key={mod}
                type="button"
                disabled={!available}
                onClick={() => {
                  const levels = levelsForProgramModality(profiles, program, mod)
                  const lv = levels.includes(level) ? level : (levels[0] ?? 'A2')
                  apply({ modality: mod, level: lv })
                }}
                className={clsx(
                  'flex min-h-[3.25rem] items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-caption font-semibold transition-all',
                  selected
                    ? 'border-primary-600/50 bg-gradient-to-br from-primary-50 to-white text-primary-950 shadow-sm ring-1 ring-primary-500/25'
                    : 'border-slate-200/90 bg-white text-ink-primary hover:border-slate-300 hover:bg-slate-50/90',
                  !available && 'pointer-events-none opacity-40',
                )}
              >
                <span
                  className={clsx(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                    selected ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600',
                  )}
                >
                  {icon}
                </span>
                <span className="min-w-0 leading-tight">{label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
