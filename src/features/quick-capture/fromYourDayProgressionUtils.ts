import type { QuickCaptureItem } from '@/lib/api/quickCaptureClient'
import type { PracticePackMode } from '@/features/quick-capture/dayPackFromCaptures'

export function inferPracticePackModeFromSteps(steps: { kind: string; mode?: string }[]): PracticePackMode {
  const meta = steps.find((s) => s.kind === 'pack_meta') as { kind: string; mode?: PracticePackMode } | undefined
  if (meta?.mode === 'quick_rep' || meta?.mode === 'standard' || meta?.mode === 'deeper_debrief') {
    return meta.mode
  }
  const visible = steps.filter((s) => s.kind !== 'pack_meta')
  const n = visible.length
  const deep =
    visible.filter((s) => s.kind === 'coach_debrief' || s.kind === 'mini_scenario').length >= 2
  if (deep) return 'deeper_debrief'
  if (n <= 4) return 'quick_rep'
  return 'standard'
}

export function collectStruggleSignalsFromCaptures(captures: QuickCaptureItem[], max = 8): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const c of captures) {
    const raw = c.enrichedJson?.trim()
    if (!raw) continue
    try {
      const j = JSON.parse(raw) as { struggleSignals?: unknown }
      if (!Array.isArray(j.struggleSignals)) continue
      for (const s of j.struggleSignals) {
        if (typeof s !== 'string' || !s.trim()) continue
        const t = s.trim()
        const k = t.toLowerCase()
        if (seen.has(k)) continue
        seen.add(k)
        out.push(t)
        if (out.length >= max) return out
      }
    } catch {
      continue
    }
  }
  return out
}
