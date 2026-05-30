/**
 * Target structure for Inburgering A2 exam-style simulations (DUO-oriented product assumptions).
 * Content banks may be smaller; builders cycle items to reach these counts where needed.
 */

export const DUO_READING_MCQ_COUNT = 25
export const DUO_READING_DURATION_SEC = 65 * 60

export const DUO_LISTENING_MCQ_COUNT = 25
export const DUO_LISTENING_DURATION_SEC = 40 * 60

export const DUO_WRITING_TASK_COUNT = 4
export const DUO_WRITING_DURATION_SEC = 40 * 60

/** 2025 speaking format: product uses a fixed session size within official 16–24 range. */
export const DUO_SPEAKING_2025_QUESTION_COUNT = 18
export const DUO_SPEAKING_2025_DURATION_SEC = 35 * 60
export const DUO_SPEAKING_2025_VIDEO_COUNT = 4
export const DUO_SPEAKING_2025_PICTURE_COUNT = 12
export const DUO_SPEAKING_2025_CONVERSATION_COUNT = 2

export const DUO_KNM_MCQ_COUNT = 40
export const DUO_KNM_DURATION_SEC = 45 * 60

/** Multiple-choice modules: approximate DUO pass band (~70%). */
export const DUO_READING_PASS_CORRECT = 18
export const DUO_LISTENING_PASS_CORRECT = 18
export const DUO_KNM_PASS_CORRECT = 28

export function duoExamSeedFromSetId(setId: string): number {
  let h = 0
  for (let i = 0; i < setId.length; i++) {
    h = (Math.imul(31, h) + setId.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}
