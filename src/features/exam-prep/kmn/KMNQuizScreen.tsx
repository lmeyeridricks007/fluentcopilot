'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { clsx } from 'clsx'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle } from '@/components/ui/Card'
import { bringKmnReviewItemForward } from '@/lib/exam-prep/kmn/kmnFlashcardService'
import { getKmnQuizQuestions, isKmnTopicId } from '@/lib/exam-prep/kmn/kmnContentBuilder'
import { evaluateKmnQuizAnswer, shuffleQuizOptions } from '@/lib/exam-prep/kmn/kmnQuizService'
import { recordKmnQuizResult } from '@/lib/exam-prep/kmn/kmnProgressService'
import type { KmnQuizQuestion, KmnTopicId } from '@/lib/exam-prep/kmn/types'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import { localReviewPersistence } from '@/lib/review-engine/reviewPersistence'
import { recordMistakeEvent } from '@/lib/mistakes/mistakeTagger'
import { applyExamLearningLoopClient } from '@/lib/exam-learning-loop/examMistakeExtractor'
import { ExamPrepRewardBanner } from '@/features/exam-prep/components/ExamPrepRewardBanner'
import { KmnQuizQuestionMedia } from '@/features/exam-prep/kmn/KmnQuizQuestionMedia'
import type { ExamPrepRetentionSummary } from '@/lib/exam-rewards/types'
import { getRetentionUserId, recordExamPrepActivityComplete } from '@/lib/retention/retentionService'

const SESSION_SIZE = 5

function pickQuizSession(questions: KmnQuizQuestion[], seed: number): KmnQuizQuestion[] {
  const copy = [...questions]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.abs(Math.sin(seed + i * 13) * 10000) % (i + 1))
    ;[copy[i], copy[j]] = [copy[j]!, copy[i]!]
  }
  return copy.slice(0, Math.min(SESSION_SIZE, copy.length))
}

export function KMNQuizScreen({ topicId }: { topicId: string }) {
  const valid = isKmnTopicId(topicId)
  const tid = topicId as KmnTopicId
  const seed = useMemo(() => Date.now(), [])
  const questions = useMemo(() => {
    if (!valid) return []
    return pickQuizSession(getKmnQuizQuestions(tid), seed)
  }, [valid, tid, seed])

  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<'q' | 'fb'>('q')
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null)
  const [lastExplanation, setLastExplanation] = useState('')
  const [done, setDone] = useState(false)
  const [retentionReward, setRetentionReward] = useState<ExamPrepRetentionSummary | null>(null)
  const rewardRecordedRef = useRef(false)

  const q = questions[index]
  const shuffledOpts = useMemo(() => (q ? shuffleQuizOptions(q, seed + index * 7) : []), [q, seed, index])

  useEffect(() => {
    if (valid && questions.length) {
      track(ANALYTICS_EVENTS.kmn_quiz_started, { kmn_topic: tid, question_count: questions.length })
    }
  }, [valid, tid, questions.length])

  useEffect(() => {
    if (!done || rewardRecordedRef.current || questions.length === 0) return
    rewardRecordedRef.current = true
    const meta = recordExamPrepActivityComplete({
      userId: getRetentionUserId(),
      kind: 'kmn_quiz_round',
      topicId: tid,
      questionCount: questions.length,
    })
    setRetentionReward(meta.examPrep ?? null)
  }, [done, tid, questions.length])

  const submit = useCallback(
    async (optionId: string) => {
      if (!q || phase !== 'q') return
      const { correct, explanationNl } = evaluateKmnQuizAnswer(q, optionId)
      setLastCorrect(correct)
      setLastExplanation(explanationNl)
      setPhase('fb')

      recordKmnQuizResult(tid, correct)
      track(ANALYTICS_EVENTS.kmn_quiz_answered, {
        kmn_topic: tid,
        question_id: q.id,
        correct,
        level: q.level,
      })

      if (!correct) {
        track(ANALYTICS_EVENTS.kmn_mistake_made, { kmn_topic: tid, surface: 'quiz', question_id: q.id })
        applyExamLearningLoopClient({
          kind: 'kmn',
          topicId: tid,
          surface: 'quiz',
          conceptOrStepId: q.id,
          correct: false,
          attemptId: `kmn-quiz-${tid}-${q.id}-${Date.now()}`,
        })
        if (q.linkedReviewItemId) {
          await bringKmnReviewItemForward(getRetentionUserId(), localReviewPersistence, q.linkedReviewItemId)
        }
        await recordMistakeEvent(localReviewPersistence, {
          userId: getRetentionUserId(),
          lessonId: `kmn-${tid}`,
          stepId: `quiz-${q.id}`,
          itemId: q.id,
          userAnswer: optionId,
          correctAnswer: q.correctOptionId,
          severity: 2,
          errorTypeOverride: 'grammar',
          classify: { contextTags: ['kmn', tid, `subtopic-${q.subtopicId}`], userAnswer: optionId, correctAnswer: q.correctOptionId },
        })
      }

      track(ANALYTICS_EVENTS.kmn_mastery_updated, { kmn_topic: tid, surface: 'quiz', correct })
    },
    [q, phase, tid]
  )

  const next = useCallback(() => {
    if (index + 1 >= questions.length) {
      setDone(true)
      return
    }
    setIndex((i) => i + 1)
    setPhase('q')
    setLastCorrect(null)
    setLastExplanation('')
  }, [index, questions.length])

  if (!valid) {
    return (
      <div className="px-4 py-8 max-w-lg mx-auto">
        <Link href="/app/exam-prep/kmn" className="text-primary-600 text-body-sm">
          Terug
        </Link>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="px-4 py-8 max-w-lg mx-auto space-y-3">
        <p className="text-body-sm text-ink-secondary">Nog geen quizvragen voor dit onderwerp.</p>
        <Link href={`/app/exam-prep/kmn/${tid}`}>
          <Button type="button" variant="secondary">
            Terug
          </Button>
        </Link>
      </div>
    )
  }

  if (done) {
    return (
      <div className="px-4 py-8 pb-28 max-w-lg mx-auto space-y-4">
        <Link
          href={`/app/exam-prep/kmn/${tid}`}
          className="inline-flex items-center gap-1 text-body-sm font-medium text-primary-600 min-h-touch"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Terug naar {tid}
        </Link>
        <ExamPrepRewardBanner reward={retentionReward} />
        <Card variant="outlined" className="border-emerald-200 bg-emerald-50/40 p-4">
          <CardTitle className="text-body font-bold">Quiz afgerond</CardTitle>
          <p className="mt-2 text-body-sm text-ink-secondary">Bekijk scenario’s of flashcards om het vast te zetten.</p>
          <Link href={`/app/exam-prep/kmn/${tid}/flashcards`} className="mt-3 block">
            <Button type="button" className="w-full min-h-touch">
              Naar flashcards
            </Button>
          </Link>
        </Card>
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
      <p className="text-caption text-ink-tertiary">
        Vraag {index + 1} / {questions.length} · Niveau {q.level}
      </p>

      {phase === 'q' ? (
        <Card variant="outlined" padding="md" className="border-slate-200 space-y-4">
          <KmnQuizQuestionMedia question={q} />
          <p className="text-body-lg font-semibold text-ink-primary leading-snug">{q.promptNl}</p>
          <div className="mt-4 space-y-2">
            {shuffledOpts.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => void submit(opt.id)}
                className="w-full min-h-touch rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-body text-ink-primary hover:border-primary-400 hover:bg-primary-50/25 active:scale-[0.99] transition-colors"
              >
                {opt.labelNl}
              </button>
            ))}
          </div>
        </Card>
      ) : (
        <Card
          variant="outlined"
          padding="md"
          className={clsx(lastCorrect ? 'border-emerald-200 bg-emerald-50/35' : 'border-amber-200 bg-amber-50/35')}
        >
          <CardTitle className="text-body font-bold">{lastCorrect ? 'Goed zo' : 'Niet helemaal'}</CardTitle>
          <p className="mt-2 text-body-sm text-ink-secondary leading-relaxed">{lastExplanation}</p>
          <Button type="button" className="mt-4 w-full min-h-touch" onClick={next}>
            {index + 1 >= questions.length ? 'Klaar' : 'Volgende'}
          </Button>
        </Card>
      )}
    </div>
  )
}
