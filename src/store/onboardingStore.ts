import { create } from 'zustand'

/**
 * Durable onboarding answers (v2 flow). Persisted via `persistOnboardingDraft` → profile `onboardingData`.
 * Legacy v1 fields kept optional for old stored JSON.
 */
export interface OnboardingData {
  /** @deprecated v1 — optional for migrated profiles */
  nativeLanguage: string
  knownLanguages: string[]
  countryOfOrigin: string
  timeInNetherlands: string
  familyStatus: string
  ageRange: string
  workRole: string
  industry: string
  hobbies: string[]
  currentLevel: string
  targetLevel: string
  targetObjective: string
  dailyLearningGoalMinutes: number
  notificationsEmail: boolean
  notificationsPush: boolean
  /** v2 — primary goal option id */
  primaryGoal: string
  /** v2 — current level self-report id */
  currentLevelSelfReport: string
  /** v2 — target path id (a2 | a2_mastery | exam_prep | b1) */
  targetPath: string
  /** v2 — focus skill ids */
  focusSkills: string[]
  /** v2 — study rhythm id */
  studyRhythm: string
  /** v2 — learning reason id */
  learningReason: string
}

const defaultData: OnboardingData = {
  nativeLanguage: '',
  knownLanguages: [],
  countryOfOrigin: '',
  timeInNetherlands: '',
  familyStatus: '',
  ageRange: '',
  workRole: '',
  industry: '',
  hobbies: [],
  currentLevel: '',
  targetLevel: '',
  targetObjective: '',
  dailyLearningGoalMinutes: 10,
  notificationsEmail: true,
  notificationsPush: false,
  primaryGoal: '',
  currentLevelSelfReport: '',
  targetPath: '',
  focusSkills: [],
  studyRhythm: '',
  learningReason: '',
}

/** Steps 0–5 = questions, 6 = summary (7 screens). */
export const ONBOARDING_STEP_COUNT = 7
export const ONBOARDING_LAST_STEP_INDEX = ONBOARDING_STEP_COUNT - 1

interface OnboardingState {
  step: number
  data: OnboardingData
  setStep: (step: number) => void
  updateData: (patch: Partial<OnboardingData>) => void
  reset: () => void
  /** Restore draft from durable learner profile after account bootstrap. */
  hydrateFromBootstrap: (step: number, partial: Partial<OnboardingData>) => void
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  step: 0,
  data: defaultData,
  setStep: (step) => set({ step }),
  updateData: (patch) =>
    set((s) => ({ data: { ...s.data, ...patch } })),
  reset: () => set({ step: 0, data: { ...defaultData } }),
  hydrateFromBootstrap: (step, partial) =>
    set({
      step: Math.max(0, Math.min(ONBOARDING_LAST_STEP_INDEX, Math.floor(step))),
      data: { ...defaultData, ...partial },
    }),
}))
