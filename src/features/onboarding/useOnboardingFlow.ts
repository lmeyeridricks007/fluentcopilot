'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import {
  ONBOARDING_LAST_STEP_INDEX,
  ONBOARDING_STEP_COUNT,
  useOnboardingStore,
} from '@/store/onboardingStore'
import {
  markLearnerProfileOnboardingComplete,
  persistOnboardingDraft,
} from '@/lib/bootstrap/bootstrapProfileLoader'
import { persistOnboardingStepImmediate } from '@/lib/persistence'
import { ONBOARDING_DATA_DEBOUNCE_MS } from '@/lib/persistence/persistencePolicy'
import { runIncrementalSave } from '@/lib/persistence/saveStrategies'
import { resolveOnboardingStartExperience, writeOnboardingStartHandoff } from '@/lib/onboarding-routing'
import { ROUTES } from '@/lib/routing/authRedirects'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import {
  trackOnboardingAbandoned,
  trackOnboardingStepCompleted,
  trackOnboardingStepViewed,
} from '@/lib/analytics/onboardingFunnelAnalytics'
import type { OnboardingSessionSource } from '@/lib/analytics/funnelAnalyticsTypes'

const STEP_KEYS = [
  'goal',
  'current_level',
  'target_path',
  'focus_skills',
  'study_rhythm',
  'reason',
  'summary',
] as const

export function useOnboardingFlow() {
  const router = useRouter()
  const pathname = usePathname() ?? ''
  const userId = useAuthStore((s) => s.user?.id ?? '')
  const userPlan = useAuthStore((s) => s.user?.plan)
  const { step, setStep, data, updateData } = useOnboardingStore()

  const initAnalyticsRef = useRef(false)
  const startedAtRef = useRef<number | null>(null)
  const completedRef = useRef(false)
  const onboardingSourceRef = useRef<OnboardingSessionSource>('first_login')

  useEffect(() => {
    if (!userId) return
    const t = window.setTimeout(() => {
      runIncrementalSave({
        domain: 'onboarding',
        mode: 'debounced',
        eventType: 'onboarding_draft_coalesced',
        persist: () => {
          persistOnboardingDraft(userId, step, data)
          return true
        },
      })
    }, ONBOARDING_DATA_DEBOUNCE_MS)
    return () => window.clearTimeout(t)
  }, [userId, step, data])

  useEffect(() => {
    if (initAnalyticsRef.current) return
    initAnalyticsRef.current = true
    const s = useOnboardingStore.getState().step
    const plan = useAuthStore.getState().user?.plan
    const source: OnboardingSessionSource = s > 0 ? 'resumed' : 'first_login'
    onboardingSourceRef.current = source
    startedAtRef.current = Date.now()
    track(ANALYTICS_EVENTS.onboarding_started, {
      step_index: s,
      total_steps: ONBOARDING_STEP_COUNT,
      user_plan: plan,
      onboarding_source: source,
    })
    if (s > 0) {
      track(ANALYTICS_EVENTS.onboarding_resumed, {
        step_index: s,
        total_steps: ONBOARDING_STEP_COUNT,
        user_plan: plan,
        onboarding_source: source,
      })
    }
  }, [])

  useEffect(() => {
    const stepId = STEP_KEYS[step] ?? 'unknown'
    trackOnboardingStepViewed({
      step_id: stepId,
      step_index: step,
      total_steps: ONBOARDING_STEP_COUNT,
      route: pathname || '/onboarding',
      user_plan: userPlan,
      onboarding_source: onboardingSourceRef.current,
      has_previous_answers: step > 0,
    })
  }, [step, pathname, userPlan])

  useEffect(() => {
    const onBeforeUnload = () => {
      if (completedRef.current || useAuthStore.getState().hasCompletedOnboarding) return
      const st = useOnboardingStore.getState().step
      const stepId = STEP_KEYS[st] ?? 'unknown'
      trackOnboardingAbandoned({
        step_id: stepId,
        step_index: st,
        total_steps: ONBOARDING_STEP_COUNT,
        user_plan: userPlan,
        reason: 'browser_exit',
        route: pathname || '/onboarding',
      })
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [pathname, userPlan])

  const canProceed = useMemo(() => {
    switch (step) {
      case 0:
        return Boolean(data.primaryGoal)
      case 1:
        return Boolean(data.currentLevelSelfReport)
      case 2:
        return Boolean(data.targetPath)
      case 3:
        return data.focusSkills.length > 0
      case 4:
        return Boolean(data.studyRhythm)
      case 5:
        return Boolean(data.learningReason)
      case 6:
        return true
      default:
        return false
    }
  }, [step, data])

  const goNext = useCallback(() => {
    if (!canProceed || step >= ONBOARDING_LAST_STEP_INDEX) return
    const stepId = STEP_KEYS[step]
    trackOnboardingStepCompleted({
      step_id: stepId,
      step_index: step,
      total_steps: ONBOARDING_STEP_COUNT,
      user_plan: userPlan,
      onboarding_source: onboardingSourceRef.current,
      primary_goal: data.primaryGoal,
      target_path: data.targetPath,
    })
    const uid = useAuthStore.getState().user?.id
    if (uid) {
      persistOnboardingStepImmediate(uid, step + 1, data)
    }
    setStep(step + 1)
  }, [canProceed, step, setStep, data, userPlan])

  const goBack = useCallback(() => {
    if (step > 0) {
      setStep(step - 1)
      return
    }
    trackOnboardingAbandoned({
      step_id: STEP_KEYS[0],
      step_index: 0,
      total_steps: ONBOARDING_STEP_COUNT,
      user_plan: userPlan,
      reason: 'exited_to_public_marketing',
      route: pathname || '/onboarding',
    })
    router.push('/')
  }, [step, setStep, router, userPlan, pathname])

  const completeAndEnterApp = useCallback(() => {
    const uid = useAuthStore.getState().user?.id
    if (!uid) return
    completedRef.current = true
    const experience = markLearnerProfileOnboardingComplete(uid, data)
    useAuthStore.getState().setOnboardingComplete(true)
    const path = experience?.route ?? ROUTES.appHome
    const plan = useAuthStore.getState().user?.plan
    const started = startedAtRef.current
    const timeToCompleteMs = started != null ? Date.now() - started : undefined

    if (experience && typeof window !== 'undefined') {
      writeOnboardingStartHandoff({
        route: experience.route,
        pathwayKey: experience.pathwayKey,
        headline: experience.welcomeHeadline,
        subline: experience.welcomeSubline,
      })
      const routeProps = {
        pathway_key: experience.pathwayKey,
        route: experience.route,
        route_destination: experience.route,
        decision_trace: experience.decisionTrace,
        selected_target_path: data.targetPath,
        selected_current_level: data.currentLevelSelfReport,
        target_path: data.targetPath,
        primary_goal: data.primaryGoal,
        learning_reason: data.learningReason,
        goal: data.primaryGoal,
        user_plan: plan,
      }
      track(ANALYTICS_EVENTS.onboarding_start_route_resolved, routeProps)
      track(ANALYTICS_EVENTS.onboarding_start_path_selected, routeProps)
      track(ANALYTICS_EVENTS.plan_context_on_start_route, {
        phase: 'route_resolved',
        user_plan: plan,
        route_destination: experience.route,
        recommended_path: experience.pathwayKey,
        selected_target_path: data.targetPath,
        selected_current_level: data.currentLevelSelfReport,
        goal: data.primaryGoal,
      })
    }

    track(ANALYTICS_EVENTS.onboarding_completed, {
      primary_goal: data.primaryGoal,
      goal_selected: data.primaryGoal,
      current_level_selected: data.currentLevelSelfReport,
      target_path_selected: data.targetPath,
      focus_area_count: data.focusSkills.length,
      study_rhythm_selected: data.studyRhythm,
      reason_for_learning: data.learningReason,
      learning_reason: data.learningReason,
      entry_path: path,
      pathway_key: experience?.pathwayKey,
      time_to_complete_ms: timeToCompleteMs,
      user_plan: plan,
    })
    track(ANALYTICS_EVENTS.plan_context_on_onboarding_complete, {
      user_plan: plan,
      route_destination: path,
      recommended_path: experience?.pathwayKey,
      selected_target_path: data.targetPath,
    })
    router.push(path)
  }, [data, router])

  const summaryCta = useMemo(() => resolveOnboardingStartExperience(data).summaryCtaLabel, [data])

  return {
    step,
    totalSteps: ONBOARDING_STEP_COUNT,
    data,
    updateData,
    canProceed,
    goNext,
    goBack,
    completeAndEnterApp,
    summaryCta,
    isSummaryStep: step === ONBOARDING_LAST_STEP_INDEX,
  }
}
