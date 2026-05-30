'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { clsx } from 'clsx'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import { mergeStepFeedback } from '@/lib/lesson-engine/feedback'
import { recordSchemaMistake } from '@/lib/lesson-engine/mistakeTracker'
import { firstExercise } from '@/lib/lesson-engine/stepHandler'
import type { Exercise } from '@/lib/schemas/exercise.schema'
import type { LessonStep } from '@/lib/schemas/lessonStep.schema'
import { PreviewCard, type PreviewItem } from '@/components/lesson/PreviewCard'
import { DialoguePlayer, type DialogueLine } from '@/components/lesson/DialoguePlayer'
import { PhraseDiscovery, type PhraseItem } from '@/components/lesson/PhraseDiscovery'
import { InlineGrammarCard, type GrammarInlineContent } from '@/components/lesson/InlineGrammarCard'
import { ChoiceExercise } from '@/components/lesson/ChoiceExercise'
import { ReorderExercise } from '@/components/lesson/ReorderExercise'
import { FillBlankExercise } from '@/components/lesson/FillBlankExercise'
import { SpeakPrompt } from '@/components/lesson/SpeakPrompt'
import { WritePrompt } from '@/components/lesson/WritePrompt'
import { RecapCard, type RecapTask } from '@/components/lesson/RecapCard'
import { Button } from '@/components/ui/Button'

function textCorrectAnswer(ex: Exercise): string {
  return typeof ex.correctAnswer === 'string' ? ex.correctAnswer : ''
}

type Props = {
  lessonId: string
  step: LessonStep
  onStepForward: () => void
  onScheduleForward: (ms: number) => void
  onLessonComplete: () => void | Promise<void>
  /** Preview + grammar_card need an explicit “Verder”; auto steps set false. */
  onManualContinueChange: (available: boolean) => void
}

export function LessonStepRenderer({
  lessonId,
  step,
  onStepForward,
  onScheduleForward,
  onLessonComplete,
  onManualContinueChange,
}: Props) {
  const [banner, setBanner] = useState<{ tone: 'correct' | 'incorrect' | 'hint'; text: string } | null>(null)
  const [previewOk, setPreviewOk] = useState(false)
  const [listenOk, setListenOk] = useState(false)
  const [discoveryOk, setDiscoveryOk] = useState(false)
  const [grammarOk, setGrammarOk] = useState(false)
  const [mcqOk, setMcqOk] = useState(false)
  const [reorderOk, setReorderOk] = useState(false)
  const [speakOk, setSpeakOk] = useState(false)
  const [buildPhase, setBuildPhase] = useState<1 | 2>(1)
  const [fillOk, setFillOk] = useState(false)
  const [reorder2Ok, setReorder2Ok] = useState(false)
  const [listenMcqRound, setListenMcqRound] = useState(0)
  const [practiceLoopIdx, setPracticeLoopIdx] = useState(0)
  const [practiceLoopComplete, setPracticeLoopComplete] = useState(false)
  const [writeOk, setWriteOk] = useState(false)
  const [previewPlayedIds, setPreviewPlayedIds] = useState<Set<string>>(() => new Set())
  /** Multi-MCQ listening: short “next question / done” pause so transitions feel intentional. */
  const [listenHoldMessage, setListenHoldMessage] = useState<string | null>(null)
  const listenTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (listenTimerRef.current != null) {
      window.clearTimeout(listenTimerRef.current)
      listenTimerRef.current = null
    }
    setListenHoldMessage(null)
    setBanner(null)
    setPreviewOk(false)
    setListenOk(false)
    setDiscoveryOk(false)
    setGrammarOk(false)
    setMcqOk(false)
    setReorderOk(false)
    setSpeakOk(false)
    setBuildPhase(1)
    setFillOk(false)
    setReorder2Ok(false)
    setListenMcqRound(0)
    setPracticeLoopIdx(0)
    setPracticeLoopComplete(false)
    setWriteOk(false)
    setPreviewPlayedIds(new Set())
  }, [step.id])

  useEffect(() => {
    if (step.type === 'preview') onManualContinueChange(previewOk)
    else if (step.type === 'grammar_card') onManualContinueChange(grammarOk)
    else onManualContinueChange(false)
  }, [step.type, previewOk, grammarOk, onManualContinueChange])

  useEffect(() => {
    if (step.type !== 'discovery' || !discoveryOk) return
    const id = window.setTimeout(() => onStepForward(), 480)
    return () => window.clearTimeout(id)
  }, [step.type, discoveryOk, onStepForward])

  useEffect(() => {
    if (step.type !== 'preview' || !step.interactionConfig?.requireAllPreviewPlayed) return
    const raw = step.content?.previewItems
    if (!Array.isArray(raw)) return
    const ids = raw
      .filter((x): x is Record<string, unknown> => x !== null && typeof x === 'object')
      .map((x) => String(x.id ?? ''))
      .filter(Boolean)
    if (ids.length === 0) return
    const all = ids.every((id) => previewPlayedIds.has(id))
    if (all) {
      setPreviewOk(true)
      onManualContinueChange(true)
    }
  }, [step.type, step.content, step.interactionConfig, previewPlayedIds, onManualContinueChange])

  const showHint = useCallback(() => {
    const fb = mergeStepFeedback(step.feedbackConfig, 'hint')
    setBanner({ tone: 'hint', text: fb.body })
    track(ANALYTICS_EVENTS.schema_lesson_hint_used, { lessonId, stepId: step.id })
  }, [lessonId, step.feedbackConfig, step.id])

  const onWrong = useCallback(
    (errorType: 'grammar' | 'vocab' | 'order' | 'pronunciation', userAnswer: string, correctAnswer: string) => {
      const fb = mergeStepFeedback(step.feedbackConfig, 'incorrect')
      setBanner({ tone: 'incorrect', text: fb.body })
      track(ANALYTICS_EVENTS.schema_lesson_answer_incorrect, {
        lessonId,
        stepId: step.id,
        errorType,
      })
      recordSchemaMistake({
        lessonId,
        stepId: step.id,
        itemId: step.id,
        errorType,
        userAnswer,
        correctAnswer,
        weakTags: step.feedbackConfig?.errorTags,
      })
    },
    [lessonId, step.feedbackConfig, step.id]
  )

  const onRight = useCallback(() => {
    const fb = mergeStepFeedback(step.feedbackConfig, 'correct')
    setBanner({ tone: 'correct', text: fb.body })
    track(ANALYTICS_EVENTS.schema_lesson_answer_correct, { lessonId, stepId: step.id })
  }, [lessonId, step.feedbackConfig, step.id])

  switch (step.type) {
    case 'preview': {
      const raw = step.content?.previewItems
      const items: PreviewItem[] = Array.isArray(raw)
        ? raw
            .filter((x): x is Record<string, unknown> => x !== null && typeof x === 'object')
            .map((x) => ({
              id: String(x.id ?? ''),
              word: String(x.word ?? ''),
              lemma: String(x.lemma ?? ''),
              translationEn: String(x.translationEn ?? ''),
              emoji: typeof x.emoji === 'string' ? x.emoji : undefined,
            }))
            .filter((x) => x.id && x.word)
        : []
      const requireAllPreview = Boolean(step.interactionConfig?.requireAllPreviewPlayed)

      return (
        <div className="space-y-4">
          <PreviewCard
            items={items}
            onEngaged={() => {
              if (!requireAllPreview) {
                setPreviewOk(true)
                onManualContinueChange(true)
              }
            }}
            onItemPlayed={(id) => {
              if (!requireAllPreview) return
              setPreviewPlayedIds((prev) => {
                const n = new Set(prev)
                n.add(id)
                return n
              })
            }}
          />
          {banner && <FeedbackStrip banner={banner} />}
          <p className="text-caption text-center text-ink-tertiary">
            {requireAllPreview
              ? previewOk
                ? 'Top — tik onderaan op Verder.'
                : `Luister naar elke kaart (${previewPlayedIds.size}/${items.length}).`
              : previewOk
                ? 'Top — tik onderaan op Verder.'
                : 'Swipe en tik minstens één keer op 🔊'}
          </p>
        </div>
      )
    }
    case 'listening':
    case 'listen_read':
    case 'scenario_chat': {
      const c = step.content ?? {}
      const dialogue = Array.isArray(c.dialogue) ? (c.dialogue as DialogueLine[]) : []
      const hide =
        step.type === 'listen_read' ? false : Boolean(c.hideTranscriptUntilPlayed)
      const mcqs = (step.exercises ?? []).filter((e): e is Exercise => e.type === 'multiple_choice')
      if (!mcqs.length) {
        return <p className="text-body-sm text-error">Oefening ontbreekt in deze stap.</p>
      }

      if (mcqs.length === 1) {
        const ex = mcqs[0]
        return (
          <div className="space-y-4">
            <DialoguePlayer
              dialogue={dialogue}
              hideTranscriptUntilPlayed={hide}
              exercise={ex}
              disabled={listenOk}
              onAnswer={(ok, choice) => {
                if (ok) {
                  onRight()
                  setListenOk(true)
                  onScheduleForward(750)
                } else {
                  onWrong('vocab', choice, textCorrectAnswer(ex))
                }
              }}
            />
            {banner && <FeedbackStrip banner={banner} />}
            {!listenOk && (
              <button type="button" onClick={showHint} className="text-body-sm text-primary-600 underline w-full">
                Hint
              </button>
            )}
          </div>
        )
      }

      const currentMcq = mcqs[listenMcqRound]
      if (!currentMcq) {
        return <p className="text-body-sm text-error">Oefening ontbreekt of index klopt niet.</p>
      }
      const scheduleListenMulti = (isLastQuestion: boolean) => {
        if (listenTimerRef.current != null) {
          window.clearTimeout(listenTimerRef.current)
          listenTimerRef.current = null
        }
        if (isLastQuestion) {
          setListenHoldMessage('Alle vragen goed — je gaat zo door.')
          listenTimerRef.current = window.setTimeout(() => {
            listenTimerRef.current = null
            // Do not clear hold here — would briefly remount the last MCQ. Next step’s effect resets state.
            onStepForward()
          }, 700)
          return
        }
        setListenHoldMessage('Goed! Volgende vraag…')
        listenTimerRef.current = window.setTimeout(() => {
          listenTimerRef.current = null
          setListenHoldMessage(null)
          setListenMcqRound((r) => r + 1)
        }, 520)
      }

      return (
        <div className="space-y-4">
          <DialoguePlayer dialogue={dialogue} hideTranscriptUntilPlayed={hide} />
          {!listenOk && (
            <>
              <div className="flex justify-center gap-2 py-1" aria-hidden="true">
                {mcqs.map((_, i) => (
                  <span
                    key={i}
                    className={clsx(
                      'h-2.5 w-2.5 rounded-full transition-all duration-300',
                      i === listenMcqRound && 'scale-125 bg-primary-600 ring-2 ring-primary-200',
                      i < listenMcqRound && 'bg-primary-400',
                      i > listenMcqRound && 'bg-slate-200'
                    )}
                  />
                ))}
              </div>
              <div className="text-center space-y-1">
                <p className="text-body-sm font-semibold text-ink-primary">
                  Vraag {listenMcqRound + 1} van {mcqs.length}
                </p>
                <p className="text-caption text-ink-tertiary">
                  Tik ▶ Speel gesprek om nog eens te luisteren.
                </p>
              </div>
              {listenHoldMessage ? (
                <div
                  role="status"
                  className="rounded-2xl border border-emerald-200 bg-emerald-50/95 px-4 py-8 text-center shadow-card space-y-2 transition-opacity duration-300"
                >
                  <p className="text-body-lg font-semibold text-emerald-950">{listenHoldMessage}</p>
                  <p className="text-caption text-emerald-800">Even geduld…</p>
                </div>
              ) : (
                <ChoiceExercise
                  key={`${step.id}-lmq-${listenMcqRound}`}
                  exercise={currentMcq}
                  onResult={(ok, choice) => {
                    if (!ok) {
                      onWrong('vocab', choice, textCorrectAnswer(currentMcq))
                      return
                    }
                    onRight()
                    const last = listenMcqRound >= mcqs.length - 1
                    scheduleListenMulti(last)
                  }}
                />
              )}
            </>
          )}
          {banner && <FeedbackStrip banner={banner} />}
          {!listenOk && !listenHoldMessage && (
            <button type="button" onClick={showHint} className="text-body-sm text-primary-600 underline w-full">
              Hint
            </button>
          )}
          {listenHoldMessage?.includes('Alle vragen goed') && (
            <div className="pt-2">
              <Button variant="secondary" fullWidth size="lg" onClick={() => onStepForward()}>
                Verder (als het hangt)
              </Button>
            </div>
          )}
        </div>
      )
    }
    case 'discovery': {
      const raw = step.content?.phrases
      const phrases: PhraseItem[] = Array.isArray(raw)
        ? raw
            .filter((x): x is Record<string, unknown> => x !== null && typeof x === 'object')
            .map((x) => ({
              nl: String(x.nl ?? ''),
              en: String(x.en ?? ''),
              focus: typeof x.focus === 'string' ? x.focus : undefined,
            }))
            .filter((x) => x.nl)
        : []
      return (
        <div className="space-y-4">
          <PhraseDiscovery
            key={step.id}
            phrases={phrases}
            onAllTapped={() => setDiscoveryOk(true)}
          />
          {discoveryOk ? (
            <p className="text-caption text-center text-success">{mergeStepFeedback(undefined, 'correct').body}</p>
          ) : (
            <p className="text-caption text-center text-ink-tertiary">Tik elke zin één keer.</p>
          )}
        </div>
      )
    }
    case 'grammar_card': {
      const c = step.content ?? {}
      const content: GrammarInlineContent = {
        title: String(c.title ?? 'Grammar'),
        summary: String(c.summary ?? ''),
        examples: Array.isArray(c.examples)
          ? (c.examples as { nl: string; en?: string }[])
          : [],
      }
      return (
        <div className="space-y-4">
          <InlineGrammarCard
            content={content}
            onExpand={() => {
              setGrammarOk(true)
              onManualContinueChange(true)
            }}
          />
          {grammarOk && (
            <p className="text-caption text-center text-ink-secondary">
              Klaar voor oefenen? Tik onderaan op Verder.
            </p>
          )}
        </div>
      )
    }
    case 'mcq': {
      const ex = firstExercise(step)
      if (!ex || ex.type !== 'multiple_choice') {
        return <p className="text-body-sm text-error">MCQ ontbreekt.</p>
      }
      return (
        <div className="space-y-4">
          <ChoiceExercise
            key={step.id}
            exercise={ex}
            disabled={mcqOk}
            onResult={(ok, choice) => {
              if (ok) {
                onRight()
                setMcqOk(true)
                onScheduleForward(750)
              } else {
                onWrong('grammar', choice, textCorrectAnswer(ex))
              }
            }}
          />
          {banner && <FeedbackStrip banner={banner} />}
          {!mcqOk && (
            <button type="button" onClick={showHint} className="text-body-sm text-primary-600 underline w-full">
              Hint
            </button>
          )}
        </div>
      )
    }
    case 'reorder': {
      const ex = firstExercise(step)
      if (!ex || ex.type !== 'reorder') {
        return <p className="text-body-sm text-error">Reorder ontbreekt.</p>
      }
      const delim =
        typeof step.interactionConfig?.delimiter === 'string' ? step.interactionConfig.delimiter : ' '
      return (
        <div className="space-y-4">
          <ReorderExercise
            key={step.id}
            exercise={ex}
            delimiter={delim}
            disabled={reorderOk}
            onResult={(ok, built) => {
              if (ok) {
                onRight()
                setReorderOk(true)
                onScheduleForward(750)
              } else {
                onWrong('order', built, textCorrectAnswer(ex))
              }
            }}
          />
          {banner && <FeedbackStrip banner={banner} />}
        </div>
      )
    }
    case 'speaking': {
      const c = step.content ?? {}
      const targetNl = String(c.targetNl ?? '')
      const acceptable = Array.isArray(c.acceptable) ? (c.acceptable as string[]) : undefined
      const mockTranscript =
        typeof step.interactionConfig?.mockTranscript === 'string'
          ? step.interactionConfig.mockTranscript
          : undefined
      return (
        <div className="space-y-4">
          <SpeakPrompt
            targetNl={targetNl}
            acceptable={acceptable}
            mockTranscript={mockTranscript}
            disabled={speakOk}
            onResult={(pass, detail) => {
              track(ANALYTICS_EVENTS.schema_lesson_speaking_attempt, {
                lessonId,
                stepId: step.id,
                pass,
                detail,
              })
              if (pass) {
                onRight()
                setSpeakOk(true)
                onScheduleForward(900)
              } else {
                onWrong('pronunciation', detail, targetNl)
              }
            }}
          />
          {banner && <FeedbackStrip banner={banner} />}
        </div>
      )
    }
    case 'fill_blank': {
      const ex = firstExercise(step)
      if (!ex || ex.type !== 'fill_blank') {
        return <p className="text-body-sm text-error">Fill blank ontbreekt.</p>
      }
      const follow = step.content?.followUpReorder as
        | { tokens?: string[]; correctAnswer?: string }
        | undefined
      const tokens = Array.isArray(follow?.tokens) ? follow!.tokens! : null
      const ans2 = typeof follow?.correctAnswer === 'string' ? follow.correctAnswer : null

      if (buildPhase === 1) {
        return (
          <div className="space-y-4">
            <FillBlankExercise
              key={`${step.id}-a`}
              exercise={ex}
              disabled={fillOk}
              onResult={(ok, choice) => {
                if (ok) {
                  onRight()
                  setFillOk(true)
                  if (tokens && ans2) {
                    window.setTimeout(() => setBuildPhase(2), 500)
                  } else {
                    onScheduleForward(700)
                  }
                } else {
                  onWrong('vocab', choice, textCorrectAnswer(ex))
                }
              }}
            />
            {banner && <FeedbackStrip banner={banner} />}
          </div>
        )
      }

      const ex2: Exercise = {
        id: `${step.id}-build2`,
        type: 'reorder',
        question: 'Bouw nu de groet.',
        options: [...tokens!],
        correctAnswer: ans2!,
        difficulty: 'A2_low',
        metadata: {},
      }
      return (
        <div className="space-y-4">
          <ReorderExercise
            key={`${step.id}-b`}
            exercise={ex2}
            disabled={reorder2Ok}
            onResult={(ok, built) => {
              if (ok) {
                onRight()
                setReorder2Ok(true)
                onScheduleForward(750)
              } else {
                onWrong('order', built, ans2!)
              }
            }}
          />
          {banner && <FeedbackStrip banner={banner} />}
        </div>
      )
    }
    case 'practice_loop': {
      const exs = (step.exercises ?? []) as Exercise[]
      if (!exs.length) {
        return <p className="text-body-sm text-error">practice_loop heeft geen oefeningen.</p>
      }
      const cur = exs[practiceLoopIdx]
      const delim =
        typeof step.interactionConfig?.delimiter === 'string' ? step.interactionConfig.delimiter : ' '

      const finishOrNextPractice = () => {
        const i = practiceLoopIdx
        if (i + 1 < exs.length) {
          setPracticeLoopIdx(i + 1)
          return
        }
        setPracticeLoopComplete(true)
        window.setTimeout(() => {
          onStepForward()
        }, 650)
      }

      if (practiceLoopComplete) {
        return <p className="text-caption text-center text-ink-tertiary">Ronde klaar.</p>
      }

      if (!cur) {
        return <p className="text-body-sm text-error">Oefening ontbreekt op deze index.</p>
      }

      return (
        <div className="space-y-4">
          <p className="text-caption text-center text-ink-secondary">
            Oefening {practiceLoopIdx + 1} van {exs.length}
          </p>
          {cur.type === 'multiple_choice' && (
            <ChoiceExercise
              key={`${step.id}-pl-${practiceLoopIdx}`}
              exercise={cur}
              onResult={(ok, choice) => {
                if (ok) {
                  onRight()
                  finishOrNextPractice()
                } else {
                  onWrong('grammar', choice, textCorrectAnswer(cur))
                }
              }}
            />
          )}
          {cur.type === 'reorder' && (
            <ReorderExercise
              key={`${step.id}-pl-${practiceLoopIdx}`}
              exercise={cur}
              delimiter={delim}
              onResult={(ok, built) => {
                if (ok) {
                  onRight()
                  finishOrNextPractice()
                } else {
                  onWrong('order', built, textCorrectAnswer(cur))
                }
              }}
            />
          )}
          {cur.type === 'fill_blank' && (
            <FillBlankExercise
              key={`${step.id}-pl-${practiceLoopIdx}`}
              exercise={cur}
              onResult={(ok, choice) => {
                if (ok) {
                  onRight()
                  finishOrNextPractice()
                } else {
                  onWrong('vocab', choice, textCorrectAnswer(cur))
                }
              }}
            />
          )}
          {!['multiple_choice', 'reorder', 'fill_blank'].includes(cur.type) && (
            <p className="text-body-sm text-error">Oefeningstype “{cur.type}” wordt in practice_loop nog niet ondersteund.</p>
          )}
          {banner && <FeedbackStrip banner={banner} />}
          {!practiceLoopComplete && (
            <button type="button" onClick={showHint} className="text-body-sm text-primary-600 underline w-full">
              Hint
            </button>
          )}
        </div>
      )
    }
    case 'writing': {
      const c = step.content ?? {}
      const prompt = String(c.prompt ?? step.prompt ?? 'Schrijf kort in het Nederlands.')
      const acceptable = Array.isArray(c.acceptable) ? (c.acceptable as string[]) : []
      if (!acceptable.length) {
        return <p className="text-body-sm text-error">Schrijfstap mist acceptable-antwoorden.</p>
      }
      const modelNl = typeof c.modelNl === 'string' ? c.modelNl : undefined
      const minChars = typeof c.minChars === 'number' ? c.minChars : 4
      return (
        <div className="space-y-4">
          <WritePrompt
            prompt={prompt}
            acceptable={acceptable}
            modelNl={modelNl}
            minChars={minChars}
            disabled={writeOk}
            onResult={(pass, detail) => {
              if (pass) {
                onRight()
                setWriteOk(true)
                onScheduleForward(900)
              } else if (detail === 'too_short') {
                setBanner({
                  tone: 'hint',
                  text: `Even iets langer — minimaal ${minChars} tekens.`,
                })
              } else {
                onWrong('grammar', detail, acceptable[0] ?? '')
              }
            }}
          />
          {banner && <FeedbackStrip banner={banner} />}
        </div>
      )
    }
    case 'recap': {
      const raw = step.content?.tasks
      const tasks: RecapTask[] = Array.isArray(raw) ? (raw as RecapTask[]) : []
      return (
        <RecapCard
          key={step.id}
          tasks={tasks}
          onComplete={() => {
            void onLessonComplete()
          }}
        />
      )
    }
    default:
      return (
        <p className="text-body-sm text-ink-secondary">
          Staptype “{(step as LessonStep).type}” wordt in deze slice nog niet gerenderd.
        </p>
      )
  }
}

function FeedbackStrip({ banner }: { banner: { tone: string; text: string } }) {
  return (
    <div
      role="status"
      className={clsx(
        'rounded-xl px-4 py-3 text-body-sm transition-all duration-300',
        banner.tone === 'correct' && 'bg-green-50 text-green-900 border border-green-200',
        banner.tone === 'incorrect' && 'bg-red-50 text-red-900 border border-red-200',
        banner.tone === 'hint' && 'bg-amber-50 text-amber-950 border border-amber-200'
      )}
    >
      {banner.text}
    </div>
  )
}
