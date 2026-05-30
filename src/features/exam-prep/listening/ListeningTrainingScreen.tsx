'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardDescription, CardTitle } from '@/components/ui/Card'
import { ListeningAudioPlayer } from '@/features/exam-prep/listening/ListeningAudioPlayer'
import { ListeningPromptCard } from '@/features/exam-prep/listening/ListeningPromptCard'
import { ListeningQuestionCard } from '@/features/exam-prep/listening/ListeningQuestionCard'
import { ListeningResultCard } from '@/features/exam-prep/listening/ListeningResultCard'
import { useListeningTrainingSession } from '@/features/exam-prep/listening/useListeningTrainingSession'
import {
  LISTENING_DIFFICULTY_LABELS,
  type ListeningDifficultyPreset,
} from '@/lib/exam-prep/listening/listeningDifficultyPolicy'
import { canStartAudio, replaysUsed } from '@/lib/exam-prep/listening/listeningReplayPolicy'
import { buildExamRecommendations } from '@/lib/exam-recommendations/examRecommendationEngine'
import { examRecommendationsToNextBestActions } from '@/lib/exam-recommendations/examRecommendationPresenter'
import { listeningRecommendationInput } from '@/lib/exam-recommendations/examRecommendationInputs'
import { ExamPrepNextStepLinks } from '@/features/exam-prep/components/ExamPrepNextStepLinks'
import { ExamPrepRewardBanner } from '@/features/exam-prep/components/ExamPrepRewardBanner'

const PRESETS: ListeningDifficultyPreset[] = ['light', 'standard', 'strong']

export function ListeningTrainingScreen() {
  const {
    phase,
    plan,
    item,
    taskIndex,
    replayState,
    hasCompletedListen,
    canAnswer,
    evalResult,
    maxStarts,
    speechRate,
    correctCount,
    sessionKey,
    startSession,
    onBeforePlay,
    onPlaybackComplete,
    submitAnswer,
    goNext,
    resetToIntro,
    retentionReward,
  } = useListeningTrainingSession()

  const progress =
    plan && item ? { current: taskIndex + 1, total: plan.taskCount } : undefined

  const listeningNextActions = useMemo(() => {
    if (!item || !evalResult || !plan) return []
    const bundle = buildExamRecommendations(
      listeningRecommendationInput({
        correct: evalResult.correct,
        questionType: item.questionType,
        replayCount: replaysUsed(replayState),
        maxReplay: maxStarts,
      })
    )
    return examRecommendationsToNextBestActions(bundle, { source: 'exam_listening_training_task' })
  }, [item, evalResult, plan, replayState, maxStarts])

  return (
    <div className="px-4 py-6 pb-28 space-y-5 max-w-lg mx-auto w-full min-h-[70vh]">
      <div className="flex items-center gap-2 -mt-1">
        <Link
          href="/app/exam-prep/listening"
          className="inline-flex items-center gap-1 text-body-sm font-medium text-primary-600 hover:underline min-h-touch py-1"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden />
          Luisteren — examen
        </Link>
      </div>

      <header className="space-y-1">
        <h1 className="text-title font-bold text-ink-primary tracking-tight">Luisteren — training</h1>
        <p className="text-body-sm text-ink-secondary leading-snug">
          Korte examenfragmenten: luister, beantwoord, krijg directe uitleg. Geen scenario-chat — alleen
          gestructureerde opdrachten.
        </p>
      </header>

      {phase === 'intro' ? (
        <Card variant="outlined" padding="md" className="border-slate-200">
          <CardTitle className="text-body font-semibold text-ink-primary">Kies moeilijkheid</CardTitle>
          <CardDescription className="mt-2 text-body-sm text-ink-secondary leading-relaxed">
            Lichter: rustiger tempo en meer herhalingen. Standaard: mix van opdrachten. Sterker: sneller Nederlands en minder
            herhalingen per fragment — dichter bij examenspanning.
          </CardDescription>
          <div className="mt-4 flex flex-col gap-2">
            {PRESETS.map((p) => (
              <Button key={p} type="button" className="w-full min-h-touch justify-center" variant="secondary" onClick={() => startSession(p)}>
                Start — {LISTENING_DIFFICULTY_LABELS[p].nl}
              </Button>
            ))}
          </div>
        </Card>
      ) : null}

      {phase === 'task' && item && plan ? (
        <>
          <ListeningPromptCard item={item} progress={progress} />
          <ListeningAudioPlayer
            key={sessionKey}
            item={item}
            speechRate={speechRate}
            onBeforePlay={onBeforePlay}
            onPlaybackComplete={onPlaybackComplete}
          />
          <p className="text-body-sm text-ink-secondary tabular-nums" aria-live="polite">
            Audio vanaf het begin: nog {Math.max(0, maxStarts - replayState.startsUsed)} van {maxStarts} starts op deze opgave.
          </p>
          {!canStartAudio(replayState) && !hasCompletedListen ? (
            <p className="text-body-sm text-amber-900 bg-amber-50 border border-amber-200/80 rounded-lg px-3 py-2">
              U heeft alle audio-starts gebruikt. Beantwoord de vraag zo goed mogelijk op basis van wat u gehoord heeft.
            </p>
          ) : !hasCompletedListen ? (
            <p className="text-caption text-ink-tertiary">
              Luister het fragment af (u mag binnen de limiet opnieuw afspelen). Daarna verschijnen de antwoordopties.
            </p>
          ) : null}
          <ListeningQuestionCard item={item} disabled={!canAnswer} onSelect={submitAnswer} />
        </>
      ) : null}

      {phase === 'result' && evalResult && item && plan ? (
        <>
          <ExamPrepRewardBanner reward={retentionReward} />
          <ListeningResultCard
            result={evalResult}
            startsUsed={replayState.startsUsed}
            maxStarts={maxStarts}
            replaysUsed={replaysUsed(replayState)}
            onNext={goNext}
            isLastTask={taskIndex + 1 >= plan.taskCount}
          />
          {listeningNextActions.length > 0 ? (
            <Card variant="outlined" padding="md" className="border-slate-200 bg-surface-elevated">
              <CardTitle className="text-body font-semibold text-ink-primary">Slimme vervolgstappen</CardTitle>
              <p className="mt-2 text-body-sm text-ink-secondary leading-relaxed">
                Scenario’s, korte drills en lessen die passen bij deze luisteropdracht.
              </p>
              <div className="mt-4">
                <ExamPrepNextStepLinks
                  actions={listeningNextActions}
                  examType="listening"
                  examMode="training"
                  analyticsContext={{
                    task_id: item.id,
                    question_type: item.questionType,
                    context: 'listening_result',
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
            href="/app/exam-prep/listening"
            className="mt-2 flex min-h-touch w-full items-center justify-center rounded-lg border border-slate-300 bg-white text-body-sm font-semibold text-ink-primary"
          >
            Terug naar luisteren — examen
          </Link>
        </Card>
      ) : null}
    </div>
  )
}
