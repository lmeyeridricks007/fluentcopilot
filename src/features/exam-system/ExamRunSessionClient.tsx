'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { clsx } from 'clsx'
import { ChevronLeft, ClipboardCheck, Loader2, Mic, Square } from 'lucide-react'
import { formatBlueprintDebugSummary, formatLastAttemptDebug, formatTimersDebug } from '@/lib/exam-system/examDevDebugFormat'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardDescription, CardTitle } from '@/components/ui/Card'
import { useAuthStore } from '@/store/authStore'
import { appendSessionActivityClient } from '@/store/sessionActivityStore'
import { LOCAL_ANONYMOUS_LEARNER_ID } from '@/lib/storage/storageKeys'
import { APP_EXAM_SIMULATION_REPORT, APP_EXAM_SYSTEM, APP_EXAM_TRAINING_REPORT } from '@/lib/routing/appRoutes'
import { getClientTimeZone, invalidateProgressionQueries } from '@/lib/hooks/useProgression'
import { getExamProfile } from '@/lib/exam-system/examProfileRegistry'
import {
  computeFullExamWallRemaining,
  computeSessionWallClockRemaining,
  findSectionBlueprint,
  formatExamClock,
  getSectionsForRun,
  resolveSectionWallBudgetSeconds,
  resolveTotalEstimateDisplaySeconds,
  sectionPaceRemainingSeconds,
  sumSessionTasksSeconds,
} from '@/lib/exam-system/examTimerModel'
import {
  findExamTimerRule,
  resolveAnswerAutoSubmitOnTimeout,
  sectionWallIsStrict,
  trainingPrepIsTimed,
} from '@/lib/exam-system/examTimerPolicy'
import { coachingFeedbackLines, structurePatternLine, trainingGoalLine } from '@/lib/exam-system/trainingCoach'
import {
  allowSkipPrep,
  maxTrainingRetries,
  showCoachingAfterTask,
  showExamples,
  showHintsInAnswer,
  showHintsInPrep,
  showStructurePattern,
} from '@/lib/exam-system/trainingSupportPolicy'
import { applyExamPersonalizationClientEffects } from './examPersonalizationClient'
import { buildExamSessionActivityPayload } from './examHistoryCopy'
import { completeExamSession, fetchExamSession, submitExamTask } from './examApi'
import { ExamTimerDock } from './ExamTimerDock'
import { ExamDevDebugPanel } from './ui'
import { examTaskTypeLabel } from './examTaskLabels'
import { useExamRunTickers } from './useExamRunTickers'
import { PackReferenceAudioControls } from '@/features/generated-exercise-pack/PackReferenceAudioControls'
import { KnmExamQuestionMedia } from '@/features/exam-system/KnmExamQuestionMedia'
import { speakingPrepAudioLine } from '@/lib/exam-system/speakingPrepAudioLine'
import { listeningMcqDialogueLine, listeningMcqQuestionAndOptionsLine } from '@/lib/exam-system/listeningMcqReadAloud'
import { splitWritingExamPromptForDisplay } from '@/lib/exam-system/writingExamPromptLayout'
import { composeWritingFillInAnswer } from '@/lib/exam-system/writingExamFillInCompose'
import { splitReadingExamMcqPrompt } from '@/lib/exam-system/readingExamMcqPromptSplit'
import { resolveListeningMcqDisplayText } from '@/lib/exam-system/listeningSpeakerNamePersonalization'
import {
  knowledgeMcqOptionDisplayLetter,
  knowledgeMcqOptionsShuffledForTask,
} from '@/lib/exam-system/knowledgeMcqOptionShuffle'
import {
  blobToBase64,
  maxTranscribeBase64Chars,
  requestPronunciationAssessment,
  transcribeSpeechAudio,
  userFacingTranscriptionErrorMessage,
} from '@/lib/speech/speechClient'
import { examVoiceSnapshotFromPronunciationResponse } from '@/lib/exam-system/examVoiceScoring'
import type { ExamVoiceAssessmentSnapshot } from '@/lib/exam-system/types'
import {
  prepareAudioForAzurePronunciationAssessment,
  shouldPrepareWebmLikeForServerStt,
} from '@/lib/speech/prepareAudioForAzurePronunciationAssessment'
import { useRecorder } from '@/lib/speech/useRecorder'

const SIMULATION_INTRO_SECONDS = 5

type SimPhase = 'intro' | 'prep' | 'answer'
type TrainPhase = 'prep' | 'answer' | 'reflect'

export function ExamRunSessionClient(props: { mode: 'simulation' | 'training' }) {
  const router = useRouter()
  const qc = useQueryClient()
  const search = useSearchParams()
  const sessionId = search.get('id')?.trim() ?? ''
  const userId = useAuthStore((s) => s.user?.id) ?? LOCAL_ANONYMOUS_LEARNER_ID
  const tz = getClientTimeZone()
  const isSim = props.mode === 'simulation'
  const autoFiredRef = useRef(false)
  /**
   * MCQ option ids repeat across tasks (e.g. every stem uses a–d). Track which task the current `answer`
   * was chosen for so a letter from Q1 cannot highlight Q2 before state catches up.
   */
  const examMcqAnswerTaskIdRef = useRef<string | null>(null)
  /** Scroll `AppLayout`’s `main` to this run’s top when the task changes (next/previous, training advance). */
  const taskScrollAnchorRef = useRef<HTMLDivElement>(null)

  const sessionQ = useQuery({
    queryKey: ['exam', 'session', userId, sessionId],
    queryFn: () => fetchExamSession(userId, sessionId),
    enabled: Boolean(sessionId),
  })

  const tasks = sessionQ.data?.tasks ?? []
  const session = sessionQ.data

  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState<SimPhase>(() => (isSim ? 'intro' : 'prep'))
  const [trainPhase, setTrainPhase] = useState<TrainPhase>('prep')
  const [sectionAnchorMs, setSectionAnchorMs] = useState(() => Date.now())
  const [answer, setAnswer] = useState('')
  /** A2 form-fill writing: one draft string per invul-bullet; composed on submit. */
  const [writingFillInFieldValues, setWritingFillInFieldValues] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  /** Distinguish mid-exam save vs final report build so the button label stays honest. */
  const [submitPhase, setSubmitPhase] = useState<'save' | 'finish' | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [hintRevealed, setHintRevealed] = useState(false)
  const [reflectLines, setReflectLines] = useState<string[]>([])
  const recorder = useRecorder()
  const [sttBusy, setSttBusy] = useState(false)
  const [voiceAssessBusy, setVoiceAssessBusy] = useState(false)
  const [speakingSttError, setSpeakingSttError] = useState<string | null>(null)
  const [recordingPreviewUrl, setRecordingPreviewUrl] = useState<string | null>(null)
  const recordingPreviewUrlRef = useRef<string | null>(null)
  /** A2 speaking: Azure pronunciation snapshot for the last successful recording (submitted with the attempt). */
  const voiceForSubmitRef = useRef<ExamVoiceAssessmentSnapshot | null>(null)
  const [voiceScoredForSubmit, setVoiceScoredForSubmit] = useState(false)

  const task = tasks[idx]

  const listeningMcqDisplay = useMemo(() => {
    if (!session || !task || task.taskType !== 'listening_mcq_exam') return null
    return resolveListeningMcqDisplayText(task, session.id)
  }, [session, task])

  const writingPromptParts = useMemo(() => {
    if (!task || task.taskType !== 'writing_task_exam') return null
    return splitWritingExamPromptForDisplay(task.promptNl, {
      fillInBulletsNl: task.writingFillInBulletsNl,
      answerSkeletonNl: task.writingAnswerSkeletonNl,
    })
  }, [task?.id, task?.taskType, task?.promptNl, task?.writingFillInBulletsNl, task?.writingAnswerSkeletonNl])

  const profile = useMemo(() => (session ? getExamProfile(session.profileId) : undefined), [session])

  useEffect(() => {
    voiceForSubmitRef.current = null
    setVoiceScoredForSubmit(false)
  }, [idx])
  /** A1/A2 speaking simulation: overall/section time — not a fixed countdown per answer. */
  const speakingSimA2RelaxedTimers = Boolean(
    isSim && (session?.level === 'A2' || session?.level === 'A1') && profile?.examCode === 'inburgering_speaking',
  )
  /** Listening simulation: no per-question answer deadline — only overall exam time. */
  const listeningSimRelaxedAnswerTimers = Boolean(isSim && profile?.examCode === 'inburgering_listening')
  /** Writing simulation (all levels): whole-exam budget only; no per-prompt answer cap in the UI. */
  const writingSimRelaxedAnswerTimers = Boolean(isSim && profile?.examCode === 'inburgering_writing')
  /** A2 reading simulation: whole-exam budget only — no per-question answer countdown in the UI. */
  const readingSimRelaxedAnswerTimers = Boolean(
    isSim && session?.level === 'A2' && profile?.examCode === 'inburgering_reading',
  )
  /** KNM simulation (all levels): whole-exam budget only — no per-question answer countdown in the UI. */
  const knmSimRelaxedAnswerTimers = Boolean(isSim && profile?.examCode === 'inburgering_knm')
  const simRelaxedAnswerTimers =
    speakingSimA2RelaxedTimers ||
    listeningSimRelaxedAnswerTimers ||
    writingSimRelaxedAnswerTimers ||
    readingSimRelaxedAnswerTimers ||
    knmSimRelaxedAnswerTimers

  /** Simulation runs that hide the timer dock (whole-exam clock only, shown in the header). */
  const hideExamTimerDockInSim =
    speakingSimA2RelaxedTimers ||
    listeningSimRelaxedAnswerTimers ||
    writingSimRelaxedAnswerTimers ||
    readingSimRelaxedAnswerTimers ||
    knmSimRelaxedAnswerTimers

  const clearRecordingPreview = useCallback(() => {
    if (recordingPreviewUrlRef.current) {
      URL.revokeObjectURL(recordingPreviewUrlRef.current)
      recordingPreviewUrlRef.current = null
    }
    setRecordingPreviewUrl(null)
  }, [])

  const setRecordingPreviewFromBlob = useCallback((blob: Blob | null) => {
    clearRecordingPreview()
    if (!blob || blob.size < 32) return
    const u = URL.createObjectURL(blob)
    recordingPreviewUrlRef.current = u
    setRecordingPreviewUrl(u)
  }, [clearRecordingPreview])
  const sectionTitle = useMemo(() => {
    if (!task || !profile) return ''
    return profile.supportedSections.find((s) => s.id === task.sectionId)?.title ?? task.sectionId
  }, [task, profile])

  const support = session?.trainingSupport ?? 'light_guidance'
  const timedMeta = session?.xpMeta?.timedTraining ?? false

  const prepRuleTrain = useMemo(
    () => (profile ? findExamTimerRule(profile.timers.trainingDefaults, 'prep') : undefined),
    [profile],
  )

  const prepTimed = useMemo(() => {
    if (isSim) return true
    return trainingPrepIsTimed({
      support,
      timedTraining: Boolean(timedMeta),
      prepRule: prepRuleTrain,
    })
  }, [isSim, support, timedMeta, prepRuleTrain])

  const sectionRule = useMemo(() => {
    if (!profile) return undefined
    const sim = findExamTimerRule(profile.timers.simulation, 'section')
    const train = findExamTimerRule(profile.timers.trainingDefaults, 'section')
    return isSim ? sim : train ?? sim
  }, [profile, isSim])

  const blueprintSections = useMemo(
    () => (profile ? getSectionsForRun(profile, isSim ? 'simulation' : 'training') : []),
    [profile, isSim],
  )

  const sectionBp = useMemo(() => {
    if (!task) return undefined
    return findSectionBlueprint(blueprintSections, task.sectionId)
  }, [task, blueprintSections])

  const sectionWallBudgetSec = useMemo(() => {
    if (!sectionRule) return null
    return resolveSectionWallBudgetSeconds(sectionRule.seconds ?? 0, sectionBp?.sectionSeconds)
  }, [sectionRule, sectionBp])

  const sectionWallStrict = sectionWallIsStrict({
    runMode: isSim ? 'simulation' : 'training',
    timedTraining: Boolean(timedMeta),
    support,
    sectionRule,
  })

  const answerAutoSubmit = useMemo(() => {
    if (simRelaxedAnswerTimers) return false
    if (!profile) return isSim
    return resolveAnswerAutoSubmitOnTimeout({
      runMode: isSim ? 'simulation' : 'training',
      timedTraining: Boolean(timedMeta),
      support,
      simAnswerRule: findExamTimerRule(profile.timers.simulation, 'answer'),
      trainAnswerRule: findExamTimerRule(profile.timers.trainingDefaults, 'answer'),
    })
  }, [profile, isSim, timedMeta, support, simRelaxedAnswerTimers])

  const phaseDurationSec = useMemo(() => {
    if (!task) return 0
    if (!isSim && trainPhase === 'reflect') return 0
    if (isSim && phase === 'intro') return SIMULATION_INTRO_SECONDS
    if (isSim && phase === 'prep') return task.prepSeconds
    if (isSim && phase === 'answer' && simRelaxedAnswerTimers) return 0
    if (isSim && phase === 'answer') return task.answerSeconds
    if (!isSim && trainPhase === 'prep') return prepTimed ? task.prepSeconds : 0
    if (!isSim && trainPhase === 'answer') return task.answerSeconds
    return 0
  }, [task, isSim, phase, trainPhase, prepTimed, simRelaxedAnswerTimers])

  const phaseTicking = useMemo(() => {
    if (!task) return false
    if (!isSim && trainPhase === 'reflect') return false
    if (isSim && phase === 'answer' && simRelaxedAnswerTimers) return false
    if (isSim) return true
    if (trainPhase === 'answer') return true
    if (trainPhase === 'prep') return prepTimed
    return false
  }, [task, isSim, trainPhase, prepTimed, simRelaxedAnswerTimers])

  const tickers = useExamRunTickers({
    active: Boolean(task) && (isSim || trainPhase !== 'reflect'),
    phaseDurationSec,
    phaseTicking,
    resetKey: `${session?.id ?? ''}-${idx}-${phase}-${trainPhase}`,
    sectionWallBudgetSec,
    sectionAnchorMs: sectionWallBudgetSec != null ? sectionAnchorMs : null,
    sectionWallStrict,
  })

  const [examWallStartedAtMs, setExamWallStartedAtMs] = useState<number | null>(null)
  const [examWallNowMs, setExamWallNowMs] = useState(() => Date.now())

  const hintAvailable = Boolean(task?.trainingHintsNl?.length)
  const exampleAvailable = Boolean(task?.trainingExampleNl)

  useEffect(() => {
    setIdx(0)
    setPhase(isSim ? 'intro' : 'prep')
    setTrainPhase('prep')
    examMcqAnswerTaskIdRef.current = null
    setAnswer('')
    setHintRevealed(false)
    setReflectLines([])
    autoFiredRef.current = false
    setSectionAnchorMs(Date.now())
  }, [sessionId, session?.id, isSim])

  useEffect(() => {
    setExamWallStartedAtMs(null)
  }, [session?.id])

  useEffect(() => {
    if (!isSim || !tasks.length || !profile) return
    const wallBudget = sumSessionTasksSeconds(tasks)
    if (wallBudget <= 0) return
    setExamWallStartedAtMs((prev) => (prev == null ? Date.now() : prev))
  }, [isSim, tasks.length, profile, session?.id, tasks])

  useEffect(() => {
    if (!isSim || examWallStartedAtMs == null) return
    if (!tasks.length || sumSessionTasksSeconds(tasks) <= 0) return
    const id = setInterval(() => setExamWallNowMs(Date.now()), 250)
    return () => clearInterval(id)
  }, [isSim, examWallStartedAtMs, tasks])

  useEffect(() => {
    if (!task) return
    setSectionAnchorMs(Date.now())
  }, [task?.sectionId, session?.id])

  useEffect(() => {
    autoFiredRef.current = false
  }, [idx, phase, trainPhase, task?.id])

  /** Clear answer and speaking UI before paint so the next task never flashes the previous selection. */
  useLayoutEffect(() => {
    examMcqAnswerTaskIdRef.current = null
    setAnswer('')
    recorder.cancel()
    setSpeakingSttError(null)
    clearRecordingPreview()
  }, [task?.id, recorder.cancel, clearRecordingPreview])

  /** A2 Schrijven (training): prefill after clear — sim path restores skeleton in the A2 sim effect below. */
  useLayoutEffect(() => {
    if (isSim) return
    if (!task || task.taskType !== 'writing_task_exam') return
    if (task.writingFillInBulletsNl?.length) return
    const sk = task.writingAnswerSkeletonNl?.trim()
    if (!sk) return
    const lastAttempt = session && [...session.attempts].reverse().find((a) => a.taskId === task.id)
    if (lastAttempt) return
    setAnswer(sk)
  }, [
    isSim,
    task?.id,
    task?.taskType,
    task?.writingAnswerSkeletonNl,
    session?.attempts,
    session?.id,
  ])

  /** Simulation: revisiting a task restores the saved answer; relaxed exams skip the intro pause between questions. */
  useLayoutEffect(() => {
    if (!isSim || !task) return
    if (!session) return
    if (
      session.level !== 'A2' &&
      !(profile?.examCode === 'inburgering_writing' && task.taskType === 'writing_task_exam')
    ) {
      return
    }
    const lastAttempt = [...session.attempts].reverse().find((a) => a.taskId === task.id)
    if (lastAttempt) {
      setPhase('answer')
      setAnswer(lastAttempt.answerText)
      setVoiceScoredForSubmit(Boolean(lastAttempt.voice))
      voiceForSubmitRef.current = lastAttempt.voice ?? null
    } else {
      /** Reading / KNM / listening / writing sim: no intro pause between questions — go straight to answer. */
      if (
        (readingSimRelaxedAnswerTimers ||
          knmSimRelaxedAnswerTimers ||
          listeningSimRelaxedAnswerTimers ||
          writingSimRelaxedAnswerTimers) &&
        idx > 0
      ) {
        setPhase('answer')
      } else {
        setPhase('intro')
      }
      const multiWritingFill =
        task.taskType === 'writing_task_exam' && Boolean(task.writingFillInBulletsNl?.length)
      const writingSkeleton =
        task.taskType === 'writing_task_exam' && !multiWritingFill
          ? (task.writingAnswerSkeletonNl?.trim() ?? '')
          : ''
      setAnswer(writingSkeleton)
      setVoiceScoredForSubmit(false)
      voiceForSubmitRef.current = null
    }
    setHintRevealed(false)
    setReflectLines([])
    autoFiredRef.current = false
  }, [
    isSim,
    session?.level,
    session?.id,
    idx,
    task?.id,
    profile?.examCode,
    readingSimRelaxedAnswerTimers,
    knmSimRelaxedAnswerTimers,
    listeningSimRelaxedAnswerTimers,
    writingSimRelaxedAnswerTimers,
    task?.taskType,
    task?.writingAnswerSkeletonNl,
    task?.writingFillInBulletsNl,
  ])

  useLayoutEffect(() => {
    if (!task?.id) return
    const el = taskScrollAnchorRef.current
    if (!el) return
    el.scrollIntoView({ block: 'start', behavior: 'auto' })
    requestAnimationFrame(() => {
      el.focus({ preventScroll: true })
    })
  }, [task?.id])

  useEffect(
    () => () => {
      if (recordingPreviewUrlRef.current) {
        URL.revokeObjectURL(recordingPreviewUrlRef.current)
        recordingPreviewUrlRef.current = null
      }
    },
    [],
  )

  useEffect(() => {
    if (!task) return
    if (!isSim && trainPhase === 'reflect') return
    const rem = tickers.phaseRemainingSec
    if (rem == null || rem > 0) return
    if (!phaseTicking || phaseDurationSec <= 0) return
    if (isSim) {
      if (phase === 'intro') {
        setPhase('prep')
        return
      }
      if (phase === 'prep') {
        setPhase('answer')
      }
      return
    }
    if (trainPhase === 'prep') {
      setTrainPhase('answer')
    }
  }, [task, isSim, trainPhase, phase, tickers.phaseRemainingSec, phaseTicking, phaseDurationSec])

  const advanceAfterTrainingReflect = useCallback(async () => {
    const refreshed = await sessionQ.refetch()
    const cur = refreshed.data
    if (!cur) return
    const n = cur.tasks.length
    if (idx + 1 >= n) {
      const res = await completeExamSession(userId, cur.id)
      const xs = res.session
      void qc.setQueryData(['exam', 'session', userId, xs.id], xs)
      appendSessionActivityClient(
        buildExamSessionActivityPayload(
          { id: xs.id, profileId: xs.profileId, level: xs.level, mode: xs.mode, scope: xs.scope },
          res.progression?.xpAwarded,
        ),
      )
      void qc.invalidateQueries({ queryKey: ['exam', 'sessions', userId] })
      void invalidateProgressionQueries(qc, userId, tz)
      const xp = res.progression?.xpAwarded
      const xpQ = typeof xp === 'number' && xp > 0 ? `&xp=${encodeURIComponent(String(xp))}` : ''
      router.replace(`${APP_EXAM_TRAINING_REPORT}?id=${encodeURIComponent(cur.id)}${xpQ}`)
    } else {
      setIdx((i) => i + 1)
      setTrainPhase('prep')
      setAnswer('')
      setHintRevealed(false)
      setReflectLines([])
      autoFiredRef.current = false
    }
  }, [idx, userId, qc, tz, router, sessionQ])

  const handleSubmit = useCallback(
    async (timedOut?: boolean) => {
      if (!session || !task || submitting) return
      const mcqOpts = Boolean(task.mcq?.options?.length)
      const answerForMcqSubmit = mcqOpts && examMcqAnswerTaskIdRef.current !== task.id ? '' : answer
      const fillInBullets = task.writingFillInBulletsNl
      const isWritingFillInMulti =
        task.taskType === 'writing_task_exam' && Boolean(fillInBullets?.length)

      let text: string
      if (isWritingFillInMulti && fillInBullets) {
        const anyField = writingFillInFieldValues.some((s) => s.trim())
        if (!timedOut && !anyField) return
        text = timedOut && !anyField
          ? '(Timed out — best effort placeholder.)'
          : composeWritingFillInAnswer(fillInBullets, writingFillInFieldValues).trim()
      } else {
        text = timedOut
          ? answerForMcqSubmit.trim() || (task.mcq ? '' : '(Timed out — best effort placeholder.)')
          : answerForMcqSubmit.trim()
        if (!timedOut && !text.trim()) return
      }
      setSubmitting(true)
      setSubmitPhase('save')
      setSubmitError(null)
      try {
        const priorCount = session.attempts.filter((a) => a.taskId === task.id).length
        const appendAsRetry = !isSim && priorCount > 0
        /**
         * Attach the Azure voice snapshot for ANY speaking-exam level (A1/A2/B1) — the scoring
         * engine applies a level-aware blend (`applyVoiceBlendToHeuristicScores`) so each level
         * gets its own audio-vs-text weighting. Limited to oral speaking tasks (no MCQ / read-aloud).
         */
        const oralSpeakingVoice =
          profile?.examCode === 'inburgering_speaking' &&
          !task.mcq?.options?.length &&
          task.taskType !== 'read_aloud_exam'
        const updated = await submitExamTask(userId, session.id, {
          taskId: task.id,
          answerText: text,
          retriesUsed: appendAsRetry ? priorCount : 0,
          appendAsRetry,
          voice: oralSpeakingVoice ? voiceForSubmitRef.current ?? undefined : undefined,
        })
        voiceForSubmitRef.current = null
        setVoiceScoredForSubmit(false)
        void qc.setQueryData(['exam', 'session', userId, session.id], updated)
        const s = updated
        if (!isSim && s) {
          const last = [...s.attempts].reverse().find((a) => a.taskId === task.id)
          if (last && showCoachingAfterTask(support)) {
            setReflectLines(
              coachingFeedbackLines({
                composite: last.composite,
                scores: last.scores,
                support,
              }),
            )
          } else {
            setReflectLines([])
          }
          setTrainPhase('reflect')
          examMcqAnswerTaskIdRef.current = null
          setAnswer('')
          autoFiredRef.current = false
          return
        }
        if (isSim && s) {
          if (idx + 1 >= s.tasks.length) {
            setSubmitPhase('finish')
            const res = await completeExamSession(userId, s.id)
            applyExamPersonalizationClientEffects(res.session)
            const xs = res.session
            void qc.setQueryData(['exam', 'session', userId, xs.id], xs)
            appendSessionActivityClient(
              buildExamSessionActivityPayload(
                { id: xs.id, profileId: xs.profileId, level: xs.level, mode: xs.mode, scope: xs.scope },
                res.progression?.xpAwarded,
              ),
            )
            void qc.invalidateQueries({ queryKey: ['exam', 'sessions', userId] })
            void invalidateProgressionQueries(qc, userId, tz)
            const xp = res.progression?.xpAwarded
            const xpQ = typeof xp === 'number' && xp > 0 ? `&xp=${encodeURIComponent(String(xp))}` : ''
            router.replace(`${APP_EXAM_SIMULATION_REPORT}?id=${encodeURIComponent(s.id)}${xpQ}`)
          } else {
            autoFiredRef.current = false
            /** Reading / KNM / listening / writing: flush so refetch + layout effects stay consistent; no intro pause between items. */
            if (
              readingSimRelaxedAnswerTimers ||
              knmSimRelaxedAnswerTimers ||
              listeningSimRelaxedAnswerTimers ||
              writingSimRelaxedAnswerTimers
            ) {
              flushSync(() => {
                examMcqAnswerTaskIdRef.current = null
                setAnswer('')
                setIdx((i) => i + 1)
                setPhase('answer')
              })
            } else {
              setIdx((i) => i + 1)
              setPhase('intro')
              examMcqAnswerTaskIdRef.current = null
              setAnswer('')
            }
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Could not save your answer.'
        setSubmitError(
          msg.includes('timed out')
            ? `${msg} The server may still be compiling in dev — wait a moment and tap Submit again.`
            : msg,
        )
      } finally {
        setSubmitting(false)
        setSubmitPhase(null)
      }
    },
    [
      session,
      task,
      submitting,
      answer,
      writingFillInFieldValues,
      userId,
      idx,
      tasks.length,
      qc,
      tz,
      isSim,
      router,
      support,
      profile,
      readingSimRelaxedAnswerTimers,
      knmSimRelaxedAnswerTimers,
      listeningSimRelaxedAnswerTimers,
      writingSimRelaxedAnswerTimers,
    ],
  )

  /**
   * Finish the run with whatever has been submitted so far. The server-side `finalizeExamSession`
   * builds a partial report from existing attempts; with zero attempts it marks the session
   * `abandoned` (no XP, no usable report) — we surface that as a confirm so the learner knows.
   */
  const [endingEarly, setEndingEarly] = useState(false)
  const endExamEarly = useCallback(async () => {
    if (!session || endingEarly || submitting) return
    const remaining = Math.max(0, tasks.length - session.attempts.length)
    const hasAttempts = session.attempts.length > 0
    const confirmMsg = hasAttempts
      ? `End ${isSim ? 'simulation' : 'training'} now and score what you have so far?\n\n${session.attempts.length} of ${tasks.length} task${tasks.length === 1 ? '' : 's'} answered. ${remaining} unanswered task${remaining === 1 ? '' : 's'} will be skipped.`
      : `End ${isSim ? 'simulation' : 'training'} now? You haven’t answered any task yet, so no score can be generated and no XP will be awarded.`
    if (typeof window !== 'undefined' && !window.confirm(confirmMsg)) return
    setEndingEarly(true)
    setSubmitError(null)
    try {
      const res = await completeExamSession(userId, session.id)
      const xs = res.session
      if (isSim) applyExamPersonalizationClientEffects(xs)
      void qc.setQueryData(['exam', 'session', userId, xs.id], xs)
      appendSessionActivityClient(
        buildExamSessionActivityPayload(
          { id: xs.id, profileId: xs.profileId, level: xs.level, mode: xs.mode, scope: xs.scope },
          res.progression?.xpAwarded,
        ),
      )
      void qc.invalidateQueries({ queryKey: ['exam', 'sessions', userId] })
      void invalidateProgressionQueries(qc, userId, tz)
      const xp = res.progression?.xpAwarded
      const xpQ = typeof xp === 'number' && xp > 0 ? `&xp=${encodeURIComponent(String(xp))}` : ''
      // Abandoned sessions (zero attempts) won't have a usable report — send the learner back to the
      // exam hub instead of the report page, where they'd just see "Session not finished".
      if (!hasAttempts) {
        router.replace(APP_EXAM_SYSTEM)
        return
      }
      const reportRoute = isSim ? APP_EXAM_SIMULATION_REPORT : APP_EXAM_TRAINING_REPORT
      router.replace(`${reportRoute}?id=${encodeURIComponent(xs.id)}${xpQ}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not finish the exam.'
      setSubmitError(
        msg.includes('timed out')
          ? `${msg} Try again in a few seconds — your answers are already saved.`
          : msg,
      )
    } finally {
      setEndingEarly(false)
    }
  }, [session, endingEarly, submitting, tasks.length, isSim, userId, qc, tz, router])

  const toggleSpeakingCapture = useCallback(async () => {
    if (!session || !task) return
    if (profile?.examCode !== 'inburgering_speaking') return
    if (task.taskType === 'read_aloud_exam' || Boolean(task.mcq?.options?.length)) return
    if (recorder.phase === 'recording') {
      setSttBusy(true)
      setSpeakingSttError(null)
      try {
        const { blob, mimeType } = await recorder.stop()
        setRecordingPreviewFromBlob(blob)
        if (blob.size < 400) {
          setSpeakingSttError('Recording was too short. Try again.')
          return
        }
        let audioBase64: string
        let sendMime = mimeType
        if (shouldPrepareWebmLikeForServerStt(mimeType)) {
          try {
            const pcm = await prepareAudioForAzurePronunciationAssessment(blob, mimeType)
            audioBase64 = pcm.audioBase64
            sendMime = pcm.mimeType
          } catch (prepErr) {
            setSpeakingSttError(
              prepErr instanceof Error && prepErr.message
                ? prepErr.message
                : 'Could not prepare audio for transcription. Try recording again.',
            )
            return
          }
        } else {
          audioBase64 = await blobToBase64(blob)
        }
        const cap = maxTranscribeBase64Chars()
        if (audioBase64.length > cap) {
          setSpeakingSttError('Recording is too large for transcription. Try a shorter answer.')
          return
        }
        const lv = session.level
        const cefr: 'A1' | 'A2' | 'B1' = lv === 'B1' ? 'B1' : lv === 'A1' ? 'A1' : 'A2'
        const tr = await transcribeSpeechAudio({
          audioBase64,
          mimeType: sendMime,
          language: 'nl',
          cefrLevel: cefr,
          scenarioHint: task.promptEn,
          transcriptionPrompt: task.promptNl,
          purpose: 'exam_speaking_run',
        })
        const t = tr.text?.trim() ?? ''
        if (!t) {
          setSpeakingSttError('No speech detected. Try recording again.')
          examMcqAnswerTaskIdRef.current = null
          setAnswer('')
          return
        }
        setAnswer(t)
        voiceForSubmitRef.current = null
        setVoiceScoredForSubmit(false)
        /**
         * Run pronunciation assessment for ANY speaking-exam level (A1/A2/B1) — same pipeline as
         * voice scenarios. `progressMeta.level` is the actual session level so the backend logs and
         * the exam scoring engine apply the right rubric for this learner. `scenarioId` is tagged
         * with level + task type so per-exam progression trends stay separated from chat scenarios.
         */
        if (profile?.examCode === 'inburgering_speaking') {
          setVoiceAssessBusy(true)
          try {
            const pa = await requestPronunciationAssessment({
              audioBase64,
              mimeType: sendMime,
              transcript: t,
              assessmentMode: 'open_response',
              scenarioHint: task.promptEn,
              progressMeta: {
                level: cefr,
                scenarioId: `inburgering_exam_speaking_${cefr.toLowerCase()}_${task.taskType}`,
                scenarioTitle: task.promptEn?.trim() || null,
              },
            })
            const snap = examVoiceSnapshotFromPronunciationResponse(pa)
            if (snap) {
              voiceForSubmitRef.current = snap
              setVoiceScoredForSubmit(true)
            }
          } catch {
            // Text-only scoring if pronunciation API fails
          } finally {
            setVoiceAssessBusy(false)
          }
        }
      } catch (err) {
        setSpeakingSttError(userFacingTranscriptionErrorMessage(err, { typingFallback: false }))
      } finally {
        setSttBusy(false)
      }
    } else {
      setSpeakingSttError(null)
      voiceForSubmitRef.current = null
      setVoiceScoredForSubmit(false)
      clearRecordingPreview()
      const wall = tickers.sectionWallRemainingSec
      const capMs =
        speakingSimA2RelaxedTimers && typeof wall === 'number' && wall > 0
          ? Math.min(300_000, Math.max(15_000, wall * 1000))
          : Math.min(300_000, Math.max(8_000, task.answerSeconds * 1000))
      await recorder.start({ maxDurationMs: capMs })
    }
  }, [
    session,
    task,
    profile,
    recorder,
    tickers.sectionWallRemainingSec,
    speakingSimA2RelaxedTimers,
    clearRecordingPreview,
    setRecordingPreviewFromBlob,
  ])

  useEffect(() => {
    if (!isSim || !task) return
    if (phase !== 'answer') return
    if (tickers.phaseRemainingSec == null || tickers.phaseRemainingSec > 0) return
    if (!answerAutoSubmit) return
    if (autoFiredRef.current) return
    autoFiredRef.current = true
    void handleSubmit(true)
  }, [isSim, task, phase, tickers.phaseRemainingSec, answerAutoSubmit, handleSubmit])

  useEffect(() => {
    if (isSim || !task) return
    if (trainPhase !== 'answer') return
    if (tickers.phaseRemainingSec == null || tickers.phaseRemainingSec > 0) return
    if (!answerAutoSubmit) return
    if (autoFiredRef.current) return
    autoFiredRef.current = true
    void handleSubmit(true)
  }, [isSim, task, trainPhase, tickers.phaseRemainingSec, answerAutoSubmit, handleSubmit])

  const title = useMemo(() => (isSim ? 'Simulation' : 'Training'), [isSim])

  /** Must run before any early return — same data as main UI timer debug when `task` exists. */
  const devDebugBlocks = useMemo(() => {
    if (!session) return []
    const t = tasks[idx]
    const phaseLabelForDebug = isSim
      ? phase === 'intro'
        ? 'Intro'
        : phase === 'prep'
          ? 'Prep'
          : 'Answer'
      : trainPhase === 'reflect'
        ? 'Feedback'
        : trainPhase === 'prep'
          ? 'Prep'
          : 'Answer'

    const sessionRemainInputForDebug = (() => {
      if (!t) return 0
      if (trainPhase === 'reflect') return 0
      const rem = tickers.phaseRemainingSec
      if (isSim && phase === 'intro') return rem ?? 0
      if (rem != null) return rem
      if (!isSim && trainPhase === 'prep' && !prepTimed) return t.prepSeconds
      return 0
    })()

    const sessionRemainingSecForDebug = computeSessionWallClockRemaining({
      tasks,
      taskIndex: idx,
      isSim,
      simPhase: phase,
      trainPhase,
      remainingCurrentPhaseSec: sessionRemainInputForDebug,
    })

    const totalEstimateSecForDebug = profile ? resolveTotalEstimateDisplaySeconds(profile) : null
    const sumSessionTasksSecForDebug = sumSessionTasksSeconds(tasks)
    const wallBudgetForDebug =
      isSim && sumSessionTasksSecForDebug > 0 ? sumSessionTasksSecForDebug : totalEstimateSecForDebug
    const fullExamWallRemainingForDebug =
      isSim && wallBudgetForDebug != null && wallBudgetForDebug > 0 && examWallStartedAtMs != null
        ? computeFullExamWallRemaining({
            totalEstimateSec: wallBudgetForDebug,
            startedAtMs: examWallStartedAtMs,
            nowMs: examWallNowMs,
          })
        : null

    return [
      ...(profile ? [{ label: 'Blueprint summary', body: formatBlueprintDebugSummary(profile) }] : []),
      {
        label: 'Session row',
        body: JSON.stringify(
          {
            id: session.id,
            profileId: session.profileId,
            level: session.level,
            mode: session.mode,
            scope: session.scope,
            status: session.status,
            trainingSupport: session.trainingSupport,
            xpMeta: session.xpMeta,
            attempts: session.attempts.length,
            tasks: session.tasks.length,
          },
          null,
          2,
        ),
      },
      {
        label: 'Timer engine (UI)',
        body: formatTimersDebug({
          phaseLabel: phaseLabelForDebug,
          phaseRemainingSec: tickers.phaseRemainingSec,
          sectionWallRemainingSec: tickers.sectionWallRemainingSec,
          sessionRemainingSec: sessionRemainingSecForDebug,
          totalEstimateSec: totalEstimateSecForDebug,
          fullExamWallRemainingSec: fullExamWallRemainingForDebug,
          sumSessionTasksSec: sumSessionTasksSecForDebug,
        }),
      },
      { label: 'Last scored attempt', body: formatLastAttemptDebug(session) },
    ]
  }, [
    session,
    profile,
    tasks,
    idx,
    isSim,
    phase,
    trainPhase,
    prepTimed,
    tickers.phaseRemainingSec,
    tickers.sectionWallRemainingSec,
    examWallStartedAtMs,
    examWallNowMs,
  ])

  const attemptsForTask = session ? session.attempts.filter((a) => a.taskId === task?.id).length : 0
  const maxSubmissions = 1 + maxTrainingRetries(support)
  const canRetryTraining = !isSim && attemptsForTask < maxSubmissions

  if (!sessionId) {
    return (
      <p className="px-4 py-8 text-body-sm text-ink-secondary">
        Missing session.{' '}
        <Link href={APP_EXAM_SYSTEM} className="font-semibold text-primary-900">
          Back
        </Link>
      </p>
    )
  }

  if (sessionQ.isError) {
    return <p className="px-4 py-8 text-body-sm text-red-700">Could not load session.</p>
  }

  if (sessionQ.isLoading || !session) {
    return <p className="px-4 py-8 text-body-sm text-ink-secondary">Loading session…</p>
  }

  /**
   * Final loading view between session completion (auto-finish OR end-early) and the report route.
   * Shown both while we wait on the network round-trip (`endingEarly`) and during the brief frame
   * where the cached session has already flipped to `completed` before `router.replace` lands.
   */
  if (endingEarly || (session.status === 'completed' && session.report)) {
    const reportHref =
      (isSim ? APP_EXAM_SIMULATION_REPORT : APP_EXAM_TRAINING_REPORT) +
      `?id=${encodeURIComponent(session.id)}`
    const answeredCount = session.attempts.length
    const totalCount = tasks.length
    const headline = endingEarly
      ? `Ending ${isSim ? 'simulation' : 'training'} and scoring your answers…`
      : 'Scoring your exam…'
    const subline = endingEarly
      ? `Building a report from the ${answeredCount} of ${totalCount} task${answeredCount === 1 ? '' : 's'} you answered. This usually takes a few seconds.`
      : 'Building your report and tallying XP. This usually takes a few seconds.'
    return (
      <div className="px-4 py-10 max-w-md mx-auto w-full">
        <Card className="px-6 py-8 text-center space-y-4 shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary-700">
            <div className="relative">
              <ClipboardCheck className="h-7 w-7" aria-hidden />
              <Loader2 className="absolute -bottom-1 -right-1 h-4 w-4 animate-spin text-primary-600" aria-hidden />
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-body font-semibold text-ink-primary">{headline}</p>
            <p className="text-caption text-ink-secondary leading-snug">{subline}</p>
          </div>
          {!endingEarly && session.status === 'completed' ? (
            <Link
              href={reportHref}
              className="inline-flex items-center justify-center gap-1.5 text-caption font-semibold text-primary-900 hover:underline"
            >
              View report now
            </Link>
          ) : null}
        </Card>
      </div>
    )
  }

  if (!task) {
    return <p className="px-4 py-8 text-body-sm text-ink-secondary">No tasks in this session.</p>
  }

  const a2SimulationTaskNavigation = isSim && session.level === 'A2'

  const isListening = task.taskType === 'listening_response_exam'
  const isListeningMcq = task.taskType === 'listening_mcq_exam'
  /** A2 listening exam: one MCQ per “fragment” slot with global index — same as task index; hide duplicate 2/25 line. */
  const hideRedundantListeningFragmentMeta =
    listeningSimRelaxedAnswerTimers &&
    isListeningMcq &&
    task.listeningScenarioIndex1Based === idx + 1 &&
    task.listeningScenarioCount === tasks.length &&
    (task.listeningScenarioQuestionCount ?? 1) <= 1
  const mcqPromptNl = listeningMcqDisplay?.promptNl ?? task.promptNl
  const mcqPromptEn = listeningMcqDisplay?.promptEn ?? task.promptEn
  const rawMcqOptions = listeningMcqDisplay?.readAloudTask.mcq?.options ?? task.mcq?.options ?? []
  const mcqOptionsForUi = (() => {
    if (!rawMcqOptions.length) return []
    if (listeningMcqDisplay) return rawMcqOptions
    if (task.taskType === 'knowledge_mcq') {
      const taskIx = tasks.findIndex((t) => t.id === task.id)
      const taskKey = taskIx >= 0 ? `task-${taskIx}` : task.id
      return knowledgeMcqOptionsShuffledForTask(rawMcqOptions, session.id, taskKey)
    }
    return rawMcqOptions
  })()
  const listenLine = (task.listeningScriptNl ?? task.promptNl).trim()
  /** Listening MCQ: scenario clip only — never fall back to the question stem for dialogue TTS. */
  const listeningScenarioAudioLine = isListeningMcq ? listeningMcqDialogueLine(task) : listenLine
  const listeningMcqReadAloudLine =
    isListeningMcq && listeningMcqDisplay ? listeningMcqQuestionAndOptionsLine(listeningMcqDisplay.readAloudTask) : ''
  const speakingOralAudioLine = speakingPrepAudioLine(task.listeningScriptNl, task.promptNl)
  const isMcq = Boolean(task.mcq?.options?.length)
  /** Whole-exam reading or KNM simulation: same polished `knowledge_mcq` layout (passage split when the bank format allows). */
  const readingMcqExamSimUx = Boolean(
    (readingSimRelaxedAnswerTimers || knmSimRelaxedAnswerTimers) && task.taskType === 'knowledge_mcq' && isMcq,
  )
  const readingExamPromptParts =
    readingMcqExamSimUx
      ? splitReadingExamMcqPrompt(task.promptNl, task.promptEn, task.readingPassageEn)
      : null
  /** KNM (or other) `knowledge_mcq` with a spoken stem — reuse `listeningScriptNl` as TTS line only (not listening-exam dialogue). */
  const knmMcqStemAudioLine =
    task.taskType === 'knowledge_mcq' && task.listeningScriptNl?.trim() ? task.listeningScriptNl.trim() : ''
  /** Reading / KNM computer-style sim: Dutch-only stem in the UI (no on-screen English gloss). */
  const mcqSimHideEnglishAssist =
    (readingSimRelaxedAnswerTimers || knmSimRelaxedAnswerTimers) && task.taskType === 'knowledge_mcq'
  const mcqMulti = Boolean(task.mcq?.correctOptionIds && task.mcq.correctOptionIds.length > 1)
  /** Ignore `answer` for MCQ UI/submit unless it was chosen (or restored) for this task — option letters repeat every question. */
  const examMcqAnswerText = !isMcq || examMcqAnswerTaskIdRef.current === task.id ? answer : ''
  const writingFillInBullets = task.writingFillInBulletsNl
  const isWritingFillInMulti =
    task.taskType === 'writing_task_exam' && Boolean(writingFillInBullets?.length)
  const canSubmitAnswerText = isMcq
    ? Boolean(examMcqAnswerText.trim())
    : isWritingFillInMulti
      ? writingFillInFieldValues.some((s) => s.trim())
      : Boolean(examMcqAnswerText.trim())
  const listeningPrepHideQuestion =
    (isListening || isListeningMcq) && isSim && phase === 'prep'
  /** Inburgering speaking oral tasks: audio scenario + mic answer (transcribed to text for scoring). */
  const speakingOralUx = Boolean(
    profile?.examCode === 'inburgering_speaking' && !isMcq && task.taskType !== 'read_aloud_exam',
  )

  const structureLine = !isSim && task ? structurePatternLine(task.taskType) : null
  const goalLine = !isSim && task ? trainingGoalLine(task.taskType, session.level) : ''

  const showHintsPrepBlock =
    !isSim && hintAvailable && showHintsInPrep(support, hintRevealed) && (trainPhase === 'prep' || trainPhase === 'answer')
  const showHintsAnswerBlock =
    !isSim && hintAvailable && showHintsInAnswer(support, hintRevealed) && trainPhase === 'answer'
  const showExampleBlock =
    !isSim && exampleAvailable && showExamples(support, hintRevealed) && (trainPhase === 'prep' || trainPhase === 'answer')
  const showStructure = !isSim && structureLine && showStructurePattern(support) && trainPhase !== 'reflect'

  const blockAnswer = isSim ? phase !== 'answer' : trainPhase !== 'answer'

  const dockPhaseLabel = isSim
    ? phase === 'intro'
      ? 'Intro'
      : phase === 'prep'
        ? 'Preparation'
        : 'Answer'
    : trainPhase === 'prep'
      ? 'Preparation'
      : 'Answer'

  const effectivePrepRemainingForSectionPace =
    isSim && phase === 'intro' && tickers.phaseRemainingSec != null
      ? tickers.phaseRemainingSec + task.prepSeconds
      : isSim && phase === 'prep' && tickers.phaseRemainingSec != null
        ? tickers.phaseRemainingSec
        : !isSim && trainPhase === 'prep' && tickers.phaseRemainingSec != null
          ? tickers.phaseRemainingSec
          : !isSim && trainPhase === 'prep' && !prepTimed
            ? task.prepSeconds
            : 0

  const pacePhase = isSim ? (phase === 'answer' ? 'answer' : 'prep') : trainPhase === 'answer' ? 'answer' : 'prep'

  const paceRemainingInPhase =
    pacePhase === 'answer' && tickers.phaseRemainingSec != null
      ? tickers.phaseRemainingSec
      : pacePhase === 'prep'
        ? effectivePrepRemainingForSectionPace
        : 0

  const sectionPaceRem = sectionPaceRemainingSeconds(tasks, idx, pacePhase, paceRemainingInPhase)

  const sessionRemainInput = (() => {
    if (trainPhase === 'reflect') return 0
    const rem = tickers.phaseRemainingSec
    if (isSim && phase === 'intro') return rem ?? 0
    if (rem != null) return rem
    if (simRelaxedAnswerTimers && isSim && phase === 'answer') return task.answerSeconds
    if (!isSim && trainPhase === 'prep' && !prepTimed) return task.prepSeconds
    return 0
  })()

  const sessionRemainingSec = computeSessionWallClockRemaining({
    tasks,
    taskIndex: idx,
    isSim,
    simPhase: phase,
    trainPhase,
    remainingCurrentPhaseSec: sessionRemainInput,
  })

  /** Wall clock for this run matches generated tasks (section drills are no longer paired with a full-exam minute budget). */
  const totalExamBudgetSec =
    isSim && tasks.length > 0
      ? sumSessionTasksSeconds(tasks)
      : profile
        ? resolveTotalEstimateDisplaySeconds(profile)
        : null
  const fullExamRemainingSec =
    isSim && totalExamBudgetSec != null && totalExamBudgetSec > 0 && examWallStartedAtMs != null
      ? computeFullExamWallRemaining({
          totalEstimateSec: totalExamBudgetSec,
          startedAtMs: examWallStartedAtMs,
          nowMs: examWallNowMs,
        })
      : null
  const sumSessionTasksSec = sumSessionTasksSeconds(tasks)

  const headerClock = (() => {
    if (trainPhase === 'reflect') {
      return { label: 'Feedback', value: null as string | null, tone: 'neutral' as const }
    }
    if (isSim && simRelaxedAnswerTimers && phase === 'answer') {
      if (fullExamRemainingSec != null) {
        return { label: 'Exam time left', value: formatExamClock(fullExamRemainingSec), tone: 'dark' as const }
      }
      return { label: 'Exam time left', value: '—', tone: 'dark' as const }
    }
    if (tickers.phaseRemainingSec != null) {
      const label = isSim
        ? phase === 'intro'
          ? 'Intro'
          : phase === 'prep'
            ? 'Preparation'
            : 'Answer'
        : trainPhase === 'prep'
          ? 'Preparation'
          : 'Answer'
      const tone =
        (isSim && phase === 'answer') || (!isSim && trainPhase === 'answer') ? ('dark' as const) : ('warm' as const)
      return { label, value: formatExamClock(tickers.phaseRemainingSec), tone }
    }
    const openLabel = isSim
      ? phase === 'intro'
        ? 'Intro'
        : phase === 'prep'
          ? 'Preparation'
          : 'Answer'
      : trainPhase === 'prep'
        ? 'Preparation'
        : 'Answer'
    return { label: openLabel, value: 'Open', tone: 'warm' as const }
  })()

  return (
    <div
      ref={taskScrollAnchorRef}
      tabIndex={-1}
      className="px-4 py-6 pb-28 space-y-4 max-w-lg mx-auto w-full scroll-mt-4 outline-none focus:outline-none"
    >
      <header className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.05)] backdrop-blur-sm">
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="inline-flex items-center rounded-full border border-slate-200/90 bg-slate-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">
            {title}
          </p>
          <p className="text-sm font-semibold leading-snug text-slate-900">
            {session.level} · Task {idx + 1} / {tasks.length}
            {!isSim ? ` · ${support.replace(/_/g, ' ')}` : ''}
          </p>
          {a2SimulationTaskNavigation && idx > 0 ? (
            <div className="flex flex-col gap-1.5 pt-0.5 sm:flex-row sm:items-baseline sm:gap-3">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                className="-ml-2 h-8 shrink-0 gap-0.5 self-start px-2 text-slate-700"
                disabled={submitting}
                onClick={() => setIdx((i) => Math.max(0, i - 1))}
              >
                <ChevronLeft className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                Previous question
              </Button>
              <p className="min-w-0 text-[11px] leading-snug text-slate-500 text-balance sm:max-w-[min(100%,20rem)]">
                You can edit and submit again; only your latest answer is kept.
              </p>
            </div>
          ) : null}
          {task.listeningScenarioId &&
          task.listeningScenarioIndex1Based != null &&
          task.listeningScenarioCount &&
          !hideRedundantListeningFragmentMeta ? (
            <p className="text-xs leading-snug text-slate-500">
              Fragment {task.listeningScenarioIndex1Based} / {task.listeningScenarioCount}
              {task.listeningScenarioTitleNl ? ` · ${task.listeningScenarioTitleNl}` : ''}
              {task.listeningScenarioQuestionIndex != null &&
              task.listeningScenarioQuestionCount != null &&
              task.listeningScenarioQuestionCount > 1
                ? ` · Vraag ${task.listeningScenarioQuestionIndex} / ${task.listeningScenarioQuestionCount} bij dit fragment`
                : ''}
            </p>
          ) : null}
        </div>
        <div
          className={clsx(
            'flex min-h-[3.25rem] shrink-0 flex-col items-end justify-center gap-0.5 rounded-2xl border px-3.5 py-2',
            headerClock.tone === 'dark' &&
              'border-slate-800/80 bg-slate-900 text-white shadow-md shadow-slate-900/20',
            headerClock.tone === 'warm' &&
              'border-amber-200/70 bg-gradient-to-b from-amber-50 to-amber-50/80 text-amber-950',
            headerClock.tone === 'neutral' && 'border-slate-200/90 bg-slate-100 text-slate-800',
          )}
        >
          <span
            className={clsx(
              'max-w-[9rem] text-right text-[10px] font-bold uppercase leading-tight tracking-[0.12em]',
              headerClock.tone === 'dark' && 'text-white/70',
              headerClock.tone === 'warm' && 'text-amber-800/80',
              headerClock.tone === 'neutral' && 'text-slate-500',
            )}
          >
            {headerClock.label}
          </span>
          {headerClock.value != null ? (
            <span
              className={clsx(
                'text-lg font-bold tabular-nums leading-none tracking-tight',
                headerClock.tone === 'warm' && 'text-amber-950',
              )}
            >
              {headerClock.value}
            </span>
          ) : null}
        </div>
      </header>

      {trainPhase !== 'reflect' &&
      profile &&
      !(hideExamTimerDockInSim && isSim) ? (
        <ExamTimerDock
          isSimulation={isSim}
          phaseLabel={dockPhaseLabel}
          phaseRemainingSec={tickers.phaseRemainingSec}
          phaseDurationSec={phaseTicking ? phaseDurationSec : Math.max(1, task.prepSeconds)}
          sectionTitle={sectionTitle}
          sectionPaceRemainingSec={sectionPaceRem}
          sectionWallRemainingSec={tickers.sectionWallRemainingSec}
          sessionRemainingSec={sessionRemainingSec}
          fullExamRemainingSec={fullExamRemainingSec}
          sumSessionTasksSec={sumSessionTasksSec}
        />
      ) : null}

      {!isSim && trainPhase !== 'reflect' ? (
        <Card variant="flat" padding="sm" className="border border-slate-200/80 bg-slate-50/60 space-y-1">
          <CardTitle className="text-caption font-semibold text-ink-primary">What this task wants</CardTitle>
          <p className="text-caption text-ink-secondary">{examTaskTypeLabel(task.taskType)} · {sectionTitle}</p>
          <p className="text-body-sm text-ink-primary leading-snug">{goalLine}</p>
        </Card>
      ) : null}

      {phase === 'intro' && isSim ? (
        <Card variant="flat" padding="md" className="border border-slate-200/90 space-y-3">
          <CardTitle className="text-body-sm font-semibold text-ink-primary">Task intro</CardTitle>
          <CardDescription className="text-caption text-ink-secondary leading-relaxed">
            Section: <span className="font-semibold text-ink-primary">{sectionTitle}</span>
            <br />
            Type: <span className="font-semibold text-ink-primary">{examTaskTypeLabel(task.taskType)}</span>
          </CardDescription>
          {listeningSimRelaxedAnswerTimers && idx === 0 ? (
            <p className="text-caption text-primary-950/95 bg-primary-50 border border-primary-100 rounded-xl px-3 py-2 leading-relaxed">
              <span className="font-semibold">How to work:</span> first read the question and every answer choice in the
              answer phase, then listen to the scenario and read-aloud audio as you like.{' '}
              <span className="text-ink-secondary block mt-1">
                Tip: lees eerst de vraag en alle keuzes in de antwoordfase, luister daarna naar de audio.
              </span>
            </p>
          ) : null}
          {readingSimRelaxedAnswerTimers && idx === 0 ? (
            <p className="text-caption text-primary-950/95 bg-primary-50 border border-primary-100 rounded-xl px-3 py-2 leading-relaxed">
              <span className="font-semibold">How to work:</span> texts are short to medium (notes, e-mail, flyer, brief
              news, web blurb). Read the question and all choices first — the correct detail is almost always stated in
              the Dutch source text.{' '}
              <span className="text-ink-secondary block mt-1">
                Tip: lees vraag en keuzes eerst; zoek daarna het antwoord letterlijk of nauwkeurig in de brontekst.
                Slagen is ongeveer 18–19 van de 25 goed; fout antwoord telt niet extra negatief.
              </span>
            </p>
          ) : null}
          {knmSimRelaxedAnswerTimers && idx === 0 ? (
            <p className="text-caption text-primary-950/95 bg-primary-50 border border-primary-100 rounded-xl px-3 py-2.5 leading-relaxed">
              <span className="font-semibold">How to work:</span> read (or listen to) the Dutch question carefully. Scan
              every option before you choose — only one answer is correct unless the task says otherwise.{' '}
              <span className="text-ink-secondary block mt-1">
                Tip: note keywords in the question (wie, wat, wanneer, waarom); eliminate answers that contradict the
                stem or Dutch practice.
              </span>
            </p>
          ) : null}
          <p className="text-caption text-amber-950/90 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
            Exam rules: no hints, no examples, no coaching.{' '}
            {simRelaxedAnswerTimers
              ? `Time is tracked for the whole exam — there is no separate countdown for each question answer.${
                  a2SimulationTaskNavigation
                    ? ' You can use Previous question to change an earlier answer; only your latest submission per task is kept.'
                    : ''
                }${knmSimRelaxedAnswerTimers ? ' Format: 40 multiple-choice questions in 45 minutes (practice only; official rules and norms are set by DUO).' : ''}`
              : 'Timers are fixed — the prompt appears when preparation starts.'}
          </p>
          <p className="text-caption text-ink-secondary">
            Starting preparation in {tickers.phaseRemainingSec ?? 0}s…
          </p>
        </Card>
      ) : !isSim && trainPhase === 'reflect' ? (
        <Card variant="flat" padding="md" className="border border-primary-100 bg-primary-50/20 space-y-3">
          <CardTitle className="text-body-sm font-semibold text-ink-primary">Coaching</CardTitle>
          {reflectLines.length ? (
            <ul className="list-disc pl-5 text-body-sm text-ink-primary space-y-1">
              {reflectLines.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          ) : (
            <p className="text-caption text-ink-secondary">Nice work — continue to the next task.</p>
          )}
          <div className="flex flex-col gap-2">
            {canRetryTraining ? (
              <Button
                variant="secondary"
                fullWidth
                type="button"
                onClick={() => {
                  setTrainPhase('prep')
                  setReflectLines([])
                  setHintRevealed(false)
                  autoFiredRef.current = false
                }}
              >
                Retry this task
              </Button>
            ) : null}
            <Button variant="primary" fullWidth type="button" disabled={submitting} onClick={() => void advanceAfterTrainingReflect()}>
              {idx + 1 >= tasks.length ? 'Finish & report' : 'Next task'}
            </Button>
          </div>
        </Card>
      ) : (
        <Card
          variant="flat"
          padding="md"
          className={clsx('border border-slate-200/90', readingMcqExamSimUx ? 'space-y-4' : 'space-y-3')}
        >
          <CardTitle className="text-body-sm font-semibold text-ink-primary">
            {phase === 'prep' && isSim
              ? speakingOralUx
                ? 'Listen and prepare'
                : knmMcqStemAudioLine
                  ? 'Listen and prepare'
                  : 'Read and prepare'
              : readingMcqExamSimUx && phase === 'answer'
                ? knmSimRelaxedAnswerTimers
                  ? 'Question'
                  : 'Reading task'
                : 'Prompt'}
          </CardTitle>
          {phase === 'prep' && isSim ? (
            <p className="text-caption text-ink-secondary">
              {speakingOralUx
                ? 'Play the scenario audio (includes your assignment). The written task is shown under the player; you record when prep ends.'
                : knmMcqStemAudioLine
                  ? 'Play the question audio. You can open the written question if you need it. Answer choices open when prep ends.'
                  : 'Read silently. The answer box opens when prep time ends.'}
            </p>
          ) : null}
          {!isSim && trainPhase === 'prep' ? (
            <p className="text-caption text-ink-secondary">
              Use prep to read the prompt{showStructure ? ' and the structure pattern' : ''}.
            </p>
          ) : null}
          {listeningPrepHideQuestion ? (
            <p className="text-caption text-ink-secondary leading-relaxed">
              {isListeningMcq
                ? `${mcqPromptEn} — use “Scenario audio” for the dialogue only. After prep, you can play “Question & answers” read-aloud, then choose below.`
                : `${task.promptEn} — listen to the clip; the Dutch question appears when the answer phase starts.`}
            </p>
          ) : speakingOralUx && isSim ? (
            <>
              <p className="text-caption text-ink-secondary leading-relaxed">
                {phase === 'prep'
                  ? 'Play the audio: it includes the situation and your assignment. You can also read the written task below (same idea as official exam accessibility).'
                  : 'Your assignment is below — answer in Dutch when you record.'}
              </p>
              <div className="rounded-xl border border-slate-200/90 bg-slate-50/90 px-3 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Scenario audio</p>
                <PackReferenceAudioControls line={speakingOralAudioLine} variant="playOnly" disabled={false} />
              </div>
              <div className="mt-2 space-y-1 rounded-lg border border-slate-100 bg-white/90 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Written task</p>
                {task.taskType === 'writing_task_exam' && writingPromptParts ? (
                  <div className="rounded-xl border border-slate-200/80 bg-gradient-to-b from-slate-50/90 to-white px-3 py-3 space-y-4 shadow-sm shadow-slate-900/5">
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Opdracht</p>
                      <p className="text-[15px] leading-relaxed text-slate-900 whitespace-pre-wrap max-w-prose">
                        {writingPromptParts.situationDisplayNl}
                      </p>
                    </div>
                    {writingPromptParts.fillInBulletsNl.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Invullen</p>
                        <ul className="list-disc pl-5 space-y-1.5 text-[15px] leading-relaxed text-slate-900 max-w-prose">
                          {writingPromptParts.fillInBulletsNl.map((line, li) => (
                            <li key={li}>{line}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    <div className="border-t border-slate-200/80 pt-3 space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Checklist</p>
                      <p className="text-caption font-semibold text-slate-800 leading-snug">
                        {writingPromptParts.checklistTitle}
                      </p>
                      <ul className="space-y-2">
                        {writingPromptParts.checklistItems.map((item, bi) => (
                          <li key={bi} className="flex gap-2.5 text-caption text-slate-700 leading-relaxed">
                            <span
                              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-600/90"
                              aria-hidden
                            />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <p className="text-body-sm text-ink-primary leading-snug whitespace-pre-wrap">{task.promptNl}</p>
                )}
                {task.taskType !== 'writing_task_exam' && task.promptEn.trim() ? (
                  <p className="text-caption text-ink-secondary">{task.promptEn}</p>
                ) : null}
              </div>
            </>
          ) : speakingOralUx && !isSim ? (
            <>
              <div className="rounded-xl border border-slate-200/90 bg-slate-50/90 px-3 py-3 mb-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Scenario audio</p>
                <PackReferenceAudioControls line={speakingOralAudioLine} variant="playOnly" disabled={false} />
              </div>
              <p className="text-body-sm text-ink-primary leading-snug whitespace-pre-wrap">{task.promptNl}</p>
              {task.taskType !== 'writing_task_exam' && task.promptEn.trim() ? (
                <p className="text-caption text-ink-secondary">{task.promptEn}</p>
              ) : null}
            </>
          ) : (
            <>
              {!isListeningMcq ? (
                <>
                  {task.taskType === 'writing_task_exam' && writingPromptParts ? (
                    <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/95 to-white px-4 py-4 shadow-sm shadow-slate-900/5 space-y-5">
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Opdracht</p>
                        <div className="text-[15px] sm:text-body-sm text-slate-900 leading-relaxed max-w-prose space-y-3 whitespace-pre-wrap">
                          {writingPromptParts.situationDisplayNl}
                        </div>
                      </div>
                      {writingPromptParts.fillInBulletsNl.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Invullen</p>
                          <ul className="list-disc pl-5 space-y-1.5 text-[15px] sm:text-body-sm leading-relaxed text-slate-900 max-w-prose">
                            {writingPromptParts.fillInBulletsNl.map((line, li) => (
                              <li key={li}>{line}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      <div className="border-t border-slate-200/90 pt-4 space-y-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Checklist</p>
                        <p className="text-caption font-semibold text-slate-800 leading-snug">
                          {writingPromptParts.checklistTitle}
                        </p>
                        <ul className="space-y-2.5">
                          {writingPromptParts.checklistItems.map((item, bi) => (
                            <li key={bi} className="flex gap-2.5 text-caption text-slate-700 leading-relaxed">
                              <span
                                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-600/90"
                                aria-hidden
                              />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : task.taskType === 'writing_task_exam' ? (
                    <div className="rounded-2xl border border-slate-200/90 bg-slate-50/80 px-4 py-4 shadow-sm">
                      <p className="text-body-sm text-slate-900 leading-relaxed whitespace-pre-wrap">{task.promptNl}</p>
                    </div>
                  ) : readingMcqExamSimUx && readingExamPromptParts ? (
                    <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/95 to-white px-4 py-5 shadow-sm shadow-slate-900/5 ring-1 ring-slate-900/[0.03] space-y-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Text</p>
                      <p className="text-[16px] sm:text-[17px] font-medium leading-[1.5] text-slate-900 whitespace-pre-wrap">
                        {readingExamPromptParts.sourceBlockNl}
                      </p>
                      {!mcqSimHideEnglishAssist &&
                      (readingExamPromptParts.sourceHintEn || readingExamPromptParts.passageEn) ? (
                        <div className="border-t border-slate-200/80 pt-4 space-y-2">
                          {readingExamPromptParts.sourceHintEn ? (
                            <p className="text-[14px] leading-relaxed text-slate-600">
                              {readingExamPromptParts.sourceHintEn}
                            </p>
                          ) : null}
                          {readingExamPromptParts.passageEn ? (
                            <p className="text-[14px] leading-relaxed text-slate-600">
                              {readingExamPromptParts.passageEn}
                            </p>
                          ) : null}
                        </div>
                      ) : !mcqSimHideEnglishAssist && task.promptEn.trim() ? (
                        <p className="border-t border-slate-200/80 pt-4 text-[14px] leading-relaxed text-slate-600">
                          {task.promptEn}
                        </p>
                      ) : null}
                    </div>
                  ) : readingMcqExamSimUx ? (
                    <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/95 to-white px-4 py-5 shadow-sm shadow-slate-900/5 ring-1 ring-slate-900/[0.03] space-y-4">
                      {knmSimRelaxedAnswerTimers ? (
                        <KnmExamQuestionMedia
                          illustrationId={task.mcq?.illustrationId}
                          questionImageUrl={task.mcq?.questionImageUrl}
                          questionNl={task.promptNl}
                        />
                      ) : null}
                      {knmMcqStemAudioLine ? (
                        <div className="rounded-xl border border-slate-200/90 bg-white/90 px-3 py-3 space-y-2">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Vraag (audio)</p>
                          <PackReferenceAudioControls
                            line={knmMcqStemAudioLine}
                            variant="playOnly"
                            disabled={false}
                            playOnlyHint={
                              knmSimRelaxedAnswerTimers
                                ? 'Tik op afspelen om de vraag te horen. Tik nogmaals om te stoppen.'
                                : undefined
                            }
                          />
                        </div>
                      ) : null}
                      {knmSimRelaxedAnswerTimers ? (
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Vraag</p>
                          <p className="text-[16px] sm:text-[17px] font-semibold leading-[1.45] text-slate-900 whitespace-pre-wrap">
                            {task.promptNl}
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Text</p>
                            <p className="text-[16px] sm:text-[17px] font-semibold leading-[1.45] text-slate-900 whitespace-pre-wrap">
                              {task.promptNl}
                            </p>
                          </div>
                          {task.promptEn.trim() && !mcqSimHideEnglishAssist ? (
                            <div className="border-t border-slate-200/80 pt-4 space-y-1.5">
                              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">English</p>
                              <p className="text-[14px] leading-relaxed text-slate-600">{task.promptEn}</p>
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>
                  ) : (
                    <>
                      {knmMcqStemAudioLine ? (
                        <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 mb-3">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Question audio</p>
                          <PackReferenceAudioControls
                            line={knmMcqStemAudioLine}
                            variant="playOnly"
                            disabled={false}
                            playOnlyHint={
                              knmSimRelaxedAnswerTimers
                                ? 'Tik op afspelen om de vraag te horen. Tik nogmaals om te stoppen.'
                                : undefined
                            }
                          />
                        </div>
                      ) : null}
                      <p className="text-body-sm text-ink-primary leading-snug whitespace-pre-wrap">{task.promptNl}</p>
                      {task.promptEn.trim() && !mcqSimHideEnglishAssist ? (
                        <p className="text-caption text-ink-secondary">{task.promptEn}</p>
                      ) : null}
                    </>
                  )}
                </>
              ) : null}
              {profile?.examCode === 'inburgering_knm' &&
              task.taskType === 'knowledge_mcq' &&
              !knmSimRelaxedAnswerTimers ? (
                <KnmExamQuestionMedia
                  illustrationId={task.mcq?.illustrationId}
                  questionImageUrl={task.mcq?.questionImageUrl}
                  questionNl={task.promptNl}
                />
              ) : null}
            </>
          )}
          {!speakingOralUx && (isListening || isListeningMcq) && listeningScenarioAudioLine ? (
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                {isListeningMcq ? 'Scenario audio (dialogue only)' : 'Audio'}
              </p>
              <PackReferenceAudioControls
                line={listeningScenarioAudioLine}
                variant="playOnly"
                alternatingAbDialogue
                disabled={false}
              />
            </div>
          ) : null}
          {showStructure && structureLine ? (
            <p className="text-caption text-primary-900/90 border border-primary-100 rounded-lg px-2 py-1.5 bg-white">
              <span className="font-semibold">Structure:</span> {structureLine}
            </p>
          ) : null}
          {support === 'almost_exam' && hintAvailable && !hintRevealed ? (
            <Button variant="secondary" fullWidth type="button" onClick={() => setHintRevealed(true)}>
              Show hint (optional)
            </Button>
          ) : null}
          {showHintsPrepBlock || showHintsAnswerBlock ? (
            <ul className="list-disc pl-5 text-caption text-ink-secondary space-y-1">
              {task.trainingHintsNl?.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          ) : null}
          {showExampleBlock ? (
            <p className="text-caption text-primary-900/90">
              Example: <span className="font-medium">{task.trainingExampleNl}</span>
            </p>
          ) : null}
        </Card>
      )}

      <div className={readingMcqExamSimUx ? 'space-y-4' : 'space-y-2'}>
        {isMcq ? (
          <>
            {isListeningMcq &&
            listeningMcqReadAloudLine &&
            trainPhase !== 'reflect' &&
            ((!isSim && (trainPhase === 'prep' || trainPhase === 'answer')) || (isSim && phase === 'answer')) ? (
              <div className="rounded-xl border border-slate-200/90 bg-slate-50/90 px-3 py-3 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Question & answers (read-aloud)</p>
                <PackReferenceAudioControls line={listeningMcqReadAloudLine} variant="playOnly" disabled={false} />
                <p className="text-body-sm text-ink-primary leading-snug whitespace-pre-wrap">{mcqPromptNl}</p>
                <p className="text-caption text-ink-secondary">{mcqPromptEn}</p>
              </div>
            ) : null}
            {readingMcqExamSimUx && readingExamPromptParts && trainPhase !== 'reflect' ? (
              <div className="rounded-2xl border border-slate-200/95 bg-white px-4 py-4 shadow-sm shadow-slate-900/[0.04] space-y-2.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Question</p>
                <p className="text-[16px] sm:text-[17px] font-semibold leading-[1.45] text-slate-900">
                  {readingExamPromptParts.questionNl}
                </p>
                {!mcqSimHideEnglishAssist && readingExamPromptParts.questionEn ? (
                  <p className="text-[14px] leading-relaxed text-slate-600">{readingExamPromptParts.questionEn}</p>
                ) : null}
              </div>
            ) : null}
            <p
              className={
                readingMcqExamSimUx && isSim && phase === 'answer'
                  ? 'text-caption font-semibold text-slate-600 pl-3 border-l-[3px] border-primary-400/80 py-0.5'
                  : 'text-caption font-semibold text-ink-secondary'
              }
            >
              {isSim && phase === 'prep'
                ? isListeningMcq
                  ? 'Listen to the scenario clip above. Question read-aloud and choices open in the answer phase.'
                  : readingMcqExamSimUx
                    ? knmMcqStemAudioLine
                      ? 'Use question audio above; answer choices open in the answer phase.'
                      : mcqSimHideEnglishAssist
                        ? readingSimRelaxedAnswerTimers
                          ? 'Lees de tekst en vraag hierboven; de antwoordkeuzes verschijnen in de antwoordfase.'
                          : 'Lees de vraag hierboven; de antwoordkeuzes verschijnen in de antwoordfase.'
                        : 'Read the text and question above; answer choices open in the answer phase.'
                    : 'Read the question — choices appear in the answer phase.'
                : mcqMulti
                  ? 'Select every correct answer. Your selection must match the full correct set.'
                  : mcqSimHideEnglishAssist
                    ? 'Kies één antwoord'
                    : 'Choose one answer'}
            </p>
            {isMcq &&
            trainPhase !== 'reflect' &&
            ((!isSim && (trainPhase === 'prep' || trainPhase === 'answer')) || (isSim && phase === 'answer')) ? (
              <ul key={task.id} className={readingMcqExamSimUx ? 'm-0 list-none space-y-2.5 p-0' : 'm-0 list-none space-y-2 p-0'}>
                {mcqOptionsForUi.map((opt, optionIndex) => {
                  const picked = new Set(
                    examMcqAnswerText
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean),
                  )
                  const selected = mcqMulti ? picked.has(opt.id) : examMcqAnswerText === opt.id
                  const letter = knowledgeMcqOptionDisplayLetter(optionIndex)
                  return (
                    <li key={readingMcqExamSimUx ? `${task.id}-${opt.id}` : opt.id}>
                      <button
                        type="button"
                        role={mcqMulti ? 'checkbox' : undefined}
                        aria-checked={mcqMulti ? selected : undefined}
                        aria-label={
                          opt.imageUrl
                            ? mcqMulti
                              ? `Optie ${letter}: ${opt.label}`
                              : `Antwoord ${letter}: ${opt.label}`
                            : undefined
                        }
                        disabled={blockAnswer}
                        onClick={() => {
                          if (mcqMulti) {
                            const next = new Set(picked)
                            if (next.has(opt.id)) next.delete(opt.id)
                            else next.add(opt.id)
                            const joined = [...next].sort().join(',')
                            setAnswer(joined)
                            examMcqAnswerTaskIdRef.current = joined ? task.id : null
                          } else {
                            setAnswer(opt.id)
                            examMcqAnswerTaskIdRef.current = task.id
                          }
                        }}
                        className={
                          readingMcqExamSimUx
                            ? clsx(
                                'flex w-full min-h-[3.25rem] items-start gap-x-3.5 text-start text-[15px] leading-relaxed transition-all shadow-sm',
                                'rounded-2xl border px-3.5 py-4',
                                selected
                                  ? 'border-primary-500 bg-gradient-to-br from-primary-50 to-white text-slate-900 ring-2 ring-primary-400/35'
                                  : 'border-slate-200/95 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50/80',
                                'disabled:opacity-50',
                              )
                            : `w-full rounded-xl border px-3 py-2.5 text-left text-body-sm transition-colors ${
                                selected
                                  ? 'border-primary-500 bg-primary-50 text-ink-primary'
                                  : 'border-slate-200 bg-white text-ink-primary hover:border-slate-300'
                              } disabled:opacity-50`
                        }
                      >
                        {readingMcqExamSimUx ? (
                          <>
                            {opt.imageUrl ? (
                              <span className="flex h-14 w-20 shrink-0 basis-20 items-start justify-center self-start rounded-md border border-slate-200/90 bg-white overflow-hidden">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={opt.imageUrl}
                                  alt={`Vlag: ${opt.label}`}
                                  className="max-h-full max-w-full object-contain"
                                  loading="lazy"
                                />
                              </span>
                            ) : (
                              <span
                                className={clsx(
                                  'flex h-9 w-9 shrink-0 basis-9 items-center justify-center self-start rounded-xl text-sm font-bold tabular-nums leading-none',
                                  selected
                                    ? 'bg-primary-600 text-white shadow-sm'
                                    : 'border border-slate-200/90 bg-slate-100 text-slate-700',
                                )}
                                aria-hidden
                              >
                                {letter}
                              </span>
                            )}
                            <span className="min-w-0 flex-1 basis-0 self-start text-start text-[15px] font-normal leading-relaxed text-slate-900">
                              {opt.imageUrl ? (
                                <span className="font-semibold tabular-nums">{letter}.</span>
                              ) : (
                                opt.label
                              )}
                            </span>
                          </>
                        ) : (
                          <span className="flex items-start gap-3.5">
                            {opt.imageUrl ? (
                              <span className="shrink-0 rounded-md border border-slate-200 bg-white overflow-hidden w-20 h-14 flex items-center justify-center">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={opt.imageUrl}
                                  alt={`Vlag: ${opt.label}`}
                                  className="max-w-full max-h-full object-contain"
                                  loading="lazy"
                                />
                              </span>
                            ) : null}
                            <span className="min-w-0 flex-1">
                              {opt.imageUrl ? (
                                <span className="font-semibold tabular-nums">{letter}.</span>
                              ) : (
                                <>
                                  <span className="font-semibold tabular-nums">{letter}.</span> {opt.label}
                                </>
                              )}
                            </span>
                          </span>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : null}
          </>
        ) : speakingOralUx ? (
          <div className="space-y-3">
            <div>
              <p className="text-caption font-semibold text-ink-secondary">
                Your spoken answer (Dutch){session ? ` · ${session.level}` : ''}
              </p>
              <p className="text-caption text-ink-secondary mt-1">
                Tap record, speak in Dutch, then stop. We transcribe your recording for scoring — no typing required.
              </p>
            </div>
            {speakingSttError ? <p className="text-caption text-red-700">{speakingSttError}</p> : null}
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                disabled={blockAnswer || trainPhase === 'reflect' || sttBusy || voiceAssessBusy}
                onClick={() => void toggleSpeakingCapture()}
                className={clsx(
                  'flex h-14 w-14 shrink-0 items-center justify-center rounded-full shadow-md transition-transform active:scale-[0.98]',
                  recorder.phase === 'recording'
                    ? 'bg-red-600 text-white ring-4 ring-red-200/60'
                    : 'bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40',
                )}
                aria-label={recorder.phase === 'recording' ? 'Stop recording' : 'Start recording'}
              >
                {recorder.phase === 'recording' ? <Square className="h-6 w-6 fill-current" /> : <Mic className="h-7 w-7" />}
              </button>
              <p className="text-body-sm text-ink-primary min-w-0 flex-1 leading-snug">
                {sttBusy
                  ? 'Turning your speech into text…'
                  : voiceAssessBusy
                    ? `Scoring clarity and delivery from your audio${session ? ` (${session.level})` : ''}…`
                    : recorder.phase === 'recording'
                    ? 'Recording… tap the button again to stop.'
                    : answer.trim()
                      ? 'Review the transcript below, then submit — or record again.'
                      : 'Tap the microphone when you are ready to answer.'}
              </p>
            </div>
            {recordingPreviewUrl ? (
              <div className="rounded-xl border border-slate-200/90 bg-slate-50/90 px-3 py-2.5 space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Your last recording</p>
                <audio
                  key={recordingPreviewUrl}
                  src={recordingPreviewUrl}
                  controls
                  className="w-full h-9"
                  preload="metadata"
                />
              </div>
            ) : null}
            {answer.trim() ? (
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Transcript (for scoring)</p>
                <p className="text-body-sm text-ink-primary leading-snug mt-1">{answer}</p>
                {voiceScoredForSubmit && session ? (
                  <p className="text-caption text-ink-secondary mt-2">
                    Your recording was also scored for pronunciation, fluency, and clarity ({session.level}) — not from text alone.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : (
          <>
            {isWritingFillInMulti && writingFillInBullets ? (
              <p className="text-caption font-semibold text-ink-secondary">
                Your answer (Dutch)
              </p>
            ) : (
              <label className="text-caption font-semibold text-ink-secondary" htmlFor="exam-answer">
                Your answer (Dutch)
              </label>
            )}
            {isWritingFillInMulti && writingFillInBullets ? (
              <div className="space-y-4">
                {writingFillInBullets.map((bullet, i) => (
                  <div key={`${bullet}-${i}`} className="space-y-1.5">
                    <label
                      className="text-caption font-semibold text-ink-secondary block"
                      htmlFor={`exam-writing-fill-${i}`}
                    >
                      {bullet}
                    </label>
                    <textarea
                      id={`exam-writing-fill-${i}`}
                      value={writingFillInFieldValues[i] ?? ''}
                      onChange={(e) => {
                        const v = e.target.value
                        setWritingFillInFieldValues((prev) => {
                          const next = [...prev]
                          while (next.length < writingFillInBullets.length) next.push('')
                          next[i] = v
                          return next
                        })
                      }}
                      disabled={blockAnswer || trainPhase === 'reflect'}
                      rows={4}
                      className="w-full min-h-[88px] rounded-xl border border-slate-200 px-3 py-2 text-body-sm disabled:bg-slate-50 disabled:text-slate-400"
                      placeholder={
                        blockAnswer
                          ? isSim && phase === 'prep'
                            ? 'Prep phase — answer opens when the timer ends.'
                            : !isSim && trainPhase === 'prep'
                              ? prepTimed
                                ? 'Prep phase — answer opens when the timer ends (or skip).'
                                : 'Prep phase — take your time, then skip to answer when you are ready.'
                              : isSim && phase === 'intro'
                                ? 'Intro — prompt follows the timer.'
                                : 'Write here…'
                          : 'Write here…'
                      }
                    />
                  </div>
                ))}
              </div>
            ) : (
              <textarea
                id="exam-answer"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                disabled={blockAnswer || trainPhase === 'reflect'}
                className="w-full min-h-[120px] rounded-xl border border-slate-200 px-3 py-2 text-body-sm disabled:bg-slate-50 disabled:text-slate-400"
                placeholder={
                  blockAnswer
                    ? isSim && phase === 'prep'
                      ? 'Prep phase — answer opens when the timer ends.'
                      : !isSim && trainPhase === 'prep'
                        ? prepTimed
                          ? 'Prep phase — answer opens when the timer ends (or skip).'
                          : 'Prep phase — take your time, then skip to answer when you are ready.'
                        : isSim && phase === 'intro'
                          ? 'Intro — prompt follows the timer.'
                          : 'Write your answer…'
                    : 'Write your answer…'
                }
              />
            )}
          </>
        )}
      </div>

      {!isSim && trainPhase === 'prep' && allowSkipPrep(support) ? (
        <Button variant="secondary" fullWidth type="button" onClick={() => setTrainPhase('answer')}>
          Skip to answer
        </Button>
      ) : null}

      {submitError ? (
        <p className="text-caption text-red-700 text-center px-2" role="alert">
          {submitError}
        </p>
      ) : null}

      {((isSim && phase === 'answer') || (!isSim && trainPhase === 'answer')) && trainPhase !== 'reflect' ? (
        <Button
          variant="primary"
          size={readingMcqExamSimUx && isMcq ? 'lg' : 'md'}
          fullWidth
          disabled={
            submitting ||
            !canSubmitAnswerText ||
            sttBusy ||
            voiceAssessBusy ||
            (speakingOralUx && recorder.phase === 'recording')
          }
          onClick={() => void handleSubmit(false)}
        >
          {submitting
            ? submitPhase === 'finish'
              ? 'Building report…'
              : 'Saving…'
            : isMcq
              ? mcqMulti
                ? 'Submit choices'
                : 'Submit choice'
              : 'Submit answer'}
        </Button>
      ) : null}

      {trainPhase !== 'reflect' ? (
        <div className="flex flex-col items-center gap-1 pt-1">
          <Button
            variant="ghost"
            size="sm"
            type="button"
            disabled={endingEarly || submitting || sttBusy || voiceAssessBusy}
            onClick={() => void endExamEarly()}
            className="text-caption font-semibold text-slate-600 hover:text-slate-900"
          >
            {endingEarly ? 'Ending…' : `End ${isSim ? 'simulation' : 'training'} early`}
          </Button>
          <p className="text-[11px] leading-snug text-slate-500 text-center max-w-xs">
            {session.attempts.length > 0
              ? `Score the ${session.attempts.length} task${session.attempts.length === 1 ? '' : 's'} you have answered so far. Remaining tasks are skipped.`
              : 'You have not answered any task yet — ending now will not generate a score.'}
          </p>
        </div>
      ) : null}

      <ExamDevDebugPanel title="Run · dev internals" blocks={devDebugBlocks} />
    </div>
  )
}
