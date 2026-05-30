'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { ArrowLeft, Bookmark } from 'lucide-react'
import { CardDescription, CardTitle } from '@/components/ui/Card'
import { useKmnHomeModel } from '@/features/exam-prep/kmn/useKMNSession'
import { useSavedKnmExamQuestions } from '@/features/exam-prep/kmn/useSavedKnmExamQuestions'
import { APP_KMN_SAVED_EXAM_QUESTIONS } from '@/lib/routing/appRoutes'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'

export function KMNHomeScreen() {
  const { topicRows } = useKmnHomeModel()
  const savedExamQuestions = useSavedKnmExamQuestions()

  useEffect(() => {
    track(ANALYTICS_EVENTS.kmn_home_viewed, {})
  }, [])

  return (
    <div className="px-4 py-6 pb-28 space-y-6 max-w-lg mx-auto w-full min-h-[70vh]">
      <div className="flex items-center gap-2 -mt-1">
        <Link
          href="/app/exam-prep"
          className="inline-flex items-center gap-1 text-body-sm font-medium text-primary-600 hover:underline min-h-touch py-1"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden />
          Examenvoorbereiding
        </Link>
      </div>

      <header className="space-y-2">
        <h1 className="text-title font-bold text-ink-primary tracking-tight">Kennis van Nederland</h1>
        <p className="text-body-sm text-ink-secondary leading-relaxed">
          Geen droge theorie alleen: werk, zorg, overheid en gewoontes — met quizzen, herhaalbare kaarten (SRS) en korte
          keuze-scenario’s voor het echte leven én het examen.
        </p>
      </header>

      {savedExamQuestions.length > 0 ? (
        <Link
          href={APP_KMN_SAVED_EXAM_QUESTIONS}
          className="flex items-center gap-3 rounded-card border border-indigo-200 bg-indigo-50/50 p-4 shadow-sm hover:border-indigo-300 transition-colors min-h-touch"
        >
          <Bookmark className="h-5 w-5 text-indigo-700 shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-body-sm font-semibold text-ink-primary">Saved exam questions</p>
            <p className="text-caption text-ink-secondary">
              {savedExamQuestions.length} from simulation reports — practice again (not in your word library)
            </p>
          </div>
        </Link>
      ) : null}

      <div className="grid grid-cols-1 gap-3">
        {topicRows.map(({ topic, counts, masteryNl: mLabel, progressionNl }) => (
          <Link
            key={topic.id}
            href={`/app/exam-prep/kmn/${topic.id}`}
            className="block rounded-card border border-slate-200 bg-surface-elevated p-4 shadow-sm hover:border-primary-300/80 hover:bg-primary-50/15 transition-colors min-h-touch"
            onClick={() => track(ANALYTICS_EVENTS.kmn_topic_viewed, { kmn_topic: topic.id, from: 'home' })}
          >
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-body font-semibold text-ink-primary">{topic.titleNl}</CardTitle>
              <span className="text-caption font-semibold shrink-0 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-ink-secondary">
                {mLabel}
              </span>
            </div>
            <CardDescription className="mt-1 leading-snug">{topic.taglineNl}</CardDescription>
            <p className="mt-2 text-caption text-ink-tertiary">
              {counts.quiz} quiz · {counts.flashcards} kaarten · {counts.scenarios} scenario’s · {progressionNl}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}
