import type { RetentionProfile } from '@/lib/retention/types'
import {
  XP_EXAM_FIRST_SPEAKING_SIM_BONUS,
  XP_EXAM_IMPROVEMENT_BONUS_MAX,
  XP_EXAM_IMPROVEMENT_BONUS_MIN,
  XP_EXAM_KMN_QUIZ_MAX,
  XP_EXAM_KMN_QUIZ_MIN,
  XP_EXAM_MICRO_TASK_MAX,
  XP_EXAM_MICRO_TASK_MIN,
  XP_EXAM_PASS_PRACTICE_EXAM_BONUS,
  XP_EXAM_PRACTICE_EXAM_MAX,
  XP_EXAM_PRACTICE_EXAM_MIN,
  XP_EXAM_READINESS_READY_BONUS,
  XP_EXAM_SIMULATION_MAX,
  XP_EXAM_SIMULATION_MIN,
  XP_EXAM_SPEAKING_TRAINING_MAX,
  XP_EXAM_SPEAKING_TRAINING_MIN,
  XP_EXAM_WRITING_TASK_MAX,
  XP_EXAM_WRITING_TASK_MIN,
  XP_EXAM_HABIT_STREAK_BONUS,
  lerpXp,
} from '@/lib/exam-rewards/examXpPolicy'
import {
  applyExamHabitActivity,
  examHabitMilestoneCrossed,
  readExamHabitStreak,
} from '@/lib/exam-rewards/examHabitStreak'
import type { ExamPrepRetentionInput, ExamRewardComputation } from '@/lib/exam-rewards/types'

function readMetaNumber(meta: Record<string, unknown>, key: string): number | null {
  const v = meta[key]
  return typeof v === 'number' && !Number.isNaN(v) ? v : null
}

function scaleImprovementBonus(deltaNorm: number): number {
  const t = Math.min(1, Math.max(0, deltaNorm / 20))
  return Math.round(XP_EXAM_IMPROVEMENT_BONUS_MIN + (XP_EXAM_IMPROVEMENT_BONUS_MAX - XP_EXAM_IMPROVEMENT_BONUS_MIN) * t)
}

function moduleLabel(m: 'speaking' | 'writing' | 'listening' | 'reading' | 'kmn'): string {
  switch (m) {
    case 'speaking':
      return 'Speaking'
    case 'writing':
      return 'Writing'
    case 'listening':
      return 'Listening'
    case 'reading':
      return 'Reading'
    case 'kmn':
      return 'KNM'
    default:
      return 'Exam'
  }
}

export function computeExamPrepRewardPlan(
  profile: RetentionProfile,
  input: ExamPrepRetentionInput,
  todayKey: string
): ExamRewardComputation {
  const meta = profile.metadata
  const seen = new Set(profile.milestones.seenIds)
  const milestones: ExamRewardComputation['milestones'] = []
  const seenIdsToAppend: string[] = []
  const metadataUpdates: Record<string, unknown> = {}

  let antiFarmRef = 'generic'
  let baseXpRaw = 16
  let qualifiesMainStreak = true
  let improvementBonusXp = 0
  const missionNotify: ExamRewardComputation['missionNotify'] = {
    domain: 'speaking',
    mode: 'training',
  }

  const habitPrev = readExamHabitStreak(meta)
  const habitBefore = habitPrev.current

  let primary = 'Exam prep completed'
  let secondary: string | undefined
  let badge: string | undefined

  switch (input.kind) {
    case 'speaking_training_session': {
      antiFarmRef = `speak-train-${input.questionCount}`
      baseXpRaw = lerpXp(
        XP_EXAM_SPEAKING_TRAINING_MIN,
        XP_EXAM_SPEAKING_TRAINING_MAX,
        input.averageNormalizedPercent / 100
      )
      qualifiesMainStreak =
        input.passesCount >= 1 || input.averageNormalizedPercent >= 42 || input.outcome !== 'needs_practice'
      missionNotify.domain = 'speaking'
      missionNotify.mode = 'training'
      missionNotify.normalizedPercent = input.averageNormalizedPercent
      missionNotify.categoryScores = input.categoryScores
      primary = `+${baseXpRaw} XP — speaking training`
      const last = readMetaNumber(meta, 'exam_last_speaking_training_avg')
      if (last !== null && input.averageNormalizedPercent >= last + 5) {
        improvementBonusXp = scaleImprovementBonus(input.averageNormalizedPercent - last)
        secondary = 'Improvement bonus — stronger than your last speaking session.'
      }
      metadataUpdates.exam_last_speaking_training_avg = input.averageNormalizedPercent
      break
    }
    case 'speaking_simulation_session': {
      antiFarmRef = 'speak-sim'
      baseXpRaw = lerpXp(
        XP_EXAM_SIMULATION_MIN,
        XP_EXAM_SIMULATION_MAX,
        input.averageNormalizedPercent / 100
      )
      qualifiesMainStreak = input.averageNormalizedPercent >= 38
      missionNotify.domain = 'speaking'
      missionNotify.mode = 'simulation'
      missionNotify.normalizedPercent = input.averageNormalizedPercent
      missionNotify.categoryScores = input.categoryScores
      primary = `+${baseXpRaw} XP — speaking simulation`
      const firstId = 'exam_first_speaking_simulation'
      if (!seen.has(firstId)) {
        seenIdsToAppend.push(firstId)
        milestones.push({
          id: firstId,
          title: 'First speaking simulation',
          body: 'Timed, exam-style pressure — useful data for exam day.',
          bonusXp: XP_EXAM_FIRST_SPEAKING_SIM_BONUS,
        })
        badge = 'First speaking simulation complete'
      }
      const last = readMetaNumber(meta, 'exam_last_speaking_sim_avg')
      if (last !== null && input.averageNormalizedPercent >= last + 5) {
        improvementBonusXp = Math.max(
          improvementBonusXp,
          scaleImprovementBonus(input.averageNormalizedPercent - last)
        )
        secondary = secondary ?? 'Improvement bonus — higher score than your last simulation.'
      }
      metadataUpdates.exam_last_speaking_sim_avg = input.averageNormalizedPercent
      break
    }
    case 'writing_training_task': {
      antiFarmRef = `write-task-${input.pass ? 'ok' : 'retry'}`
      baseXpRaw = lerpXp(
        XP_EXAM_WRITING_TASK_MIN,
        XP_EXAM_WRITING_TASK_MAX,
        input.normalizedPercent / 100
      )
      qualifiesMainStreak = input.pass || input.normalizedPercent >= 45
      missionNotify.domain = 'writing'
      missionNotify.mode = 'training'
      missionNotify.normalizedPercent = input.normalizedPercent
      missionNotify.categoryScores = input.categoryScores
      primary = `+${baseXpRaw} XP — writing practice`
      const last = readMetaNumber(meta, 'exam_last_writing_training_norm')
      if (last !== null && input.normalizedPercent >= last + 5) {
        improvementBonusXp = scaleImprovementBonus(input.normalizedPercent - last)
        secondary = 'Improvement bonus — stronger writing score than last time.'
      }
      metadataUpdates.exam_last_writing_training_norm = input.normalizedPercent
      break
    }
    case 'writing_simulation_session': {
      antiFarmRef = 'write-sim'
      baseXpRaw = lerpXp(
        XP_EXAM_SIMULATION_MIN,
        XP_EXAM_SIMULATION_MAX,
        input.averageNormalizedPercent / 100
      )
      qualifiesMainStreak = input.averageNormalizedPercent >= 38
      missionNotify.domain = 'writing'
      missionNotify.mode = 'simulation'
      missionNotify.normalizedPercent = input.averageNormalizedPercent
      missionNotify.categoryScores = input.categoryScores
      primary = `+${baseXpRaw} XP — writing simulation`
      const last = readMetaNumber(meta, 'exam_last_writing_sim_avg')
      if (last !== null && input.averageNormalizedPercent >= last + 5) {
        improvementBonusXp = Math.max(
          improvementBonusXp,
          scaleImprovementBonus(input.averageNormalizedPercent - last)
        )
        secondary = secondary ?? 'Improvement bonus — higher than your last writing simulation.'
      }
      metadataUpdates.exam_last_writing_sim_avg = input.averageNormalizedPercent
      break
    }
    case 'listening_training_task': {
      antiFarmRef = `listen-${input.taskId}`
      baseXpRaw = lerpXp(XP_EXAM_MICRO_TASK_MIN, XP_EXAM_MICRO_TASK_MAX, input.correct ? 0.92 : 0.45)
      qualifiesMainStreak = true
      missionNotify.domain = 'listening'
      missionNotify.mode = 'training'
      missionNotify.normalizedPercent = input.correct ? 100 : 40
      primary = `+${baseXpRaw} XP — listening item`
      break
    }
    case 'reading_training_task': {
      antiFarmRef = `read-${input.taskId}`
      baseXpRaw = lerpXp(XP_EXAM_MICRO_TASK_MIN, XP_EXAM_MICRO_TASK_MAX, input.correct ? 0.92 : 0.45)
      qualifiesMainStreak = true
      missionNotify.domain = 'reading'
      missionNotify.mode = 'training'
      missionNotify.normalizedPercent = input.correct ? 100 : 40
      primary = `+${baseXpRaw} XP — reading item`
      break
    }
    case 'kmn_quiz_round': {
      antiFarmRef = `kmn-quiz-${input.topicId}`
      const qc = Math.max(1, input.questionCount)
      baseXpRaw = lerpXp(XP_EXAM_KMN_QUIZ_MIN, XP_EXAM_KMN_QUIZ_MAX, Math.min(1, qc / 5))
      qualifiesMainStreak = qc >= 3
      missionNotify.domain = 'kmn'
      missionNotify.mode = 'training'
      primary = `+${baseXpRaw} XP — KNM quiz round`
      break
    }
    case 'practice_exam': {
      antiFarmRef = `pe-${input.module}-${input.setId}`
      baseXpRaw = lerpXp(
        XP_EXAM_PRACTICE_EXAM_MIN,
        XP_EXAM_PRACTICE_EXAM_MAX,
        input.averagePercent / 100
      )
      qualifiesMainStreak = input.passedRatio >= 0.35
      missionNotify.domain = input.module
      missionNotify.mode = 'practice_exam'
      missionNotify.normalizedPercent = input.averagePercent
      missionNotify.categoryScores = input.categoryScores
      primary = `+${baseXpRaw} XP — practice exam`

      if (input.compareDelta === 'improved' && input.deltaPoints != null && input.deltaPoints >= 3) {
        improvementBonusXp = scaleImprovementBonus(input.deltaPoints)
        secondary = `Improvement bonus — up ${Math.round(input.deltaPoints)} points vs your last attempt on this set.`
      }

      if (input.passedRatio >= 0.55) {
        const passId = `exam_pass_pe_${input.module}_${input.setId}`
        if (!seen.has(passId)) {
          seenIdsToAppend.push(passId)
          milestones.push({
            id: passId,
            title: `${moduleLabel(input.module)} practice exam passed`,
            body: 'Solid run — keep weak categories in review between attempts.',
            bonusXp: XP_EXAM_PASS_PRACTICE_EXAM_BONUS,
          })
          badge = `${moduleLabel(input.module)} practice exam passed`
        }
      }

      if (input.readinessState === 'ready') {
        const readyId = `exam_readiness_ready_${input.module}`
        if (!seen.has(readyId)) {
          seenIdsToAppend.push(readyId)
          milestones.push({
            id: readyId,
            title: `${moduleLabel(input.module)} looks exam-ready`,
            body: 'Recent attempts look stable enough to plan a confident exam timeline.',
            bonusXp: XP_EXAM_READINESS_READY_BONUS,
          })
          badge = badge ?? `${moduleLabel(input.module)} is exam-ready`
        }
      }
      break
    }
  }

  const { next: habitNext, extendedCount: habitExtended } = qualifiesMainStreak
    ? applyExamHabitActivity(habitPrev, todayKey)
    : { next: habitPrev, extendedCount: false }

  metadataUpdates.examPrepHabitStreak = habitNext

  const crossed = qualifiesMainStreak
    ? examHabitMilestoneCrossed(habitBefore, habitNext.current)
    : null
  if (crossed && XP_EXAM_HABIT_STREAK_BONUS[crossed]) {
    const bonus = XP_EXAM_HABIT_STREAK_BONUS[crossed]!
    milestones.push({
      id: `exam_habit_streak_${crossed}_${todayKey}`,
      title: `${crossed}-day exam-prep streak`,
      body: 'Short, focused exam sessions add up — keep tomorrow light but honest.',
      bonusXp: bonus,
    })
    secondary = secondary ?? `Exam-prep habit: ${crossed} days in a row.`
  }

  return {
    antiFarmRef,
    baseXpRaw,
    qualifiesMainStreak,
    improvementBonusXp,
    examHabitStreakNext: habitNext,
    examHabitExtended: habitExtended,
    examHabitMilestoneDay: crossed,
    milestones,
    seenIdsToAppend,
    metadataUpdates,
    missionNotify,
    summaryLines: { primary, secondary, badge },
  }
}
