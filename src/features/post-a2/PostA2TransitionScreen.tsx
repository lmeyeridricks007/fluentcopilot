'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { ArrowLeft, CheckCircle2, ChevronRight, Sparkles, Target, TrendingUp } from 'lucide-react'
import { clsx } from 'clsx'
import { Card } from '@/components/ui/Card'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import { useStudyContextStore } from '@/store/studyContextStore'
import type { PostA2OptionCardModel, PostA2TransitionViewModel } from '@/lib/post-a2/types'
import { POST_A2_PATH_HREFS } from '@/lib/post-a2/postA2PathRouter'
import { getRetentionUserId, recordPostA2PathwayChoice } from '@/lib/retention/retentionService'

function ReadinessForB1Card({ readiness }: { readiness: PostA2TransitionViewModel['readiness'] }) {
  return (
    <Card
      variant="flat"
      padding="md"
      className="border border-primary-200/80 bg-gradient-to-br from-primary-50/90 to-surface-elevated"
    >
      <p className="text-caption font-semibold text-primary-800 flex items-center gap-1.5">
        <TrendingUp className="w-3.5 h-3.5" aria-hidden />
        Guidance for your next step
      </p>
      <h2 className="text-body-lg font-bold text-ink-primary mt-2 leading-snug">{readiness.headline}</h2>
      <p className="text-body-sm text-ink-secondary mt-2 leading-relaxed">{readiness.body}</p>
      <p className="text-caption text-ink-primary mt-3 leading-snug border-l-2 border-primary-300 pl-3">
        {readiness.reasonLine}
      </p>
    </Card>
  )
}

function DecisionSupportList() {
  const items = [
    {
      id: 'b1',
      title: 'Choose B1',
      detail: 'if you want to keep growing into more advanced Dutch.',
    },
    {
      id: 'mastery',
      title: 'Choose A2 Mastery',
      detail: 'if you want stronger real-life confidence before the level jump.',
    },
    {
      id: 'exam',
      title: 'Choose Exam preparation',
      detail: 'if passing the A2 exam or inburgering is your priority right now.',
    },
  ]
  return (
    <Card variant="outlined" padding="md" className="border-slate-200 bg-surface-muted/30">
      <p className="text-caption font-semibold text-ink-tertiary uppercase tracking-wide">Quick guide</p>
      <ul className="mt-3 space-y-3">
        {items.map((it) => (
          <li key={it.id} className="text-body-sm text-ink-secondary leading-snug">
            <span className="font-semibold text-ink-primary">{it.title}</span> — {it.detail}
          </li>
        ))}
      </ul>
    </Card>
  )
}

function NextStepOptionCard({
  model,
  onBeforeNavigate,
}: {
  model: PostA2OptionCardModel
  onBeforeNavigate: (id: PostA2OptionCardModel['id']) => void
}) {
  const isFeatured = model.variant === 'featured'
  return (
    <Card
      variant="outlined"
      padding="md"
      className={clsx(
        'relative transition-shadow',
        isFeatured &&
          'border-primary-300/90 bg-gradient-to-b from-primary-50/50 to-surface-elevated shadow-md ring-1 ring-primary-100',
        model.recommended && 'ring-2 ring-primary-400/40'
      )}
    >
      {model.recommended ? (
        <span className="absolute -top-2.5 right-3 rounded-full bg-primary-600 px-2.5 py-0.5 text-caption font-semibold text-white shadow-sm">
          Suggested for you
        </span>
      ) : null}
      <p className="text-caption font-semibold text-ink-tertiary uppercase tracking-wide">{model.eyebrow}</p>
      <h3 className="text-body-lg font-bold text-ink-primary mt-1 leading-snug">{model.title}</h3>
      <p className="text-body-sm text-ink-secondary mt-2 leading-relaxed">{model.body}</p>
      <Link
        href={model.href}
        onClick={() => onBeforeNavigate(model.id)}
        className={clsx(
          'mt-4 inline-flex w-full min-h-touch items-center justify-center gap-1 rounded-xl px-4 py-3 text-body-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500',
          isFeatured
            ? 'bg-primary-600 text-white hover:bg-primary-700'
            : 'bg-surface-muted text-ink-primary border border-slate-200 hover:bg-slate-100'
        )}
      >
        {model.ctaLabel}
        <ChevronRight className="w-4 h-4 opacity-90" aria-hidden />
      </Link>
    </Card>
  )
}

function PathDetailSection({
  title,
  subtitle,
  steps,
}: {
  title: string
  subtitle: string
  steps: { id: string; title: string; detail: string }[]
}) {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-surface-muted/40 px-4 py-4">
      <p className="text-caption font-semibold text-primary-700">{subtitle}</p>
      <h3 className="text-body font-bold text-ink-primary mt-0.5">{title}</h3>
      <ul className="mt-3 space-y-3">
        {steps.map((s) => (
          <li key={s.id} className="flex gap-3">
            <CheckCircle2 className="w-5 h-5 text-primary-600 shrink-0 mt-0.5" aria-hidden />
            <div>
              <p className="text-body-sm font-semibold text-ink-primary">{s.title}</p>
              <p className="text-caption text-ink-secondary mt-0.5 leading-snug">{s.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function PostA2TransitionScreen({ vm }: { vm: PostA2TransitionViewModel }) {
  const router = useRouter()
  const setStudyLevel = useStudyContextStore((s) => s.setActiveStudyLevel)

  useEffect(() => {
    const payload = {
      readinessLevel: vm.readiness.level,
      recommendedOption: vm.recommendedId,
      recent_exam_attempts: vm.recommendationContext.recentExamAttemptCount,
      exam_habit_streak: vm.recommendationContext.examHabitStreakDays,
    }
    track(ANALYTICS_EVENTS.post_a2_transition_viewed, payload)
    track(ANALYTICS_EVENTS.post_a2_pathways_viewed, payload)
    track(ANALYTICS_EVENTS.post_a2_recommendation_shown, payload)
  }, [vm.readiness.level, vm.recommendedId, vm.recommendationContext])

  const onBeforeNavigate = (id: PostA2OptionCardModel['id']) => {
    if (id === 'continue_b1') {
      setStudyLevel('B1')
    }
    recordPostA2PathwayChoice({
      userId: getRetentionUserId(),
      choice: id,
      recommendedId: vm.recommendedId,
    })
  }

  const orderedOptions = [...vm.options].sort((a, b) => {
    const order: PostA2OptionCardModel['id'][] = ['continue_b1', 'a2_mastery', 'exam_preparation']
    return order.indexOf(a.id) - order.indexOf(b.id)
  })

  return (
    <div className="px-4 py-6 pb-28 max-w-lg mx-auto w-full space-y-8">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => router.push('/app/learn')}
          className="min-h-touch min-w-touch inline-flex items-center justify-center rounded-lg text-ink-secondary hover:bg-surface-muted -ml-2"
          aria-label="Back to lessons"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden />
        </button>
        <span className="text-caption text-ink-tertiary">After A2</span>
      </div>

      <header className="relative overflow-hidden rounded-2xl border border-primary-200/60 bg-gradient-to-br from-slate-900 via-primary-900 to-primary-700 px-5 py-6 text-white shadow-lg">
        <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10 blur-2xl" aria-hidden />
        <div className="relative space-y-2">
          <p className="text-caption font-semibold uppercase tracking-wider text-primary-100/90 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" aria-hidden />
            {vm.journeyTitle}
          </p>
          <h1 className="text-2xl font-bold leading-tight">{vm.completionHeadline}</h1>
          <p className="text-body-sm text-primary-50/95 leading-relaxed">{vm.completionBody}</p>
          <p className="text-caption text-primary-100/85 leading-snug pt-1">{vm.journeySubtitle}</p>
        </div>
      </header>

      <ReadinessForB1Card readiness={vm.readiness} />

      <DecisionSupportList />

      <section aria-label="Choose your next path" className="space-y-3">
        <h2 className="text-body-lg font-bold text-ink-primary px-0.5">Choose your next path</h2>
        <div className="space-y-4">
          {orderedOptions.map((opt) => (
            <NextStepOptionCard key={opt.id} model={opt} onBeforeNavigate={onBeforeNavigate} />
          ))}
        </div>
      </section>

      <section className="space-y-3" aria-label="How each path works">
        <h2 className="text-body-lg font-bold text-ink-primary px-0.5 flex items-center gap-2">
          <Target className="w-5 h-5 text-primary-600" aria-hidden />
          Inside your paths
        </h2>
        <PathDetailSection
          title={vm.masteryPath.phaseTitle}
          subtitle={vm.masteryPath.phaseSubtitle}
          steps={vm.masteryPath.steps}
        />
        <PathDetailSection
          title={vm.examPrepPath.phaseTitle}
          subtitle={vm.examPrepPath.phaseSubtitle}
          steps={vm.examPrepPath.steps}
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link
            href={POST_A2_PATH_HREFS.examPreparation}
            className="flex-1 inline-flex min-h-touch items-center justify-center rounded-lg font-medium bg-primary-600 text-white hover:bg-primary-700 px-4 py-2.5 text-body text-center"
          >
            {vm.examPrepPath.primaryCtaLabel}
          </Link>
          <Link
            href="/app/exam-prep/speaking"
            className="flex-1 inline-flex min-h-touch items-center justify-center rounded-lg font-medium bg-surface-muted text-ink-primary border border-slate-200 hover:bg-slate-100 px-4 py-2.5 text-body-sm text-center"
          >
            {vm.examPrepPath.secondaryCtaLabel}
          </Link>
          <Link
            href={POST_A2_PATH_HREFS.skillTracks}
            className="flex-1 inline-flex min-h-touch items-center justify-center rounded-lg font-medium text-ink-primary hover:bg-surface-muted px-4 py-2.5 text-body text-center"
          >
            Skill tracks
          </Link>
          <Link
            href={POST_A2_PATH_HREFS.dailyReview}
            className="flex-1 inline-flex min-h-touch items-center justify-center rounded-lg font-medium text-ink-primary hover:bg-surface-muted px-4 py-2.5 text-body text-center"
          >
            Daily review
          </Link>
          <Link
            href={POST_A2_PATH_HREFS.masteryMap}
            className="flex-1 inline-flex min-h-touch items-center justify-center rounded-lg font-medium text-ink-primary hover:bg-surface-muted px-4 py-2.5 text-body text-center"
          >
            Progress & abilities
          </Link>
        </div>
      </section>
    </div>
  )
}
