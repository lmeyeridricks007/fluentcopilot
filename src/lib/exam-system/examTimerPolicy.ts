import type { ExamTimerKind, ExamTimerRule, ExamTrainingSupport } from './types'
import { shouldAutoAdvanceAfterAnswer } from './timerEngine'
import { trainingUsesStrictAnswerTimer } from './trainingSupportPolicy'

export function findExamTimerRule(rules: ExamTimerRule[], kind: ExamTimerKind): ExamTimerRule | undefined {
  return rules.find((r) => r.kind === kind)
}

/**
 * Training prep uses a visible countdown + auto-advance on expiry only when this returns true.
 * Soft / optional prep: full & light guidance without timed training — learner controls pacing via skip.
 */
export function trainingPrepIsTimed(options: {
  support: ExamTrainingSupport
  timedTraining: boolean
  prepRule: ExamTimerRule | undefined
}): boolean {
  if (options.support === 'almost_exam') return true
  if (options.timedTraining) return true
  if (!options.prepRule) return true
  if (!options.prepRule.optionalInTraining) return true
  return false
}

/** Submit on answer timeout (simulation: blueprint default on; training: strict or timed + rule). */
export function resolveAnswerAutoSubmitOnTimeout(options: {
  runMode: 'simulation' | 'training'
  timedTraining: boolean
  support: ExamTrainingSupport
  simAnswerRule: ExamTimerRule | undefined
  trainAnswerRule: ExamTimerRule | undefined
}): boolean {
  if (options.runMode === 'simulation') {
    return options.simAnswerRule?.autoAdvance !== false
  }
  if (trainingUsesStrictAnswerTimer(options.support, options.timedTraining)) {
    const auto = options.trainAnswerRule?.autoAdvance !== false
    return (
      shouldAutoAdvanceAfterAnswer({
        runMode: 'training',
        timedTraining: true,
        autoAdvance: auto,
      }) || options.support === 'almost_exam'
    )
  }
  if (options.timedTraining) {
    return options.trainAnswerRule?.autoAdvance === true
  }
  return false
}

/** Hard section wall clock (vs informational pace only). */
export function sectionWallIsStrict(options: {
  runMode: 'simulation' | 'training'
  timedTraining: boolean
  support: ExamTrainingSupport
  sectionRule: ExamTimerRule | undefined
}): boolean {
  if (options.runMode === 'simulation') return true
  if (options.support === 'almost_exam') return true
  if (options.timedTraining) return true
  if (!options.sectionRule) return false
  if (!options.sectionRule.optionalInTraining) return true
  return false
}
