import { randomUUID } from 'node:crypto'
import type { QuickCaptureEnrichmentPayload } from '../../learningMemory/sessionInsightExtractionQuickCapture'
import type { QuickCaptureType } from '../../../repositories/quickCaptureRepository'
import type { SkillEvidence, SkillId, SkillPolarity } from '../skillTypes'
import { matchSkillsFromFreeText } from '../sessionSkillEvidenceMapper'

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(1, n))
}

function push(
  out: SkillEvidence[],
  p: {
    sessionId: string
    at: string
    polarity: SkillPolarity
    magnitude: number
    weight: number
    skillIds: SkillId[]
    source: string
    note?: string | null
  },
): void {
  const skillIds = [...new Set(p.skillIds)].filter(Boolean)
  if (!skillIds.length) return
  out.push({
    id: randomUUID(),
    sessionId: p.sessionId,
    at: p.at,
    sessionType: 'quick_capture',
    source: p.source,
    polarity: p.polarity,
    magnitude: clamp01(p.magnitude),
    weight: Math.max(0.06, p.weight),
    skillIds,
    note: p.note ?? null,
  })
}

/**
 * Capture-type → skill nudge layer (complements insight-derived evidence from {@link mapSessionInsightsToSkillEvidence}).
 */
export function extractQuickCaptureTypeSkillEvidence(params: {
  captureId: string
  atIso: string
  captureType: QuickCaptureType
  enrichment: QuickCaptureEnrichmentPayload | null
}): SkillEvidence[] {
  const out: SkillEvidence[] = []
  const w = 0.68
  const sid = params.captureId
  const t = params.atIso
  const imp = params.enrichment?.skillImpacts ?? []
  for (const row of imp.slice(0, 6)) {
    const skills = matchSkillsFromFreeText(row.skill).slice(0, 5) as SkillId[]
    if (!skills.length) continue
    const pol: SkillPolarity = row.impact === 'stretch' ? 'positive' : row.impact === 'reinforce' ? 'positive' : 'neutral'
    if (pol === 'neutral') continue
    push(out, {
      sessionId: sid,
      at: t,
      polarity: pol,
      magnitude: 0.32 + 0.12 * row.confidence,
      weight: w * (0.55 + 0.2 * row.confidence),
      skillIds: skills,
      source: `quick_capture_skill_impact:${params.captureType}`,
      note: row.skill,
    })
  }

  const base = (m: number, src: string, skills: SkillId[], note?: string) =>
    push(out, {
      sessionId: sid,
      at: t,
      polarity: 'negative',
      magnitude: m,
      weight: w * 0.72,
      skillIds: skills,
      source: src,
      note,
    })

  switch (params.captureType) {
    case 'save_word':
      base(0.38, 'quick_capture_type:word', ['vocabulary', 'pronunciation', 'natural_dutch'])
      break
    case 'save_phrase':
      base(0.36, 'quick_capture_type:phrase', ['natural_dutch', 'sentence_structure', 'word_choice'])
      break
    case 'photo_text':
    case 'paste_text':
      base(0.34, 'quick_capture_type:text_snippet', ['vocabulary', 'grammar', 'sentence_structure'])
      break
    case 'add_place':
      base(0.3, 'quick_capture_type:place', ['response_readiness', 'service_replies', 'natural_dutch'])
      break
    case 'log_struggle':
      base(0.44, 'quick_capture_type:struggle', [
        'fluency',
        'asking_questions',
        'repair_clarification',
        'gist_understanding',
        'grammar',
        'response_readiness',
      ])
      break
    case 'voice_note':
      base(0.42, 'quick_capture_type:voice', [
        'fluency',
        'pronunciation',
        'natural_dutch',
        'response_readiness',
        'gist_understanding',
      ])
      break
    default:
      break
  }
  return out
}
