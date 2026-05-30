import { getUserProfile } from '@/lib/storage/profileStorage'
import { buildOnboardingResumable } from './onboardingResume'
import { findResumableExamSimulation } from './simulationResume'
import { findResumableSchemaLesson } from './lessonResume'
import { sortResumableFlows } from './resumePriority'
import type { ResumeSurface, ResumeUserContext, ResumableFlow } from './resumeTypes'

const EXAM_KINDS = new Set<ResumableFlow['kind']>([
  'writing_simulation',
  'speaking_simulation',
  'listening_practice_exam',
  'reading_practice_exam',
])

/**
 * All resumable flows for the user (onboarding + exam simulations + schema lessons).
 * Onboarding is only present when the profile is incomplete; callers on post-onboarding
 * surfaces should still pass `onboardingComplete` from session to avoid race noise.
 */
export function collectResumableFlows(ctx: ResumeUserContext): ResumableFlow[] {
  const { userId, onboardingComplete, completedLessonIds } = ctx
  const profile = getUserProfile(userId)
  const flows: ResumableFlow[] = []

  const onboarding = buildOnboardingResumable(profile, onboardingComplete)
  if (onboarding) flows.push(onboarding)

  const simulation = findResumableExamSimulation(userId)
  if (simulation) flows.push(simulation)

  const lesson = findResumableSchemaLesson(userId, completedLessonIds)
  if (lesson) flows.push(lesson)

  return sortResumableFlows(flows)
}

function filterForSurface(flows: ResumableFlow[], surface: ResumeSurface, ctx: ResumeUserContext): ResumableFlow[] {
  if (surface === 'shell') return flows

  const dropOnboarding = ctx.onboardingComplete
  let next = flows
  if (dropOnboarding) {
    next = next.filter((f) => f.kind !== 'onboarding')
  }
  if (surface === 'exam_prep') {
    return next.filter((f) => EXAM_KINDS.has(f.kind))
  }
  if (surface === 'learn') {
    return next.filter((f) => f.kind === 'schema_lesson')
  }
  return next
}

export function getResumableFlowsForSurface(ctx: ResumeUserContext, surface: ResumeSurface): ResumableFlow[] {
  return filterForSurface(collectResumableFlows(ctx), surface, ctx)
}

export function resolveHighestPriorityResume(
  ctx: ResumeUserContext,
  surface: ResumeSurface
): ResumableFlow | null {
  const list = getResumableFlowsForSurface(ctx, surface)
  return list[0] ?? null
}

export function resolveAlternateResumes(
  ctx: ResumeUserContext,
  surface: ResumeSurface,
  max = 2
): ResumableFlow[] {
  return getResumableFlowsForSurface(ctx, surface).slice(1, 1 + max)
}

/** Global priority winner (no surface filter). Same ordering as `collectResumableFlows`[0]. */
export function getResumableFlowForUser(ctx: ResumeUserContext): ResumableFlow | null {
  const flows = collectResumableFlows(ctx)
  return flows[0] ?? null
}
