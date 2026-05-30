/**
 * Core enumerations for Personalized Training Loops (no payload imports — safe for layering).
 */

export type TrainingLoopType =
  | 'weak_words'
  | 'retry_sentence'
  | 'mini_scenario'
  | 'read_aloud_fix'
  | 'structure_drill'
  | 'pronunciation_drill'
  | 'question_drill'
  | 'storytelling_drill'
  /** Listening-mode personalized reps (typed payload on the loop row). */
  | 'listening_burst'
  | 'missed_detail_retry'
  | 'fast_speech_burst'
  | 'listen_and_reply'
  | 'route_detail_drill'
  | 'number_time_drill'

export type TrainingLoopStatus = 'active' | 'in_progress' | 'completed' | 'dismissed' | 'stale'

export type TrainingLoopDifficulty = 'easy' | 'moderate' | 'stretch'

export type TrainingLoopSourceType =
  | 'scenario'
  | 'coach'
  | 'chat'
  | 'read_aloud'
  | 'listening'
  | 'quick_capture'

export type TrainingLoopConfidence = 'low' | 'medium' | 'high'

export type LoopSlot = 0 | 1 | 2

/** Audit / history row — what happened to a loop. */
export type TrainingLoopEventType = 'started' | 'completed' | 'dismissed' | 'stale_marked' | 'patched'
