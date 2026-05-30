import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import { getScenarioCatalogEntry } from '@/lib/practice/scenarioCatalog'
import { getRetentionUserId } from '@/lib/retention/retentionService'
import { PRACTICE_DOMAIN_BASE_KEYS, userScopedLocalKey } from '@/lib/storage/storageKeys'
import type { PracticeConversationMode } from '@/lib/schemas/practice/practiceShared.schema'
import type { SessionOutcome } from '@/lib/practice-feedback/types'
import type { MilestoneHit } from '@/lib/retention/types'

const MILESTONE_BASE = PRACTICE_DOMAIN_BASE_KEYS.practiceMilestoneSeen

function milestoneKey(): string {
  if (typeof window === 'undefined') return MILESTONE_BASE
  return userScopedLocalKey(MILESTONE_BASE, getRetentionUserId())
}

function readSeen(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(milestoneKey())
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as string[]
    return new Set(Array.isArray(arr) ? arr : [])
  } catch {
    return new Set()
  }
}

function writeSeen(seen: Set<string>): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(milestoneKey(), JSON.stringify([...seen]))
  } catch {
    /* quota */
  }
}

function pushOnce(
  seen: Set<string>,
  id: string,
  hit: MilestoneHit,
  out: MilestoneHit[]
): void {
  if (seen.has(id)) return
  seen.add(id)
  out.push(hit)
  track(ANALYTICS_EVENTS.practice_milestone_reached, { milestoneId: id, title: hit.title })
}

/**
 * Lightweight practice-first milestones (distinct from lesson streak milestones in retention).
 */
export function detectPracticeMilestones(input: {
  scenarioId: string
  mode: PracticeConversationMode
  outcome: SessionOutcome
  userTurnCount: number
}): MilestoneHit[] {
  if (typeof window === 'undefined') return []
  if (input.userTurnCount < 2) return []
  if (input.outcome === 'needs_practice') return []

  const seen = readSeen()
  const out: MilestoneHit[] = []
  const entry = getScenarioCatalogEntry(input.scenarioId)

  pushOnce(seen, 'practice_first_meaningful_session', {
    id: 'practice_first_meaningful_session',
    title: 'Practice that counts',
    body: 'You finished a real conversational rep — this builds Dutch you can use.',
  }, out)

  if (input.mode === 'guided') {
    pushOnce(seen, 'practice_first_guided', {
      id: 'practice_first_guided',
      title: 'First guided scenario wrap-up',
      body: 'Structured practice is a fast path from “studying” to “using” Dutch.',
    }, out)
  }
  if (input.mode === 'semi_guided') {
    pushOnce(seen, 'practice_first_semi', {
      id: 'practice_first_semi',
      title: 'First semi-guided conversation',
      body: 'You carried more of the dialogue — that’s how independence grows.',
    }, out)
  }
  if (input.mode === 'free') {
    pushOnce(seen, 'practice_first_free', {
      id: 'practice_first_free',
      title: 'First open conversation',
      body: 'Free mode is the closest to real life — nice milestone.',
    }, out)
  }

  if (entry?.category) {
    const cid = `practice_category_first_${entry.category}`
    pushOnce(
      seen,
      cid,
      {
        id: cid,
        title: `First finish in ${entry.category}`,
        body: `You’ve completed a scenario in this life area — breadth matters.`,
      },
      out
    )
  }

  writeSeen(seen)
  return out
}

export function detectSkillTrackMilestones(input: { trackId: string; passed: boolean }): MilestoneHit[] {
  if (typeof window === 'undefined' || !input.passed) return []
  const seen = readSeen()
  const out: MilestoneHit[] = []
  pushOnce(seen, 'practice_first_skill_track_pass', {
    id: 'practice_first_skill_track_pass',
    title: 'Skill track level cleared',
    body: 'Micro-drills add up — this keeps listening, writing, and repair sharp.',
  }, out)
  writeSeen(seen)
  return out
}
