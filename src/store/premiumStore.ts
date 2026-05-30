import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Bump key when changing default tier so persisted “free” does not override new defaults. */
const PREMIUM_STORAGE_KEY = 'language-tutor-premium-demo-default-premium'

export type Tier = 'free' | 'trial' | 'premium'

interface PremiumState {
  isPremium: boolean
  /** When set, user is in trial (tier = trial until this date). Persisted for demo. */
  trialEndsAt: string | null
  setPremium: (value: boolean) => void
  /** Start trial (demo): sets isPremium true, trialEndsAt to now + 7 days */
  startTrial: () => void
  /** Clear trial and premium (demo reset) */
  endTrialAndPremium: () => void
}

function getDefaultTrialEnd(): string {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return d.toISOString().slice(0, 10)
}

export const usePremiumStore = create<PremiumState>()(
  persist(
    (set) => ({
      /** Dev default: treat as Premium so premium-only features are usable without toggling. */
      isPremium: true,
      trialEndsAt: null,
      setPremium: (value) => {
        set({ isPremium: value, trialEndsAt: value ? null : null })
      },
      startTrial: () => {
        set({ isPremium: true, trialEndsAt: getDefaultTrialEnd() })
      },
      endTrialAndPremium: () => {
        set({ isPremium: false, trialEndsAt: null })
      },
    }),
    { name: PREMIUM_STORAGE_KEY }
  )
)

/** Derived tier: trial if trialEndsAt set and in future, else premium if isPremium, else free */
export function getTierFromStore(state: { isPremium: boolean; trialEndsAt: string | null }): Tier {
  if (state.trialEndsAt && new Date(state.trialEndsAt) >= new Date()) return 'trial'
  if (state.isPremium) return 'premium'
  return 'free'
}
