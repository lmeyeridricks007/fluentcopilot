/**
 * Derives Coach “daily recap” bullets from local session activity + weak signals.
 * No network — reads Zustand stores via getState (safe in client components).
 */
import { loadWeakTags } from '@/features/curriculum/a2ReviewStore'
import { useSessionActivityStore } from '@/store/sessionActivityStore'
import { usePersonalLibraryStore } from '@/store/personalLibraryStore'

export type DailyRecapVm = {
  practicedLines: string[]
  improvedLines: string[]
  slippedLines: string[]
  tomorrowLines: string[]
  empty: boolean
}

function localDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isToday(iso: string): boolean {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return false
  return localDayKey(new Date(t)) === localDayKey(new Date())
}

export function buildDailyRecapVm(): DailyRecapVm {
  const events = useSessionActivityStore.getState().events.filter((e) => isToday(e.at))
  const weak = loadWeakTags()
  const words = usePersonalLibraryStore.getState().words

  const practiced: string[] = []
  const outcomes = events.filter((e) => e.kind === 'open_practice' || e.kind === 'guided')
  if (outcomes.length === 0) {
    practiced.push('No finished conversation logged yet today — start a short thread in Talk.')
  } else {
    for (const e of outcomes.slice(0, 4)) {
      const label = e.title ?? e.scenarioId ?? 'Practice'
      const tail =
        e.outcome && e.turnCount != null
          ? ` · ${e.outcome} · ${e.turnCount} turns`
          : e.outcome
            ? ` · ${e.outcome}`
            : ''
      practiced.push(`${label}${tail}`)
    }
  }

  const improved: string[] = []
  if (outcomes.some((o) => o.outcome === 'success')) {
    improved.push('At least one scenario closed cleanly — keep that rhythm tomorrow.')
  }
  if (words.length > 0 && events.some((e) => e.kind === 'read_aloud')) {
    improved.push('You ran read-aloud — good for pacing and exam-style speaking.')
  }
  if (events.some((e) => e.kind === 'listening')) {
    improved.push('You finished a Listening burst — great for ear training and real-world Dutch.')
  }
  if (improved.length === 0) {
    improved.push('Keep one focused Talk rep; small wins compound.')
  }

  const slipped: string[] = []
  if (weak.length > 0) {
    slipped.push(
      `Review queue has patterns to revisit — ${weak.length} item${weak.length === 1 ? '' : 's'} tagged for fix-ups.`
    )
  }
  if (outcomes.some((o) => o.outcome === 'needs_practice' || o.outcome === 'partial')) {
    slipped.push('A recent thread still needs polish — Coach queued the likely slips.')
  }
  if (slipped.length === 0) {
    slipped.push('No urgent slip surfaced in local data — still worth one sharp rep in Talk.')
  }

  const tomorrow: string[] = []
  if (weak[0]) {
    tomorrow.push(`Tackle weak-tag practice tied to: ${weak[0].tag ?? 'recent mistakes'}.`)
  }
  tomorrow.push('Continue your Dutch thread — message or voice, same scene if it helps.')

  const empty = outcomes.length === 0 && weak.length === 0

  return {
    practicedLines: practiced,
    improvedLines: improved,
    slippedLines: slipped,
    tomorrowLines: tomorrow,
    empty,
  }
}
