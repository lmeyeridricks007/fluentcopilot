/**
 * Deep links for post-A2 continuation — keep hrefs centralized.
 */
export const POST_A2_TRANSITION_HREF = '/app/learn/post-a2'

export const POST_A2_PATH_HREFS = {
  /** Option A — B1 entry (sets study level; may include placeholder narrative). */
  continueB1: '/app/learn/b1',
  /** Option B — A2 Mastery (Practice Hub as home base). */
  a2Mastery: '/app/talk',
  /** Option C — Exam preparation home. */
  examPreparation: '/app/exam-prep',
  /** Deep links inside A2 Mastery track */
  skillTracks: '/app/practice/tracks',
  dailyReview: '/app/review/daily',
  mistakeFix: '/app/review/mistakes',
  masteryMap: '/app/progress',
} as const
