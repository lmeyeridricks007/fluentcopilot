import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type StudyCefrLevel = 'A0' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1'

export interface StudyContextState {
  /** Level driving curriculum manifest selection (may match profile or differ). */
  activeStudyLevel: StudyCefrLevel
  /** Suggested lessons per day on Home “Today”. */
  dailyLessonTarget: 1 | 2 | 3
  setActiveStudyLevel: (level: StudyCefrLevel) => void
  setDailyLessonTarget: (n: 1 | 2 | 3) => void
}

export const useStudyContextStore = create<StudyContextState>()(
  persist(
    (set) => ({
      activeStudyLevel: 'A2',
      dailyLessonTarget: 2,
      setActiveStudyLevel: (activeStudyLevel) => set({ activeStudyLevel }),
      setDailyLessonTarget: (dailyLessonTarget) => set({ dailyLessonTarget }),
    }),
    { name: 'study-context-storage' }
  )
)
