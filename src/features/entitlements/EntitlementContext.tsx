'use client'

/**
 * Entitlement context: tier, usage, and cap checks from demo-data + premium store.
 * Used by UsageIndicator, PaywallModal, TrialBanner, and feature gates.
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { usePremiumStore, getTierFromStore } from '@/store/premiumStore'
import { useAuthStore } from '@/store/authStore'
import { useLearnerProfileStore } from '@/lib/profile/profileStore'
import { getCurrentPlan } from '@/lib/profile/profileSelectors'
import { DEMO_USAGE } from '@/demo-data'
import { isPremiumPlanId } from '@/lib/entitlements'

export type Tier = 'free' | 'trial' | 'premium'

export interface EntitlementUsage {
  lessonsToday: number
  lessonsLimit: number
  scenariosToday: number
  scenariosLimit: number
}

export interface EntitlementState {
  tier: Tier
  usage: EntitlementUsage
  trialEndsAt: string | null
  manageUrl: string | null
  canStartLesson: boolean
  canStartScenario: boolean
  atLessonCap: boolean
  atScenarioCap: boolean
}

const defaultUsage: EntitlementUsage = {
  lessonsToday: 0,
  lessonsLimit: 5,
  scenariosToday: 0,
  scenariosLimit: 3,
}

const defaultState: EntitlementState = {
  tier: 'free',
  usage: defaultUsage,
  trialEndsAt: null,
  manageUrl: '/app/settings',
  canStartLesson: true,
  canStartScenario: true,
  atLessonCap: false,
  atScenarioCap: false,
}

const EntitlementContext = createContext<EntitlementState>(defaultState)

export function useEntitlement(): EntitlementState {
  const ctx = useContext(EntitlementContext)
  return ctx ?? defaultState
}

interface EntitlementProviderProps {
  children: ReactNode
}

export function EntitlementProvider({ children }: EntitlementProviderProps) {
  const isPremium = usePremiumStore((s) => s.isPremium)
  const trialEndsAt = usePremiumStore((s) => s.trialEndsAt)
  const authUser = useAuthStore((s) => s.user)
  const document = useLearnerProfileStore((s) => s.document)
  const storeUserId = useLearnerProfileStore((s) => s.userId)
  const profileStatus = useLearnerProfileStore((s) => s.status)
  const profileAligned = Boolean(
    authUser?.id && storeUserId === authUser.id && profileStatus === 'ready'
  )
  const effectivePlan = getCurrentPlan(profileAligned ? document : null, authUser?.plan)
  const accountPlanPremium = isPremiumPlanId(effectivePlan)

  const state = useMemo<EntitlementState>(() => {
    const tier = getTierFromStore({ isPremium, trialEndsAt })
    const usage: EntitlementUsage = {
      lessonsToday: DEMO_USAGE.lessonsCompletedCount,
      lessonsLimit: 5,
      scenariosToday: DEMO_USAGE.scenariosCompletedCount,
      scenariosLimit: 3,
    }
    const inTrial = Boolean(trialEndsAt && new Date(trialEndsAt) >= new Date())
    /** Registry Basic keeps daily caps even if the demo premium flag was toggled. */
    const unlimited = accountPlanPremium || inTrial
    const atLessonCap = !unlimited && usage.lessonsToday >= usage.lessonsLimit
    const atScenarioCap = !unlimited && usage.scenariosToday >= usage.scenariosLimit
    return {
      tier,
      usage,
      trialEndsAt,
      manageUrl: '/app/settings',
      canStartLesson: !atLessonCap,
      canStartScenario: !atScenarioCap,
      atLessonCap,
      atScenarioCap,
    }
  }, [isPremium, trialEndsAt, accountPlanPremium])

  return (
    <EntitlementContext.Provider value={state}>
      {children}
    </EntitlementContext.Provider>
  )
}
