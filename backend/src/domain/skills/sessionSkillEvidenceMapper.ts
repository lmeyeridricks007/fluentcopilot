/**
 * Maps normalized session learning insights → skill evidence rows (dedicated layer; not scattered in UI).
 */
import { randomUUID } from 'node:crypto'
import type { SessionLearningInsights } from '../learningMemory/sessionLearningInsightTypes'
import type { SkillEvidence, SkillId, SkillPolarity } from './skillTypes'
import { skillsForScenarioSlug } from './scenarioSkillTags'

export type SkillSessionContext = {
  nowIso: string
  scenarioId: string | null
  scenarioSlugNorm: string | null
  sessionType: 'speak_live' | 'text_conversation' | 'read_aloud' | 'listening' | 'quick_capture'
  sessionTypeWeight: number
}

const SUBSKILL_HINTS: Array<{ re: RegExp; skills: SkillId[] }> = [
  { re: /follow[-\s]?up|doorvrag|vervolg/i, skills: ['follow_up_questions', 'keeping_flow'] },
  { re: /question|vrag|inversie/i, skills: ['asking_questions', 'sentence_structure', 'grammar'] },
  { re: /clarif|repair|herhalen|nogmaals|begrip/i, skills: ['repair_clarification', 'asking_questions'] },
  { re: /flow|ritme|tempo|pace|pause|pauze/i, skills: ['keeping_flow', 'pacing', 'fluency'] },
  { re: /turn|interrupt|overlap|wacht/i, skills: ['turn_taking', 'keeping_flow'] },
  { re: /story|narratief|vertell/i, skills: ['storytelling', 'sequencing', 'fluency'] },
  { re: /structuur|opbouw|eerst.*dan/i, skills: ['response_structure', 'sequencing', 'explaining'] },
  { re: /woordkeuze|keuze woord|precisie/i, skills: ['word_choice', 'natural_dutch'] },
  { re: /woordenschat|vocab|lemma/i, skills: ['vocabulary', 'word_choice'] },
  { re: /grammar|werkwoord|tijd|vorm|zin\b/i, skills: ['grammar', 'sentence_structure'] },
  { re: /pronun|uitspraak|klinker|medeklinker|stress/i, skills: ['pronunciation', 'fluency'] },
  { re: /opinion|mening|standpunt/i, skills: ['opinions', 'reasoning'] },
  { re: /nuance|subtiel|afzwakken/i, skills: ['nuance', 'word_choice'] },
  { re: /vergelijk|contrast|enerzijds/i, skills: ['contrast_comparison', 'reasoning'] },
  { re: /disagree|tegen|maar.*wel|boundary/i, skills: ['softer_disagreement', 'nuance'] },
  { re: /react|bevestig|acknowled|stemming/i, skills: ['reacting', 'keeping_flow'] },
  { re: /explain|uitleg|stap/i, skills: ['explaining', 'step_by_step_speaking', 'response_structure'] },
]

/** Shared by report-level skill extractors and the session-insights mapper. */
export function matchSkillsFromFreeText(text: string): SkillId[] {
  const out: SkillId[] = []
  const t = text.toLowerCase()
  for (const row of SUBSKILL_HINTS) {
    if (row.re.test(t)) {
      for (const s of row.skills) {
        if (!out.includes(s)) out.push(s)
      }
    }
  }
  return out
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(1, n))
}

function severityToMagnitude(severityScore: number, confidence: number): number {
  const base = clamp01(severityScore / 3) * 0.55 + clamp01(confidence) * 0.45
  return clamp01(base * 0.92 + 0.05)
}

function pushEvidence(
  out: SkillEvidence[],
  params: {
    sessionId: string
    at: string
    sessionType: SkillEvidence['sessionType']
    source: string
    polarity: SkillPolarity
    magnitude: number
    weight: number
    skillIds: SkillId[]
    note?: string | null
  },
): void {
  const skillIds = [...new Set(params.skillIds)].filter(Boolean)
  if (!skillIds.length && params.polarity !== 'neutral') return
  if (!skillIds.length) return
  out.push({
    id: randomUUID(),
    sessionId: params.sessionId,
    at: params.at,
    sessionType: params.sessionType,
    source: params.source,
    polarity: params.polarity,
    magnitude: clamp01(params.magnitude),
    weight: Math.max(0.05, params.weight),
    skillIds,
    note: params.note ?? null,
  })
}

export function mapSessionInsightsToSkillEvidence(
  insights: SessionLearningInsights,
  ctx: SkillSessionContext,
): SkillEvidence[] {
  const out: SkillEvidence[] = []
  const w = ctx.sessionTypeWeight
  const slugSkills = skillsForScenarioSlug(ctx.scenarioSlugNorm)

  for (const v of insights.weakWords ?? []) {
    const mag = severityToMagnitude(v.severityScore, v.confidence)
    pushEvidence(out, {
      sessionId: insights.sessionId,
      at: ctx.nowIso,
      sessionType: insights.sessionType,
      source: `weak_vocab:${v.source}`,
      polarity: 'negative',
      magnitude: mag,
      weight: w * (0.85 + 0.08 * Math.min(1, v.evidenceRefs?.length ?? 0)),
      skillIds: ['vocabulary', 'word_choice', 'natural_dutch'],
      note: v.displayText,
    })
  }

  for (const p of insights.weakPatterns ?? []) {
    const mag = severityToMagnitude(p.severityScore, p.confidence)
    const fromLabel = matchSkillsFromFreeText(`${p.label} ${p.patternId} ${p.explanation ?? ''}`)
    const skillIds = (
      fromLabel.length
        ? fromLabel
        : (['grammar', 'sentence_structure'] as SkillId[])
    ).slice(0, 5)
    pushEvidence(out, {
      sessionId: insights.sessionId,
      at: ctx.nowIso,
      sessionType: insights.sessionType,
      source: `weak_pattern:${p.source}`,
      polarity: 'negative',
      magnitude: mag,
      weight: w * 0.95,
      skillIds,
      note: p.label,
    })
  }

  for (const pr of insights.pronunciationIssues ?? []) {
    const mag = severityToMagnitude(pr.severityScore, pr.confidence)
    const it = `${pr.issueType}`.toLowerCase()
    const skills: SkillId[] = ['pronunciation', 'fluency']
    if (/pace|tempo|ritme|rhythm/i.test(it)) skills.push('pacing')
    pushEvidence(out, {
      sessionId: insights.sessionId,
      at: ctx.nowIso,
      sessionType: insights.sessionType,
      source: `pronunciation:${pr.source}`,
      polarity: 'negative',
      magnitude: mag,
      weight: w * 1.02,
      skillIds: skills,
      note: pr.targetKey,
    })
  }

  for (const h of insights.hesitationIssues ?? []) {
    const mag = severityToMagnitude(h.severityScore, h.confidence)
    const pid = `${h.patternId}`.toLowerCase()
    const skills: SkillId[] = ['fluency', 'pacing']
    if (/question|q\b/i.test(pid)) skills.push('asking_questions')
    if (/verb|prep|key/i.test(pid)) skills.push('keeping_flow')
    pushEvidence(out, {
      sessionId: insights.sessionId,
      at: ctx.nowIso,
      sessionType: insights.sessionType,
      source: `hesitation:${h.signalSource ?? h.patternId}`,
      polarity: 'negative',
      magnitude: mag * 0.9,
      weight: w * 0.88,
      skillIds: [...new Set(skills)],
      note: h.label,
    })
  }

  for (const s of insights.strengths ?? []) {
    const mag = severityToMagnitude(s.severityScore, s.confidence) * 0.85
    const fromLabel = matchSkillsFromFreeText(s.label)
    const skillIds =
      fromLabel.length > 0
        ? fromLabel
        : slugSkills.length
          ? slugSkills.slice(0, 4)
          : (['fluency', 'natural_dutch'] as SkillId[])
    pushEvidence(out, {
      sessionId: insights.sessionId,
      at: ctx.nowIso,
      sessionType: insights.sessionType,
      source: `strength:${s.source}`,
      polarity: 'positive',
      magnitude: Math.max(0.12, mag),
      weight: w * 0.75,
      skillIds: skillIds.slice(0, 6),
      note: s.label,
    })
  }

  const perf = insights.scenarioPerformance
  if (perf?.scenarioId || perf?.scenarioSlug) {
    for (const ws of perf.weakSubskills ?? []) {
      const skills = matchSkillsFromFreeText(ws)
      if (!skills.length) continue
      pushEvidence(out, {
        sessionId: insights.sessionId,
        at: ctx.nowIso,
        sessionType: insights.sessionType,
        source: 'scenario_perf:weak_subskill',
        polarity: 'negative',
        magnitude: 0.42,
        weight: w * 0.72,
        skillIds: skills.slice(0, 4),
        note: ws,
      })
    }
    for (const ss of perf.strongSubskills ?? []) {
      const skills = matchSkillsFromFreeText(ss)
      if (!skills.length) continue
      pushEvidence(out, {
        sessionId: insights.sessionId,
        at: ctx.nowIso,
        sessionType: insights.sessionType,
        source: 'scenario_perf:strong_subskill',
        polarity: 'positive',
        magnitude: 0.38,
        weight: w * 0.68,
        skillIds: skills.slice(0, 4),
        note: ss,
      })
    }
    const rs = perf.recentScore ?? perf.rollingScore
    if (typeof rs === 'number' && Number.isFinite(rs)) {
      const polarity: SkillPolarity = rs >= 78 ? 'positive' : rs <= 62 ? 'negative' : 'neutral'
      if (polarity === 'neutral') {
        /* skip diffuse scenario-level neutral — avoids noise */
      } else {
        const mag = clamp01(Math.abs(rs - 70) / 40)
        const baseSkills =
          slugSkills.length > 0 ? slugSkills.slice(0, 5) : (['fluency', 'keeping_flow'] as SkillId[])
        pushEvidence(out, {
          sessionId: insights.sessionId,
          at: ctx.nowIso,
          sessionType: insights.sessionType,
          source: 'scenario_perf:score',
          polarity,
          magnitude: Math.max(0.15, mag),
          weight: w * 0.55 * clamp01((perf.confidence ?? 0.4) + 0.2),
          skillIds: baseSkills,
        })
      }
    }
  }

  return out
}
