'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { clsx } from 'clsx'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle } from '@/components/ui/Card'
import { bringKmnReviewItemForward } from '@/lib/exam-prep/kmn/kmnFlashcardService'
import { getKmnScenario } from '@/lib/exam-prep/kmn/kmnContentBuilder'
import { evaluateKmnScenarioChoice } from '@/lib/exam-prep/kmn/kmnScenarioEngine'
import { recordKmnScenarioResult } from '@/lib/exam-prep/kmn/kmnProgressService'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import { localReviewPersistence } from '@/lib/review-engine/reviewPersistence'
import { getRetentionUserId } from '@/lib/retention/retentionService'
import { recordMistakeEvent } from '@/lib/mistakes/mistakeTagger'
import { applyExamLearningLoopClient } from '@/lib/exam-learning-loop/examMistakeExtractor'
import { isKmnTopicId } from '@/lib/exam-prep/kmn/kmnContentBuilder'
import type { KmnTopicId } from '@/lib/exam-prep/kmn/types'

export function KMNScenarioScreen({ topicId, scenarioId }: { topicId: string; scenarioId: string }) {
  const validTopic = isKmnTopicId(topicId)
  const scenario = getKmnScenario(scenarioId)
  const tid = topicId as KmnTopicId
  const [resolved, setResolved] = useState(false)
  const [feedbackNl, setFeedbackNl] = useState('')
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null)

  useEffect(() => {
    if (validTopic && scenario) {
      track(ANALYTICS_EVENTS.kmn_scenario_started, { kmn_topic: tid, scenario_id: scenarioId })
    }
  }, [validTopic, scenario, tid, scenarioId])

  const choose = useCallback(
    async (choiceId: string) => {
      if (!scenario || !validTopic || resolved) return
      const r = evaluateKmnScenarioChoice(scenario, choiceId)
      setFeedbackNl(r.feedbackNl)
      setWasCorrect(r.isCorrect)
      setResolved(true)

      recordKmnScenarioResult(tid, r.isCorrect)
      track(ANALYTICS_EVENTS.kmn_scenario_completed, {
        kmn_topic: tid,
        scenario_id: scenarioId,
        correct: r.isCorrect,
      })

      if (!r.isCorrect) {
        track(ANALYTICS_EVENTS.kmn_mistake_made, { kmn_topic: tid, surface: 'scenario', scenario_id: scenarioId })
        applyExamLearningLoopClient({
          kind: 'kmn',
          topicId: tid,
          surface: 'scenario',
          conceptOrStepId: scenarioId,
          correct: false,
          attemptId: `kmn-scenario-${tid}-${scenarioId}-${Date.now()}`,
        })
        if (scenario.linkedReviewItemId) {
          await bringKmnReviewItemForward(getRetentionUserId(), localReviewPersistence, scenario.linkedReviewItemId)
        }
        await recordMistakeEvent(localReviewPersistence, {
          userId: getRetentionUserId(),
          lessonId: `kmn-${tid}`,
          stepId: `scenario-${scenarioId}`,
          itemId: scenarioId,
          userAnswer: choiceId,
          correctAnswer: scenario.choices.find((c) => c.isCorrect)?.id ?? '',
          severity: 2,
          classify: {
            contextTags: ['kmn', tid, 'scenario'],
            userAnswer: choiceId,
            correctAnswer: 'best_option',
          },
        })
      }
      track(ANALYTICS_EVENTS.kmn_mastery_updated, { kmn_topic: tid, surface: 'scenario', correct: r.isCorrect })
    },
    [scenario, validTopic, resolved, tid, scenarioId]
  )

  if (!validTopic || !scenario) {
    return (
      <div className="px-4 py-8 max-w-lg mx-auto space-y-2">
        <p className="text-body-sm text-ink-secondary">Scenario niet gevonden.</p>
        <Link href="/app/exam-prep/kmn" className="text-primary-600 text-body-sm font-medium">
          Terug
        </Link>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 pb-28 max-w-lg mx-auto space-y-4 min-h-[70vh]">
      <Link
        href={`/app/exam-prep/kmn/${tid}`}
        className="inline-flex items-center gap-1 text-body-sm font-medium text-primary-600 min-h-touch"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden />
        Terug
      </Link>

      <header>
        <p className="text-caption text-ink-tertiary uppercase tracking-wide">Mini-scenario · Niveau {scenario.level}</p>
        <h1 className="text-title font-bold text-ink-primary mt-1 leading-tight">{scenario.titleNl}</h1>
      </header>

      <Card variant="outlined" padding="md" className="border-slate-200 bg-white">
        <p className="text-body text-ink-primary leading-relaxed whitespace-pre-wrap">{scenario.situationNl}</p>
      </Card>

      {!resolved ? (
        <div className="space-y-2">
          <p className="text-body-sm font-semibold text-ink-primary">Wat doet u?</p>
          {scenario.choices.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => void choose(c.id)}
              className="w-full min-h-touch rounded-xl border border-slate-200 bg-surface-elevated px-4 py-3 text-left text-body text-ink-primary hover:border-primary-400 hover:bg-primary-50/20 transition-colors"
            >
              {c.labelNl}
            </button>
          ))}
        </div>
      ) : (
        <Card
          variant="outlined"
          padding="md"
          className={clsx(wasCorrect ? 'border-emerald-200 bg-emerald-50/35' : 'border-amber-200 bg-amber-50/35')}
        >
          <CardTitle className="text-body font-bold">{wasCorrect ? 'Goede keuze' : 'Leermoment'}</CardTitle>
          <p className="mt-2 text-body-sm text-ink-secondary leading-relaxed">{feedbackNl}</p>
          <Link href={`/app/exam-prep/kmn/${tid}`} className="mt-4 block">
            <Button type="button" variant="secondary" className="w-full min-h-touch">
              Terug naar onderwerp
            </Button>
          </Link>
        </Card>
      )}
    </div>
  )
}
