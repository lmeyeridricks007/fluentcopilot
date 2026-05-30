'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { ArrowLeft, BookOpen, Layers, Sparkles } from 'lucide-react'
import { Card, CardDescription, CardTitle } from '@/components/ui/Card'
import { useKmnTopicModel } from '@/features/exam-prep/kmn/useKMNSession'
import { getKmnScenarios } from '@/lib/exam-prep/kmn/kmnContentBuilder'
import { getKmnTopicProgress } from '@/lib/exam-prep/kmn/kmnProgressService'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import type { KmnTopicId } from '@/lib/exam-prep/kmn/types'

export function KMNTopicScreen({ topicId }: { topicId: string }) {
  const { valid, topic, counts, masteryNl: mLabel, progressionNl } = useKmnTopicModel(topicId)

  useEffect(() => {
    if (valid) track(ANALYTICS_EVENTS.kmn_topic_viewed, { kmn_topic: topicId, from: 'topic_hub' })
  }, [valid, topicId])

  if (!valid || !topic || !counts) {
    return (
      <div className="px-4 py-8 max-w-lg mx-auto">
        <p className="text-body text-ink-secondary">Dit onderwerp bestaat niet.</p>
        <Link href="/app/exam-prep/kmn" className="text-primary-600 text-body-sm font-medium mt-2 inline-block">
          Terug naar KNM
        </Link>
      </div>
    )
  }

  const tid = topicId as KmnTopicId
  const scenarios = getKmnScenarios(tid)
  const pr = getKmnTopicProgress(tid)

  return (
    <div className="px-4 py-6 pb-28 space-y-6 max-w-lg mx-auto w-full min-h-[70vh]">
      <div className="flex items-center gap-2 -mt-1">
        <Link
          href="/app/exam-prep/kmn"
          className="inline-flex items-center gap-1 text-body-sm font-medium text-primary-600 hover:underline min-h-touch py-1"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden />
          KNM
        </Link>
      </div>

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-title font-bold text-ink-primary tracking-tight">{topic.titleNl}</h1>
          <span className="text-caption font-semibold rounded-md border border-primary-200 bg-primary-50 px-2 py-0.5 text-primary-900">
            {mLabel}
          </span>
        </div>
        <p className="text-body-sm text-ink-secondary leading-relaxed">{topic.introNl}</p>
        <p className="text-caption text-ink-tertiary">
          {progressionNl} · Quiz{' '}
          {pr.quizAttempts > 0 ? `${pr.quizCorrect}/${pr.quizAttempts} goed` : 'nog niet gedaan'} · Scenario’s{' '}
          {pr.scenarioAttempts > 0 ? `${pr.scenarioCorrect}/${pr.scenarioAttempts} goed` : 'nog niet gedaan'}
        </p>
      </header>

      <Card variant="flat" className="border border-slate-200 bg-slate-50/60">
        <CardTitle className="text-body-sm font-semibold text-ink-primary">Subonderwerpen</CardTitle>
        <ul className="mt-2 space-y-1 text-body-sm text-ink-secondary">
          {topic.subtopics.map((s) => (
            <li key={s.id}>
              <span className="font-medium text-ink-primary">{s.titleNl}</span> — {s.blurbNl}
            </li>
          ))}
        </ul>
      </Card>

      <div className="space-y-3">
        <h2 className="text-body font-bold text-ink-primary">Activiteiten</h2>

        <Link
          href={`/app/exam-prep/kmn/${tid}/quiz`}
          className="flex items-start gap-3 rounded-card border border-slate-200 bg-surface-elevated p-4 shadow-sm hover:border-primary-300/80 min-h-touch transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-violet-100 border border-violet-200 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5 text-violet-800" aria-hidden />
          </div>
          <div>
            <CardTitle className="text-body font-semibold">Quiz</CardTitle>
            <CardDescription className="mt-0.5">{counts.quiz} meerkeuzevragen — praktisch en examengericht</CardDescription>
          </div>
        </Link>

        <Link
          href={`/app/exam-prep/kmn/${tid}/flashcards`}
          className="flex items-start gap-3 rounded-card border border-slate-200 bg-surface-elevated p-4 shadow-sm hover:border-primary-300/80 min-h-touch transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5 text-amber-900" aria-hidden />
          </div>
          <div>
            <CardTitle className="text-body font-semibold">Flashcards (SRS)</CardTitle>
            <CardDescription className="mt-0.5">
              Spaced repetition — kaarten komen terug in uw algemene review wanneer ze weer “due” zijn
            </CardDescription>
          </div>
        </Link>

        <div className="rounded-card border border-slate-200 bg-surface-elevated p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-emerald-900" aria-hidden />
            </div>
            <CardTitle className="text-body font-semibold">Mini-scenario’s</CardTitle>
          </div>
          <CardDescription className="text-body-sm">Korte keuzes — wat zou u doen in Nederland?</CardDescription>
          <ul className="space-y-2">
            {scenarios.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/app/exam-prep/kmn/${tid}/scenario/${s.id}`}
                  className="block rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-body-sm font-medium text-ink-primary hover:border-primary-300 hover:bg-primary-50/20 min-h-touch flex items-center"
                >
                  {s.titleNl}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
