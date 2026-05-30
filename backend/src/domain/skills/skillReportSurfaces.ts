/**
 * Concise cross-session skill lines for reports — max a few, non-repetitive with session echo.
 */
import { getSkillDefinition } from './skillDefinitions'
import { skillTrendUserLabel } from './skillUxLabels'
import type { UserSkillProfile } from './skillTypes'

function normHint(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 96)
}

function hintsOverlap(a: string, b: string): boolean {
  const na = normHint(a)
  const nb = normHint(b)
  if (!na || !nb) return false
  if (na === nb) return true
  if (na.length >= 12 && nb.length >= 12 && (na.includes(nb) || nb.includes(na))) return true
  return false
}

function overlapsAny(line: string, set: string[]): boolean {
  return set.some((x) => hintsOverlap(line, x))
}

export function buildSkillReportInsightLines(params: {
  userSkillProfile: UserSkillProfile | null | undefined
  sessionWeakHints: string[]
  /** Profile cold start — caller passes doc.totalSessionsObserved < 2 */
  coldStart: boolean
  max?: number
}): string[] {
  const max = params.max ?? 3
  if (params.coldStart || !params.userSkillProfile) return []
  const profile = params.userSkillProfile
  const blockHints = [...params.sessionWeakHints].filter(Boolean)
  const out: string[] = []

  const push = (line: string) => {
    const t = line.trim()
    if (!t || out.length >= max) return
    if (out.some((x) => hintsOverlap(x, t))) return
    if (overlapsAny(t, blockHints)) return
    out.push(t)
  }

  const focus = profile.currentFocusSkills[0]
  if (focus) {
    const def = getSkillDefinition(focus)
    push(`Across sessions, a useful focus is ${def.label.toLowerCase()} — ${def.shortDescription.toLowerCase().replace(/\.$/, '')}.`)
  }

  for (const sid of profile.strongestSkills.slice(0, 2)) {
    const m = profile.metrics[sid]
    if (!m || m.score < 72) continue
    const def = getSkillDefinition(sid)
    const trend = skillTrendUserLabel(m.trend, m.evidenceCount, m.confidence)
    if (trend === 'improving') {
      push(`Your ${def.label.toLowerCase()} is improving — keep the momentum with short, steady reps.`)
    } else {
      push(`You’re strong in ${def.label.toLowerCase()} — lean on it when a conversation needs confidence.`)
    }
    break
  }

  for (const sid of profile.weakestSkills.slice(0, 3)) {
    const m = profile.metrics[sid]
    if (!m) continue
    if (sid === focus) continue
    const def = getSkillDefinition(sid)
    if (m.trend === 'down' && m.evidenceCount >= 5) {
      push(`${def.label} still wants more reps — small daily bursts beat long cramming.`)
      break
    }
  }

  const rec = profile.recommendations?.primary
  if (rec?.title && out.length < max) {
    push(`${rec.title} — ${rec.subtitle}`.replace(/\s+/g, ' ').trim().slice(0, 220))
  }

  return out.slice(0, max)
}
