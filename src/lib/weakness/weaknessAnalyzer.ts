import type { MistakeEvent } from '@/lib/schemas/mistakeEvent.schema'
import type { A2WeakTagCount } from '@/features/curriculum/a2ReviewStore'
import type { SkillTrackId } from '@/lib/schemas/practice/skillTrack.schema'
import type { RawWeaknessSignal } from '@/lib/weakness/types'

const MS_DAY = 86_400_000

function ageWeight(iso: string): number {
  const age = Date.now() - new Date(iso).getTime()
  if (age > 21 * MS_DAY) return 0.35
  if (age > 14 * MS_DAY) return 0.55
  if (age > 7 * MS_DAY) return 0.8
  return 1
}

function blobFromMistake(ev: MistakeEvent): string {
  const meta = ev.metadata as { mistakeTags?: string[]; category?: string } | undefined
  const tags = (meta?.mistakeTags ?? []).join(' ')
  const cat = meta?.category ?? ''
  return `${ev.errorType} ${tags} ${cat}`.toLowerCase()
}

/**
 * Turns heterogeneous learner signals into weighted tag blobs for category matching.
 */
export function analyzeWeaknessSignals(input: {
  mistakeEvents: MistakeEvent[]
  weakTags: A2WeakTagCount[]
  lastPractice: {
    tags: string[]
    scenarioId: string
    recordedAt: string
    outcome?: 'success' | 'partial' | 'needs_practice'
  } | null
  skillTrackWeakestById: Partial<Record<SkillTrackId, number>>
  masterySkills?: Partial<Record<'listening' | 'speaking' | 'reading' | 'writing', number>>
}): RawWeaknessSignal[] {
  const out: RawWeaknessSignal[] = []

  for (const ev of input.mistakeEvents) {
    const w = Math.min(5, ev.severity) * ageWeight(ev.timestamp)
    if (w < 0.2) continue
    out.push({
      id: `me-${ev.id}`,
      weight: w,
      tagBlob: blobFromMistake(ev),
      source: 'mistake_event',
      at: ev.timestamp,
    })
  }

  for (const row of input.weakTags) {
    const t = row.tag.trim().toLowerCase()
    if (!t) continue
    out.push({
      id: `wt-${t}-${row.wrongCount}`,
      weight: Math.min(12, 1.2 * row.wrongCount),
      tagBlob: t.replace(/_/g, '-'),
      source: 'weak_tag',
      at: new Date().toISOString(),
    })
  }

  if (input.lastPractice?.tags.length) {
    const fresh = Date.now() - new Date(input.lastPractice.recordedAt).getTime() < 7 * MS_DAY
    const mult = fresh ? 1.4 : 0.6
    const outcomeMult =
      input.lastPractice.outcome === 'needs_practice' ? 1.35 : input.lastPractice.outcome === 'partial' ? 1.1 : 0.85
    for (const tag of input.lastPractice.tags) {
      const t = tag.trim().toLowerCase()
      if (!t) continue
      out.push({
        id: `lp-${t}`,
        weight: 3 * mult * outcomeMult,
        tagBlob: t,
        source: 'last_practice',
        at: input.lastPractice.recordedAt,
      })
    }
    if (input.lastPractice.outcome === 'needs_practice') {
      out.push({
        id: 'lp-support-heavy',
        weight: 2.5 * mult,
        tagBlob: 'conversation-repair support practice scenario',
        source: 'last_practice',
        at: input.lastPractice.recordedAt,
      })
    }
  }

  const trackToBlob: Record<SkillTrackId, string> = {
    listening_confidence: 'listening fast speech gist audio comprehension',
    speaking_fluency: 'speaking fluency hesitation pronunciation english',
    reading_real_life: 'reading signs admin formal real life',
    writing_messages: 'writing polite word order messages',
    conversation_repair: 'repair clarify repetition conversation',
  }

  for (const tid of Object.keys(input.skillTrackWeakestById) as SkillTrackId[]) {
    const minScore = input.skillTrackWeakestById[tid]
    if (minScore == null || minScore >= 0.52) continue
    out.push({
      id: `st-${tid}`,
      weight: 2.2 * (0.52 - minScore),
      tagBlob: trackToBlob[tid] ?? tid.replace(/_/g, ' '),
      source: 'skill_track_band',
      at: new Date().toISOString(),
    })
  }

  if (input.masterySkills) {
    const { listening, speaking, reading, writing } = input.masterySkills
    if (listening != null && listening <= 1) {
      out.push({
        id: 'ms-listening',
        weight: 1.8,
        tagBlob: 'listening comprehension fast speech',
        source: 'mastery_skill',
        at: new Date().toISOString(),
      })
    }
    if (speaking != null && speaking <= 1) {
      out.push({
        id: 'ms-speaking',
        weight: 1.8,
        tagBlob: 'speaking fluency pronunciation hesitation',
        source: 'mastery_skill',
        at: new Date().toISOString(),
      })
    }
    if (reading != null && reading <= 1) {
      out.push({
        id: 'ms-reading',
        weight: 1.5,
        tagBlob: 'reading signs admin real life',
        source: 'mastery_skill',
        at: new Date().toISOString(),
      })
    }
    if (writing != null && writing <= 1) {
      out.push({
        id: 'ms-writing',
        weight: 1.5,
        tagBlob: 'writing messages word order polite',
        source: 'mastery_skill',
        at: new Date().toISOString(),
      })
    }
  }

  return out
}
