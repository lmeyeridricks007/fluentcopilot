'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardDescription, CardTitle } from '@/components/ui/Card'
import { ReadingTextCard } from '@/features/exam-prep/reading/ReadingTextCard'
import { ReadingQuestionCard } from '@/features/exam-prep/reading/ReadingQuestionCard'
import { ReadingResultCard } from '@/features/exam-prep/reading/ReadingResultCard'
import { useReadingTrainingSession } from '@/features/exam-prep/reading/useReadingTrainingSession'
import { READING_DIFFICULTY_LABELS, type ReadingDifficultyPreset } from '@/lib/exam-prep/reading/readingDifficultyPolicy'
import { buildExamRecommendations } from '@/lib/exam-recommendations/examRecommendationEngine'
import { examRecommendationsToNextBestActions } from '@/lib/exam-recommendations/examRecommendationPresenter'
import { readingRecommendationInput } from '@/lib/exam-recommendations/examRecommendationInputs'
import { ExamPrepNextStepLinks } from '@/features/exam-prep/components/ExamPrepNextStepLinks'
import { ExamPrepRewardBanner } from '@/features/exam-prep/components/ExamPrepRewardBanner'

const PRESETS: ReadingDifficultyPreset[] = ['light', 'standard', 'strong']

export function ReadingTrainingScreen() {
  const {
    phase,
    plan,
    item,
    taskIndex,
    answerUnlocked,
    evalResult,
    correctCount,
    sessionKey,
    startSession,
    unlockAnswers,
    submitAnswer,
    goNext,
    resetToIntro,
    retentionReward,
  } = useReadingTrainingSession()

  const progress = plan && item ? { current: taskIndex + 1, total: plan.taskCount } : undefined

  const readingNextActions = useMemo(() => {
    if (!item || !evalResult || !plan) return []
    const bundle = buildExamRecommendations(
      readingRecommendationInput({
        correct: evalResult.correct,
        readingSkill: item.readingSkill,
      })
    )
    return examRecommendationsToNextBestActions(bundle, { source: 'exam_reading_training_task' })
  }, [item, evalResult, plan])

  return (
    <div className="px-4 py-6 pb-28 space-y-5 max-w-lg mx-auto w-full min-h-[70vh]">
      <div className="flex items-center gap-2 -mt-1">
        <Link
          href="/app/exam-prep/reading"
          className="inline-flex items-center gap-1 text-body-sm font-medium text-primary-600 hover:underline min-h-touch py-1"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden />
          Lezen — examen
        </Link>
      </div>

      <header className="space-y-1">
        <h1 className="text-title font-bold text-ink-primary tracking-tight">Lezen — training</h1>
        <p className="text-body-sm text-ink-secondary leading-snug">
          Korte praktijkteksten zoals op het examen: eerst lezen, dan een gestructureerde vraag. Geen lange artikelen —
          alleen wat u in het echt ook tegenkomt.
        </p>
      </header>

      {phase === 'intro' ? (
        <Card variant="outlined" padding="md" className="border-slate-200">
          <CardTitle className="text-body font-semibold text-ink-primary">Kies moeilijkheid</CardTitle>
          <CardDescription className="mt-2 text-body-sm text-ink-secondary leading-relaxed">
            Lichter: korte, directe teksten. Standaard: mix. Sterker: iets langere of subtielere teksten met scherpere
            afleiders — nog steeds A2-veilig.
          </CardDescription>
          <div className="mt-4 flex flex-col gap-2">
            {PRESETS.map((p) => (
              <Button
                key={p}
                type="button"
                className="w-full min-h-touch justify-center"
                variant="secondary"
                onClick={() => startSession(p)}
              >
                Start — {READING_DIFFICULTY_LABELS[p].nl}
              </Button>
            ))}
          </div>
        </Card>
      ) : null}

      {phase === 'task' && item && plan ? (
        <div key={sessionKey} className="space-y-4">
          <ReadingTextCard item={item} progress={progress} />
          {!answerUnlocked ? (
            <div className="space-y-3">
              <p className="text-body-sm text-ink-secondary leading-relaxed">
                Neem de tijd om de tekst te lezen. Als u klaar bent, opent u de vraag — de tekst blijft hierboven
                staan.
              </p>
              <Button type="button" className="w-full min-h-touch" onClick={unlockAnswers}>
                Ik ben klaar om te antwoorden
              </Button>
            </div>
          ) : (
            <ReadingQuestionCard item={item} disabled={false} onSelect={submitAnswer} />
          )}
        </div>
      ) : null}

      {phase === 'result' && evalResult && item && plan ? (
        <>
          <ExamPrepRewardBanner reward={retentionReward} />
          <ReadingTextCard item={item} progress={progress} />
          <ReadingResultCard
            result={evalResult}
            onNext={goNext}
            isLastTask={taskIndex + 1 >= plan.taskCount}
          />
          {readingNextActions.length > 0 ? (
            <Card variant="outlined" padding="md" className="border-slate-200 bg-surface-elevated">
              <CardTitle className="text-body font-semibold text-ink-primary">Slimme vervolgstappen</CardTitle>
              <p className="mt-2 text-body-sm text-ink-secondary leading-relaxed">
                Scenario’s, drills en lessen die passen bij dit leestype ({item.readingSkill}).
              </p>
              <div className="mt-4">
                <ExamPrepNextStepLinks
                  actions={readingNextActions}
                  examType="reading"
                  examMode="training"
                  analyticsContext={{
                    task_id: item.id,
                    reading_skill: item.readingSkill,
                    context: 'reading_result',
                  }}
                />
              </div>
            </Card>
          ) : null}
        </>
      ) : null}

      {phase === 'session_complete' && plan ? (
        <Card variant="outlined" padding="md" className="border-violet-200/70 bg-violet-50/40">
          <CardTitle className="text-body font-bold text-ink-primary">Sessie afgerond</CardTitle>
          <p className="mt-2 text-body-sm text-ink-secondary leading-relaxed">
            {correctCount} van {plan.taskCount} goed · preset {plan.preset}.
          </p>
          <Button type="button" className="mt-4 w-full min-h-touch" onClick={resetToIntro}>
            Nieuwe sessie
          </Button>
          <Link
            href="/app/exam-prep/reading"
            className="mt-2 flex min-h-touch w-full items-center justify-center rounded-lg border border-slate-300 bg-white text-body-sm font-semibold text-ink-primary"
          >
            Terug naar lezen — examen
          </Link>
        </Card>
      ) : null}
    </div>
  )
}
