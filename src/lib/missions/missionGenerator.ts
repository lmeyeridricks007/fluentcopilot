import { localDateKey } from '@/lib/retention/streak'
import { getMissionTemplate, templatesForSlot } from '@/lib/missions/missionRegistry'
import type { MissionGeneratorContext, MissionTemplateDef } from '@/lib/missions/types'

function eligible(t: MissionTemplateDef, tier: MissionGeneratorContext['tier']): boolean {
  if (t.requiresPremium && tier === 'free') return false
  return true
}

const EXAM_DAILY_IDS = [
  'd_exam_speaking_train',
  'd_exam_writing_train',
  'd_exam_listening_task',
  'd_exam_reading_task',
  'd_exam_kmn_quiz',
  'd_exam_writing_grammar_up',
  'd_exam_speaking_fluency_up',
] as const

function hashSeed(seed: string, modulo: number): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return modulo <= 0 ? 0 : h % modulo
}

function pickFromSeed(
  seed: string,
  pool: MissionTemplateDef[],
  tier: MissionGeneratorContext['tier']
): MissionTemplateDef {
  const filtered = pool.filter((t) => eligible(t, tier))
  const use = filtered.length ? filtered : pool
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return use[h % use.length]!
}

/** Deterministic variety for weekly missions */
export function pickWeeklyTemplate(ctx: MissionGeneratorContext, weekKey: string): MissionTemplateDef {
  const pool = templatesForSlot('weekly').filter((t) => eligible(t, ctx.tier))
  return pickFromSeed(
    `${ctx.tier}-${weekKey}`,
    pool.length ? pool : templatesForSlot('weekly'),
    ctx.tier
  )
}

/** Deterministic variety for skill-focus (rotates daily) */
export function pickSkillFocusTemplate(ctx: MissionGeneratorContext, dailyKey: string, userId: string): MissionTemplateDef {
  const pool = templatesForSlot('skill_focus').filter((t) => eligible(t, ctx.tier))
  return pickFromSeed(
    `${userId}-${dailyKey}-${ctx.tier}`,
    pool.length ? pool : templatesForSlot('skill_focus'),
    ctx.tier
  )
}

export function pickDailyTemplate(ctx: MissionGeneratorContext): MissionTemplateDef {
  const pool = templatesForSlot('daily').filter((t) => eligible(t, ctx.tier))
  const top = ctx.weaknessInsights[0]

  if (top?.categoryId === 'listening_fast') {
    return getMissionTemplate('d_listening_track') ?? pool[0]!
  }
  if (top?.categoryId === 'symptom_descriptions') {
    return getMissionTemplate('d_health_scenario') ?? pool[0]!
  }
  if (top?.categoryId === 'transport_questions') {
    return getMissionTemplate('d_transport_scenario') ?? pool[0]!
  }
  if (top?.categoryId === 'polite_requests' || top?.categoryId === 'conversation_repair') {
    return getMissionTemplate('d_semi_social') ?? pool[0]!
  }
  if (top?.categoryId === 'question_word_order' || top?.categoryId === 'admin_formal') {
    return getMissionTemplate('d_skill_track_any') ?? pool[0]!
  }
  if (top?.categoryId === 'speaking_fluency') {
    return getMissionTemplate('d_complete_guided') ?? pool[0]!
  }

  if (ctx.inferredCategory === 'health') {
    return getMissionTemplate('d_health_scenario') ?? pool[0]!
  }
  if (ctx.inferredCategory === 'transport') {
    return getMissionTemplate('d_transport_scenario') ?? pool[0]!
  }

  if (top && /mistake|review|fix/i.test(top.coachLine) && /weak|slip|error/i.test(top.basedOn)) {
    return getMissionTemplate('d_mistake_fix_session') ?? pool[0]!
  }

  const examTilt =
    ctx.hasExamPrepActivityThisWeek || hashSeed(`${ctx.userId ?? 'anon'}-${localDateKey()}`, 5) === 0

  if (examTilt) {
    if (top?.categoryId === 'listening_fast') {
      return getMissionTemplate('d_exam_listening_task') ?? pool[0]!
    }
    if (top?.categoryId === 'speaking_fluency') {
      return getMissionTemplate('d_exam_speaking_train') ?? pool[0]!
    }
    if (
      top?.categoryId === 'question_word_order' ||
      top?.categoryId === 'admin_formal' ||
      /grammar|schrijf|writing/i.test(top?.coachLine ?? '')
    ) {
      return getMissionTemplate('d_exam_writing_train') ?? pool[0]!
    }
    const examPool = EXAM_DAILY_IDS.map((id) => getMissionTemplate(id)).filter((t): t is MissionTemplateDef => {
      if (!t) return false
      return eligible(t, ctx.tier)
    })
    if (examPool.length) {
      return pickFromSeed(`${ctx.userId ?? 'anon'}-exam-${localDateKey()}`, examPool, ctx.tier)
    }
  }

  return getMissionTemplate('d_complete_guided') ?? pool[0]!
}
