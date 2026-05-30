'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlignLeft, ArrowLeft, BookOpen, Bookmark, GraduationCap, Lightbulb, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle } from '@/components/ui/Card'
import { useAuthStore } from '@/store/authStore'
import { LOCAL_ANONYMOUS_LEARNER_ID } from '@/lib/storage/storageKeys'
import type {
  ExamLlmAnswerEvaluation,
  ExamLlmAnswerFit,
  ExamScoringDimension,
  ExamSessionRecord,
  ExamTaskInstance,
  ExamTaskType,
  ReadinessBand,
  SimulationQuestionBreakdown,
} from '@/lib/exam-system/types'
import { mcqSubmissionMatchesCorrect, parseMcqSubmissionIds } from '@/lib/exam-system/scoringEngine'
import { getExamProfile } from '@/lib/exam-system/examProfileRegistry'
import {
  buildSimulationQuestionBreakdown,
  resolveSimulationReportDisplayStats,
} from '@/lib/exam-system/reportBuilder'
import { formatBlueprintDebugSummary } from '@/lib/exam-system/examDevDebugFormat'
import {
  APP_EXAM_SYSTEM,
  APP_EXAM_SIMULATION_RUN,
  APP_EXAM_SIMULATION_SETUP,
  APP_EXAM_TRAIN_SETUP,
  APP_KMN_SAVED_EXAM_QUESTIONS,
} from '@/lib/routing/appRoutes'
import { KnmSaveExamQuestionButton } from '@/features/exam-prep/kmn/KnmSaveExamQuestionButton'
import { useSavedKnmExamQuestions } from '@/features/exam-prep/kmn/useSavedKnmExamQuestions'
import { evaluateExamSessionAnswers, fetchExamSession, reprocessExamReport } from './examApi'
import { examTaskTypeLabel } from './examTaskLabels'
import { knowledgeMcqOptionDisplayLetter } from '@/lib/exam-system/knowledgeMcqOptionShuffle'
import { ExamDevDebugPanel, ExamReadinessBadge, ExamShell } from './ui'
import { ExamSampleAnswerPanel } from './ExamSampleAnswerPanel'
import { examDimensionLabelFriendly } from '@/lib/exam-system/examReportUserCopy'

function dimLabel(k: string) {
  return examDimensionLabelFriendly(k)
}

function isSimulationMcqTask(task: ExamTaskInstance | undefined): task is ExamTaskInstance {
  return Boolean(
    task &&
      task.mcq?.options?.length &&
      (task.taskType === 'knowledge_mcq' || task.taskType === 'listening_mcq_exam'),
  )
}

function mcqOptionLetterFallback(id: string): string {
  return /^[a-z]$/i.test(id) ? id.toUpperCase() : id
}

function mcqOptionLetterAtDisplayPosition(task: ExamTaskInstance, optionId: string): string {
  const opts = task.mcq?.options ?? []
  const ix = opts.findIndex((o) => o.id === optionId)
  return ix >= 0 ? knowledgeMcqOptionDisplayLetter(ix) : mcqOptionLetterFallback(optionId)
}

function formatMcqChoiceLines(task: ExamTaskInstance, answerText: string): string[] {
  const ids = parseMcqSubmissionIds(answerText.trim())
  if (!ids.length) return []
  const mcq = task.mcq!
  return ids.map((id) => {
    const opt = mcq.options.find((o) => o.id === id)
    const L = mcqOptionLetterAtDisplayPosition(task, id)
    return opt ? `${L} — ${opt.label}` : L
  })
}

function formatCorrectMcqLines(task: ExamTaskInstance): string[] {
  const mcq = task.mcq!
  const ids = [...new Set(mcq.correctOptionIds)].sort()
  return ids.map((id) => {
    const opt = mcq.options.find((o) => o.id === id)
    const L = mcqOptionLetterAtDisplayPosition(task, id)
    return opt ? `${L} — ${opt.label}` : L
  })
}

function passFailTitle(band: ReadinessBand): string {
  if (band === 'ready') return 'Likely pass'
  if (band === 'borderline') return 'Borderline — could go either way'
  return 'Likely fail'
}

function passFailExplainer(band: ReadinessBand, opts?: { isComplete: boolean }): string {
  const partialSuffix = opts && !opts.isComplete
    ? ' Unanswered tasks count as 0 in this estimate, just like the real exam.'
    : ''
  if (band === 'ready') {
    return `On this practice simulation you reached the “ready” band — keep training so it stays stable under pressure.${partialSuffix}`
  }
  if (band === 'borderline') {
    return `You are close to the target band. A bit more focused practice on your weakest area usually tips the next run over the line.${partialSuffix}`
  }
  return `This run sits below the practice “ready” bar. Use the tips below and Exam Train to rebuild task by task.${partialSuffix}`
}

function knmMcqPassExplainer(band: ReadinessBand): string {
  if (band === 'ready') {
    return 'Practice estimate only: your multiple-choice score is in the pass-style band for this run — not an official DUO outcome.'
  }
  if (band === 'borderline') {
    return 'Practice estimate: a few more correct answers would move this run into the pass-style band (see norms on inburgeren.nl).'
  }
  return 'Practice estimate: this run is below the pass-style band — use the item review below, then try another simulation.'
}

function dimensionStrengthSentence(dim: ExamScoringDimension): string {
  const label = dimLabel(dim)
  const byDim: Partial<Record<ExamScoringDimension, string>> = {
    task_completion: `You handled the assignment and length better than other areas — keep answering every bullet in the prompt.`,
    natural_wording: `Your everyday vocabulary and spelling looked relatively strongest — build on that with short, clear sentences.`,
    grammar_control: `Grammar control was your steadiest pillar this time — add one more tense or connector when the task asks for it.`,
    structure: `Structure (paragraphs, order, connectors) was clearer for you than your other weaker areas.`,
    politeness: `Openings and closings / tone landed better than your other scores — match that care on every formal task.`,
    pronunciation_delivery: `Delivery and clarity were relatively strongest — keep slow, clean endings on timed repeats.`,
    listening_accuracy: `Listening-style accuracy was your strongest signal on this run.`,
    relevance: `Staying on-topic was a relative strength — carry that focus into trickier items.`,
  }
  return byDim[dim] ?? `Your strongest area this run was ${label}.`
}

function dimensionGrowthSentence(dim: ExamScoringDimension): string {
  const label = dimLabel(dim)
  const byDim: Partial<Record<ExamScoringDimension, string>> = {
    task_completion: `Task fit needs work: answer every part of the prompt, hit a sensible length, and check the checklist before you submit.`,
    natural_wording: `Vocabulary and spelling need attention — use simple words you would say out loud, and re-read for typos.`,
    grammar_control: `Grammar needs the most work — short correct sentences beat long shaky ones; practise present tense and simple perfect.`,
    structure: `Structure needs work — one idea per sentence, clear order, and blank lines or bullets when the task is a form.`,
    politeness: `Tone and greetings/closings need work — match Geachte/Beste to the situation and always sign off neatly.`,
    pronunciation_delivery: `Delivery needs work — slow down slightly and finish word endings on the next speaking run.`,
    listening_accuracy: `Listening accuracy dragged the average — replay audio, underline keywords in the question, then choose.`,
    relevance: `Staying on the question stem needs work — eliminate answers that sound right but do not match the scenario.`,
  }
  return byDim[dim] ?? `Put extra minutes into ${label} on your next practice block.`
}

/** Latest submitted answer per task; then count MCQ items scored correct in this session. */
function countLatestMcqCorrectForSession(session: ExamSessionRecord): number {
  const lastAnswer = new Map<string, string>()
  for (const a of session.attempts) {
    lastAnswer.set(a.taskId, a.answerText)
  }
  let c = 0
  for (const t of session.tasks) {
    if ((t.taskType !== 'knowledge_mcq' && t.taskType !== 'listening_mcq_exam') || !t.mcq) continue
    const ans = lastAnswer.get(t.id)?.trim() ?? ''
    if (!ans) continue
    if (mcqSubmissionMatchesCorrect(t.mcq.correctOptionIds, ans)) c += 1
  }
  return c
}

/** For a section that is MCQ-only, how many keyed answers matched (latest attempt per task). */
function mcqCorrectCountForSection(
  session: ExamSessionRecord,
  sectionId: string,
): { correct: number; total: number } | null {
  const sectionTasks = session.tasks.filter(
    (t) =>
      t.sectionId === sectionId &&
      (t.taskType === 'knowledge_mcq' || t.taskType === 'listening_mcq_exam') &&
      t.mcq?.options?.length,
  )
  if (!sectionTasks.length) return null
  if (!session.tasks.filter((t) => t.sectionId === sectionId).every(
    (t) => t.taskType === 'knowledge_mcq' || t.taskType === 'listening_mcq_exam',
  )) {
    return null
  }
  const lastAnswer = new Map<string, string>()
  for (const a of session.attempts) {
    lastAnswer.set(a.taskId, a.answerText)
  }
  let correct = 0
  for (const t of sectionTasks) {
    const ans = lastAnswer.get(t.id)?.trim() ?? ''
    if (ans && mcqSubmissionMatchesCorrect(t.mcq!.correctOptionIds, ans)) correct += 1
  }
  return { correct, total: sectionTasks.length }
}

function scoreVisualClasses(score01: number): { bar: string; badge: string } {
  if (score01 >= 0.72) {
    return { bar: 'bg-emerald-600', badge: 'border-emerald-400/80 bg-emerald-500/15 text-emerald-950' }
  }
  if (score01 >= 0.52) {
    return { bar: 'bg-amber-500', badge: 'border-amber-400/90 bg-amber-400/15 text-amber-950' }
  }
  return { bar: 'bg-rose-600', badge: 'border-rose-400/90 bg-rose-500/15 text-rose-950' }
}

function dimBarTone(score01: number): string {
  if (score01 >= 0.72) return 'bg-emerald-500'
  if (score01 >= 0.52) return 'bg-amber-500'
  return 'bg-rose-500'
}

type ImprovementTipVisual =
  | { kind: 'dimensionRationale'; title: string; percent: number; detail: string }
  | { kind: 'plain'; text: string }

/** Rubric rationales from the report builder use `Title (NN%): detail` — show as cards with a bar. */
function parseImprovementTipLine(line: string): ImprovementTipVisual {
  const m = line.match(/^(.*?)\((\d{1,3})%\):\s*(.+)$/s)
  if (m?.[1] != null && m[2] != null && m[3] != null) {
    const title = m[1].trim()
    const percent = Number.parseInt(m[2], 10)
    if (
      title.length > 0 &&
      title.length < 96 &&
      Number.isFinite(percent) &&
      percent >= 0 &&
      percent <= 100
    ) {
      return { kind: 'dimensionRationale', title, percent, detail: m[3].trim() }
    }
  }
  return { kind: 'plain', text: line }
}

/** Split rubric detail into intro + bullets (supports new multi-line and legacy inline formats). */
function parseDimensionRationaleDetail(detail: string): { intro: string | null; bullets: string[] } {
  const trimmed = detail.trim()
  if (!trimmed) return { intro: null, bullets: [] }

  if (trimmed.includes('\n')) {
    const lines = trimmed.split(/\n+/).map((l) => l.trim()).filter(Boolean)
    const bullets: string[] = []
    const introParts: string[] = []
    for (const line of lines) {
      if (/^[•\-]\s/.test(line)) bullets.push(line.replace(/^[•\-]\s+/, ''))
      else introParts.push(line)
    }
    return { intro: introParts.length ? introParts.join('\n') : null, bullets }
  }

  const legacyChunks = trimmed.split(/\s+In\s+“[^”]+”:\s+/).filter(Boolean)
  if (legacyChunks.length > 1) {
    const fieldMatch = trimmed.match(/In\s+“([^”]+)”:\s*/)
    const field = fieldMatch?.[1]
    return {
      intro: field ? `Field: “${field}”` : null,
      bullets: legacyChunks.map((c) => c.trim()),
    }
  }

  return { intro: null, bullets: [trimmed] }
}

function DimensionRationaleDetail({ detail }: { detail: string }) {
  const { intro, bullets } = parseDimensionRationaleDetail(detail)
  const singleParagraph = !intro && bullets.length === 1

  if (singleParagraph) {
    return <p className="mt-2 text-[12px] leading-relaxed text-ink-secondary">{bullets[0]}</p>
  }

  return (
    <div className="mt-2 space-y-2 text-[12px] leading-relaxed text-ink-secondary">
      {intro ? <p className="whitespace-pre-line font-medium text-ink-primary/90">{intro}</p> : null}
      {bullets.length ? (
        <ul className="m-0 list-none space-y-1.5 p-0" role="list">
          {bullets.map((item, i) => (
            <li key={`dim-bullet-${i}`} className="flex gap-2 pl-0.5">
              <span
                className="mt-[0.4rem] h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400/90 ring-2 ring-slate-200/80"
                aria-hidden
              />
              <span className="min-w-0">{item}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function scoreMiniBarTone(percent: number): {
  fill: string
  chip: string
  leftAccent: string
} {
  if (percent >= 72) {
    return {
      fill: 'bg-emerald-500',
      chip: 'border-emerald-200/90 bg-emerald-50 text-emerald-950',
      leftAccent: 'border-l-emerald-500',
    }
  }
  if (percent >= 52) {
    return {
      fill: 'bg-amber-500',
      chip: 'border-amber-200/90 bg-amber-50 text-amber-950',
      leftAccent: 'border-l-amber-500',
    }
  }
  return {
    fill: 'bg-rose-500',
    chip: 'border-rose-200/90 bg-rose-50 text-rose-950',
    leftAccent: 'border-l-rose-500',
  }
}

function QuestionImprovementPanel({ lines, heading }: { lines: string[]; heading: string }) {
  const parsed = lines.map(parseImprovementTipLine)
  const dimensionBlocks = parsed.filter(
    (p): p is Extract<ImprovementTipVisual, { kind: 'dimensionRationale' }> => p.kind === 'dimensionRationale',
  )
  const plainLines = parsed
    .filter((p): p is Extract<ImprovementTipVisual, { kind: 'plain' }> => p.kind === 'plain')
    .map((p) => p.text)

  return (
    <div className="rounded-xl border border-slate-200/85 bg-gradient-to-b from-slate-50/70 via-white to-white overflow-hidden shadow-sm shadow-slate-900/[0.04] ring-1 ring-slate-100/80">
      <div className="flex items-center gap-2.5 border-b border-slate-200/70 bg-white/95 px-3.5 py-2.5">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-amber-50 text-amber-900 ring-1 ring-amber-200/70 shadow-sm"
          aria-hidden
        >
          <Lightbulb className="h-[18px] w-[18px]" strokeWidth={2.25} />
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">{heading}</p>
      </div>
      <div className="space-y-4 px-3.5 py-3.5">
        {dimensionBlocks.length ? (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">What lowered your scores</p>
            <ul className="m-0 list-none space-y-2.5 p-0" role="list">
              {dimensionBlocks.map((b, i) => {
                const tone = scoreMiniBarTone(b.percent)
                return (
                  <li
                    key={`dim-rationale-${i}-${b.title.slice(0, 24)}`}
                    className={`rounded-xl border border-slate-200/80 border-l-[3px] ${tone.leftAccent} bg-white/95 px-3 py-2.5 shadow-sm shadow-slate-900/[0.03]`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2 gap-y-1">
                      <p className="min-w-0 text-[13px] font-semibold leading-snug text-ink-primary">{b.title}</p>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold tabular-nums ${tone.chip}`}
                      >
                        {b.percent}%
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${tone.fill}`} style={{ width: `${b.percent}%` }} />
                    </div>
                    <DimensionRationaleDetail detail={b.detail} />
                  </li>
                )
              })}
            </ul>
          </div>
        ) : null}
        {plainLines.length ? (
          <div className={dimensionBlocks.length ? 'space-y-2 border-t border-slate-100 pt-3.5' : 'space-y-2'}>
            {dimensionBlocks.length ? (
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                Specific tips for your answer
              </p>
            ) : null}
            <ul className="m-0 list-none space-y-3 p-0" role="list">
              {plainLines.map((tip, i) => {
                const { intro, bullets } = parseDimensionRationaleDetail(tip)
                if (bullets.length > 1 || intro) {
                  return (
                    <li
                      key={`plain-tip-${i}`}
                      className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2.5 text-[12px] leading-relaxed text-ink-secondary"
                    >
                      <DimensionRationaleDetail detail={tip} />
                    </li>
                  )
                }
                return (
                  <li key={`plain-tip-${i}`} className="flex gap-2.5 text-[12px] leading-relaxed text-ink-secondary">
                    <span
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-600/75 ring-2 ring-primary-600/15"
                      aria-hidden
                    />
                    <span className="min-w-0">{tip}</span>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function answerFitPresentation(fit: ExamLlmAnswerFit): { label: string; wrap: string; badge: string } {
  switch (fit) {
    case 'yes':
      return {
        label: 'Addresses the prompt',
        wrap: 'border-emerald-200/90 bg-gradient-to-br from-emerald-50/95 to-white',
        badge: 'bg-emerald-600 text-white shadow-sm shadow-emerald-900/20',
      }
    case 'mostly':
      return {
        label: 'Mostly addresses the prompt',
        wrap: 'border-teal-200/90 bg-gradient-to-br from-teal-50/90 to-white',
        badge: 'bg-teal-600 text-white shadow-sm shadow-teal-900/15',
      }
    case 'partial':
      return {
        label: 'Partially addresses the prompt',
        wrap: 'border-amber-200/90 bg-gradient-to-br from-amber-50/90 to-white',
        badge: 'bg-amber-600 text-white shadow-sm shadow-amber-900/15',
      }
    case 'no':
    default:
      return {
        label: 'Does not address the prompt',
        wrap: 'border-rose-200/90 bg-gradient-to-br from-rose-50/90 to-white',
        badge: 'bg-rose-600 text-white shadow-sm shadow-rose-900/15',
      }
  }
}

function QuestionAnswerFitPanel({
  evaluation,
  pending,
}: {
  evaluation: ExamLlmAnswerEvaluation | undefined
  pending: boolean
}) {
  if (pending && !evaluation) {
    return (
      <div className="rounded-xl border border-indigo-100/90 bg-indigo-50/50 px-3.5 py-3.5">
        <div className="flex items-center gap-2 text-indigo-900/85">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
          <p className="text-[11px] font-semibold leading-snug">Checking whether your answer addressed the question…</p>
        </div>
        <div className="mt-3 space-y-2">
          <div className="h-2 rounded-full bg-indigo-100/90 overflow-hidden">
            <div className="h-full w-1/3 animate-pulse rounded-full bg-indigo-300/60" />
          </div>
          <div className="h-2 w-[85%] rounded bg-indigo-100/80" />
        </div>
      </div>
    )
  }
  if (!evaluation) return null
  const vis = answerFitPresentation(evaluation.fit)
  const sourceLine =
    evaluation.source === 'openai' ? 'AI review of prompt fit' : 'Built-in prompt check'

  return (
    <div className={`rounded-xl border px-3.5 py-3 shadow-sm shadow-slate-900/[0.04] ${vis.wrap}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">Did you answer the question?</p>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${vis.badge}`}>
          {vis.label}
        </span>
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-ink-primary">{evaluation.feedbackEn}</p>
      {evaluation.gapsEn?.length ? (
        <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] leading-snug text-ink-secondary m-0">
          {evaluation.gapsEn.map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ul>
      ) : null}
      <p className="mt-2 text-[10px] text-ink-secondary/85">
        {sourceLine} · confidence {Math.round(evaluation.confidence01 * 100)}%
      </p>
    </div>
  )
}

export function ExamSimulationReportClient() {
  const search = useSearchParams()
  const sessionId = search.get('id')?.trim() ?? ''
  const xpQ = search.get('xp')
  const xpFlash = xpQ != null && xpQ !== '' ? Number(xpQ) : null
  const userId = useAuthStore((s) => s.user?.id) ?? LOCAL_ANONYMOUS_LEARNER_ID

  const qc = useQueryClient()
  const [reprocessing, setReprocessing] = useState(false)
  const [reprocessErr, setReprocessErr] = useState<string | null>(null)

  const sessionQ = useQuery({
    queryKey: ['exam', 'session', userId, sessionId],
    queryFn: () => fetchExamSession(userId, sessionId),
    enabled: Boolean(sessionId),
    /** Always refetch: run screen may leave a stale in-progress row in cache (default staleTime 60s). */
    staleTime: 0,
  })

  const session = sessionQ.data
  const report = session?.report

  const examTrainSetupHref = useMemo(() => {
    if (!session?.profileId) return APP_EXAM_TRAIN_SETUP
    const p = new URLSearchParams()
    p.set('profileId', session.profileId)
    if (session.scope === 'section' && session.sectionId) p.set('sectionId', session.sectionId)
    p.set('prefAlmostExam', '1')
    return `${APP_EXAM_TRAIN_SETUP}?${p.toString()}`
  }, [session?.profileId, session?.scope, session?.sectionId])

  const examProfile = session ? getExamProfile(session.profileId) : null
  const savedKnmQuestions = useSavedKnmExamQuestions()

  const questionRows = useMemo((): SimulationQuestionBreakdown[] => {
    if (!session || session.status !== 'completed' || session.mode !== 'simulation') return []
    const rep = session.report
    if (!rep || rep.kind !== 'simulation') return []
    if (!examProfile) return []
    const rows = buildSimulationQuestionBreakdown(session, examProfile)
    const ev = session.llmAnswerEvaluations
    if (!ev) return rows
    return rows.map((r) => (ev[r.taskId] ? { ...r, llmAnswerEvaluation: ev[r.taskId] } : r))
  }, [session, examProfile])

  const answerEvalMutation = useMutation({
    mutationFn: () => evaluateExamSessionAnswers(userId, sessionId, { force: true }),
    onSuccess: (nextSession) => {
      qc.setQueryData(['exam', 'session', userId, sessionId], nextSession)
      void qc.invalidateQueries({ queryKey: ['exam', 'sessions', userId] })
    },
  })

  if (!sessionId) {
    return (
      <ExamShell>
        <p className="text-body-sm text-ink-secondary">
          Missing session id.{' '}
          <Link href={APP_EXAM_SIMULATION_SETUP} className="font-semibold text-primary-900">
            Setup
          </Link>
        </p>
      </ExamShell>
    )
  }

  if (sessionQ.isError) {
    return (
      <ExamShell>
        <p className="text-body-sm text-red-700">Could not load session.</p>
      </ExamShell>
    )
  }

  if (sessionQ.isLoading || !session) {
    return (
      <ExamShell>
        <p className="text-body-sm text-ink-secondary">Loading report…</p>
      </ExamShell>
    )
  }

  if (session.mode !== 'simulation' || report?.kind !== 'simulation') {
    return (
      <ExamShell>
        <p className="text-body-sm text-ink-secondary">This page only shows completed simulation reports.</p>
        <Link href={APP_EXAM_SYSTEM} className="mt-4 block">
          <Button variant="secondary" fullWidth>
            Exam hub
          </Button>
        </Link>
      </ExamShell>
    )
  }

  if (session.status !== 'completed') {
    return (
      <ExamShell>
        <p className="text-body-sm text-ink-secondary">
          Session not finished.{' '}
          <Link href={`${APP_EXAM_SIMULATION_RUN}?id=${encodeURIComponent(sessionId)}`} className="font-semibold text-primary-900">
            Continue run
          </Link>
        </p>
      </ExamShell>
    )
  }

  const dimEntries = Object.entries(report.dimensionAverages).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
  const taskTypeEntries = Object.entries(report.taskTypeAverages).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))

  /**
   * `report.overallScore01` is the exam-equivalent score for reports built after the
   * scoring fix, but legacy stored reports (pre-fix) hold the answered-tasks average
   * there. `resolveSimulationReportDisplayStats` normalizes both shapes so the headline
   * always shows the exam-equivalent number and the readiness band reflects it.
   */
  const displayStats = resolveSimulationReportDisplayStats(session, report, examProfile ?? undefined)
  const effectiveBand = displayStats.readinessBand
  const headlineScore01 = displayStats.examEquivalentScore01
  const answeredAvg01 = displayStats.answeredScore01
  const attemptedCount = displayStats.attemptedCount
  const totalTaskCount = displayStats.totalTaskCount
  const isComplete = displayStats.isComplete

  const sessionHasMcqTasks = session.tasks.some(
    (t) =>
      Boolean(t.mcq?.options?.length) &&
      (t.taskType === 'knowledge_mcq' || t.taskType === 'listening_mcq_exam'),
  )

  /** A2 KNM computer-exam simulation: MCQ-only — hide rubric-style coaching and dimension narratives. */
  const knmExamComputerReport =
    examProfile?.examCode === 'inburgering_knm' &&
    session.level === 'A2' &&
    session.tasks.length > 0 &&
    session.tasks.every((t) => t.taskType === 'knowledge_mcq' && t.sectionId === 'a2_knm_examen')

  const weakestDimFromAvg =
    dimEntries.length > 0 ? (dimEntries[dimEntries.length - 1]![0] as ExamScoringDimension) : null
  const growthDim: ExamScoringDimension | null =
    report.mainBlocker && report.strongestDimension && report.mainBlocker === report.strongestDimension
      ? weakestDimFromAvg
      : report.mainBlocker

  const strengthLine = report.strongestDimension
    ? dimensionStrengthSentence(report.strongestDimension)
    : 'Finish another timed simulation when you can — a clearer “what went well” line appears once your scores spread out a bit more.'
  const growthLine = growthDim
    ? dimensionGrowthSentence(growthDim)
    : 'Use the per-question section below to pick one concrete habit to improve before your next run.'

  const onReprocessReport = async () => {
    setReprocessErr(null)
    setReprocessing(true)
    try {
      const updated = await reprocessExamReport(userId, sessionId)
      qc.setQueryData(['exam', 'session', userId, sessionId], updated)
      void qc.invalidateQueries({ queryKey: ['exam', 'sessions', userId] })
    } catch (e) {
      setReprocessErr(e instanceof Error ? e.message : 'Could not recalculate report.')
    } finally {
      setReprocessing(false)
    }
  }

  return (
    <ExamShell contentClassName="pb-28">
      <Link
        href={APP_EXAM_SYSTEM}
        className="inline-flex items-center gap-1.5 text-caption font-semibold text-ink-secondary hover:text-ink-primary mb-4"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Exam hub
      </Link>

      {/* Outcome */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-700/60 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-5 py-6 text-white shadow-xl shadow-slate-950/30 ring-1 ring-white/10">
        <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-primary-500/10 blur-2xl" aria-hidden />
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/55">Simulation outcome</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <ExamReadinessBadge band={effectiveBand} appearance="onDark" />
          <p className="text-body-lg font-bold text-white tracking-tight">{passFailTitle(effectiveBand)}</p>
        </div>
        <p className="text-caption text-white/70 mt-2 leading-relaxed max-w-prose">
          {knmExamComputerReport
            ? knmMcqPassExplainer(effectiveBand)
            : passFailExplainer(effectiveBand, { isComplete })}
        </p>
        <div className="mt-5 flex flex-wrap items-end gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/50">
              {isComplete ? 'Average score' : 'Exam-equivalent score'}
            </p>
            <p className="text-display font-bold tabular-nums tracking-tight">
              {(headlineScore01 * 100).toFixed(0)}
              <span className="text-body-lg font-semibold text-white/70">%</span>
            </p>
          </div>
          <div className="min-w-[120px] flex-1 pb-1.5">
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${scoreVisualClasses(headlineScore01).bar}`}
                style={{ width: `${Math.round(Math.min(1, headlineScore01) * 100)}%` }}
              />
            </div>
          </div>
        </div>
        <p className="text-caption text-white/55 mt-2">
          {knmExamComputerReport
            ? 'Practice average from item scoring only — not a DUO exam result.'
            : isComplete
              ? 'Average across all tasks in this simulation (practice estimate, not an official exam result).'
              : `You answered ${attemptedCount} of ${totalTaskCount} task${totalTaskCount === 1 ? '' : 's'}. Unanswered tasks count as 0 in this exam-equivalent score (practice estimate, not an official exam result).`}
        </p>
        {!isComplete && totalTaskCount > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/55">
                On the {attemptedCount} task{attemptedCount === 1 ? '' : 's'} you answered
              </p>
              <p className="text-body-sm font-semibold text-white/85 tabular-nums mt-0.5">
                {(answeredAvg01 * 100).toFixed(0)}% average
              </p>
            </div>
            <p className="text-caption text-white/55 max-w-[26ch] leading-snug">
              Useful for spotting strengths in what you did try, but it does not predict whether you’d pass the full exam.
            </p>
          </div>
        ) : null}

        {knmExamComputerReport ? (
          <p className="text-caption text-white/65 mt-4 max-w-prose leading-relaxed border-t border-white/10 pt-4">
            <span className="font-semibold text-white/85">KNM practice (this run):</span>{' '}
            {countLatestMcqCorrectForSession(session)} of {session.tasks.length} items correct (latest answer per
            question). The official computer exam is 40 questions in 45 minutes; a pass is often described as about 26
            correct, sometimes 28 — confirm the current norm on inburgeren.nl. Official outcomes are{' '}
            <span className="italic">geslaagd</span> or <span className="italic">niet geslaagd</span>, usually within
            about eight weeks in Mijn Inburgering.
          </p>
        ) : null}

        {knmExamComputerReport ? (
          <p className="text-caption text-white/60 mt-4 max-w-prose leading-relaxed border-t border-white/10 pt-4">
            Per question below: only whether you were right, your choice, the correct answer, and the English study text
            from the question bank (context for the right answer). There is no rubric-style feedback on these items.
          </p>
        ) : (
          <div className="mt-5 space-y-4 border-t border-white/10 pt-5 text-left">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-200/95">What went relatively well</p>
              <p className="text-body-sm text-white/90 mt-1.5 leading-relaxed">{strengthLine}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-200/95">What to improve first</p>
              <p className="text-body-sm text-white/90 mt-1.5 leading-relaxed">{growthLine}</p>
            </div>
          </div>
        )}

        <p className="text-caption text-white/55 mt-5">
          Level {session.level} · {session.scope === 'full' ? 'Full exam' : `Section · ${session.sectionId ?? ''}`}
        </p>
        <div className="mt-5 border-t border-white/10 pt-4 space-y-2">
          <Button
            type="button"
            variant="secondary"
            fullWidth
            disabled={reprocessing}
            onClick={() => void onReprocessReport()}
            className="border-white/25 bg-white/10 text-white hover:bg-white/15 disabled:opacity-50"
          >
            <span className="inline-flex items-center justify-center gap-2">
              <RefreshCw className={`h-4 w-4 shrink-0 ${reprocessing ? 'animate-spin' : ''}`} aria-hidden />
              {reprocessing ? 'Recalculating…' : 'Recalculate report with latest scoring'}
            </span>
          </Button>
          <p className="text-caption text-white/55 leading-relaxed">
            Re-runs scoring, AI answer-fit feedback, per-question tips, and Dutch/English word glosses for sample
            answers, then saves the new report. May take a minute. XP and official eligibility are unchanged.
          </p>
          {reprocessErr ? <p className="text-caption text-rose-200">{reprocessErr}</p> : null}
        </div>
      </section>

      {typeof xpFlash === 'number' && !Number.isNaN(xpFlash) && xpFlash > 0 ? (
        <p className="mt-5 rounded-2xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-3 text-caption font-semibold text-emerald-950">
          +{xpFlash} XP awarded
        </p>
      ) : null}

      {/* Section breakdown */}
      {report.sectionScores?.length && !knmExamComputerReport ? (
        <section className="mt-8 space-y-3">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">By section</h2>
          <Card variant="flat" padding="md" className="rounded-2xl border border-slate-200/90 bg-white shadow-sm space-y-3">
            <ul className="space-y-3">
              {report.sectionScores.map((sec) => {
                const mcqTally = mcqCorrectCountForSection(session, sec.sectionId)
                return (
                <li key={sec.sectionId}>
                  <div className="flex justify-between text-body-sm gap-2">
                    <span className="font-semibold text-ink-primary">{sec.title ?? sec.sectionId}</span>
                    <span className="tabular-nums text-ink-secondary text-right shrink-0">
                      {(sec.score01 * 100).toFixed(0)}%
                      {mcqTally ? ` · ${mcqTally.correct}/${mcqTally.total} correct` : ''}
                      {' '}
                      · {sec.taskCount} task{sec.taskCount === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-slate-800" style={{ width: `${Math.round(Math.min(1, sec.score01) * 100)}%` }} />
                  </div>
                </li>
                )
              })}
            </ul>
          </Card>
        </section>
      ) : null}

      {/* By question */}
      {questionRows.length ? (
        <section className="mt-8 space-y-4">
          <div className="space-y-1.5">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">By question</h2>
            <p className="text-caption text-ink-secondary leading-relaxed max-w-prose">
              {knmExamComputerReport
                ? 'Each item: whether you were right, your choice, the key, and the English study note from the bank.'
                : sessionHasMcqTasks
                  ? 'Multiple choice items show correct/incorrect and the key. Speaking and writing items include your answer, feedback, and a sample answer.'
                  : 'Your answer, feedback on this item, and a sample answer you can listen to and tap for word meanings.'}
            </p>
            {knmExamComputerReport ? (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Link
                  href={APP_KMN_SAVED_EXAM_QUESTIONS}
                  className="inline-flex min-h-touch items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/60 px-3 py-2 text-caption font-semibold text-indigo-950 hover:bg-indigo-100/80"
                >
                  <Bookmark className="h-4 w-4 shrink-0" aria-hidden />
                  Saved for review
                  {savedKnmQuestions.length > 0 ? (
                    <span className="rounded-full bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 min-w-[1.25rem] text-center">
                      {savedKnmQuestions.length}
                    </span>
                  ) : null}
                </Link>
                <span className="text-[11px] text-ink-secondary">
                  Separate from library words — practice saved items anytime.
                </span>
              </div>
            ) : null}
          </div>

          {!knmExamComputerReport ? (
            <div className="rounded-2xl border border-slate-200/90 bg-white px-3 py-3 sm:px-4 shadow-sm ring-1 ring-slate-100/80 space-y-2.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Did you answer the question?</p>
              {answerEvalMutation.isError ? (
                <p className="text-caption text-rose-800 rounded-lg border border-rose-100 bg-rose-50/90 px-3 py-2 leading-relaxed">
                  Could not check whether your answers matched the task.
                  {answerEvalMutation.error instanceof Error && answerEvalMutation.error.message ? (
                    <span className="block mt-1 font-medium">{answerEvalMutation.error.message}</span>
                  ) : null}
                </p>
              ) : null}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={answerEvalMutation.isPending}
                  onClick={() => void answerEvalMutation.mutateAsync()}
                  className="w-full sm:w-auto shrink-0"
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    {answerEvalMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                    )}
                    {answerEvalMutation.isPending ? 'Checking…' : 'Re-run AI prompt check'}
                  </span>
                </Button>
                {answerEvalMutation.isError ? (
                  <button
                    type="button"
                    className="text-caption font-semibold text-primary-900 underline decoration-primary-700/40 hover:decoration-primary-900 sm:ml-auto"
                    onClick={() => {
                      answerEvalMutation.reset()
                      void answerEvalMutation.mutateAsync()
                    }}
                  >
                    Try again
                  </button>
                ) : null}
              </div>
              <p className="text-[11px] text-ink-secondary leading-snug border-t border-slate-100 pt-2">
                Updates whether each answer addressed the prompt. For detailed scores and sample-answer word glosses,
                use <span className="font-medium text-ink-primary">Recalculate report with latest scoring</span> at the
                top of this page.
              </p>
            </div>
          ) : null}

          <div className="space-y-4">
            {questionRows.map((q) => {
              const taskDef = session.tasks.find((t) => t.id === q.taskId)
              const mcqUi = isSimulationMcqTask(taskDef)
              const knmExamItemMinimal = knmExamComputerReport && mcqUi
              const userAnsTrim = q.userAnswerText.trim()
              let mcqOutcome: 'correct' | 'incorrect' | 'empty' | null = null
              if (mcqUi) {
                mcqOutcome = !userAnsTrim
                  ? 'empty'
                  : mcqSubmissionMatchesCorrect(taskDef.mcq!.correctOptionIds, userAnsTrim)
                    ? 'correct'
                    : 'incorrect'
              }
              const vis = mcqUi
                ? scoreVisualClasses(mcqOutcome === 'correct' ? 1 : mcqOutcome === 'incorrect' ? 0.15 : 0)
                : scoreVisualClasses(q.score01)
              const dimEntries = mcqUi
                ? []
                : (
                    Object.entries(q.dimensionScores ?? {}) as [ExamScoringDimension, number | undefined][]
                  )
                    .filter(([, v]) => typeof v === 'number')
                    .sort((a, b) => (a[1] ?? 0) - (b[1] ?? 0))
              const mcqFeedbackLines =
                mcqUi && mcqOutcome === 'correct'
                  ? ['This multiple-choice item was scored as correct.']
                  : mcqUi && mcqOutcome === 'incorrect'
                    ? [
                        'This item was scored as incorrect. Compare your choice to the correct answer and re-read what the question asks.',
                      ]
                    : mcqUi && mcqOutcome === 'empty'
                      ? ['No option was submitted. In the exam, choose your best answer before time runs out.']
                      : q.improvementTips
              return (
                <Card
                  key={q.taskId}
                  variant="flat"
                  padding="md"
                  className="rounded-2xl border border-slate-200/90 bg-white shadow-md shadow-slate-900/5 ring-1 ring-slate-100/80 space-y-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-body-sm font-semibold text-ink-primary">
                        Question {q.index1Based}
                        <span className="text-caption font-medium text-ink-secondary">
                          {' '}
                          · {q.sectionTitle ?? q.sectionId} · {examTaskTypeLabel(q.taskType)}
                        </span>
                      </p>
                      {knmExamItemMinimal && taskDef ? (
                        <div className="mt-2 space-y-1 rounded-xl border border-slate-100 bg-slate-50/90 px-3 py-2.5">
                          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Question (Dutch)</p>
                          <p className="text-body-sm text-ink-primary leading-relaxed whitespace-pre-wrap">{taskDef.promptNl}</p>
                        </div>
                      ) : q.promptSummaryNl ? (
                        <p className="mt-2 text-caption text-ink-secondary leading-relaxed rounded-xl bg-slate-50/90 border border-slate-100 px-3 py-2.5">
                          {q.promptSummaryNl}
                        </p>
                      ) : null}
                    </div>
                    <div
                      className={`shrink-0 rounded-2xl border-2 px-4 py-2.5 text-center min-w-[4.5rem] ${vis.badge}`}
                    >
                      <p className="text-[10px] font-bold uppercase tracking-wide text-current/70">
                        {mcqUi ? 'Result' : 'Score'}
                      </p>
                      {mcqUi ? (
                        <p className="text-lg font-bold leading-tight">
                          {mcqOutcome === 'correct'
                            ? 'Correct'
                            : mcqOutcome === 'incorrect'
                              ? 'Incorrect'
                              : 'No answer'}
                        </p>
                      ) : (
                        <p className="text-xl font-bold tabular-nums leading-tight">{(q.score01 * 100).toFixed(0)}%</p>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 overflow-hidden">
                      <div className="flex items-center gap-2 border-b border-slate-200/80 bg-white/80 px-3 py-2">
                        <AlignLeft className="h-4 w-4 text-slate-500 shrink-0" aria-hidden />
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">
                          {mcqUi ? 'Your choice' : 'Your answer'}
                        </p>
                      </div>
                      <pre className="max-h-56 overflow-y-auto whitespace-pre-wrap break-words px-3 py-3 text-caption text-ink-primary font-sans leading-relaxed">
                        {mcqUi && taskDef
                          ? userAnsTrim
                            ? formatMcqChoiceLines(taskDef, userAnsTrim).join('\n')
                            : 'No option submitted for this item.'
                          : q.userAnswerText
                            ? q.userAnswerText
                            : 'No text submitted for this item.'}
                      </pre>
                    </div>
                    <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/35 overflow-hidden">
                      {mcqUi && taskDef ? (
                        <>
                          <div className="flex items-center gap-2 border-b border-emerald-200/60 bg-emerald-50/50 px-3 py-2">
                            <BookOpen className="h-4 w-4 text-emerald-800/80 shrink-0" aria-hidden />
                            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-950/90">
                              {taskDef.mcq!.correctOptionIds.length > 1 ? 'Correct answers' : 'Correct answer'}
                            </p>
                          </div>
                          <pre className="max-h-56 overflow-y-auto whitespace-pre-wrap break-words px-3 py-3 text-caption text-emerald-950/95 font-sans leading-relaxed">
                            {formatCorrectMcqLines(taskDef).join('\n')}
                          </pre>
                        </>
                      ) : (
                        <ExamSampleAnswerPanel
                          text={q.modelAnswerNl?.trim() ?? ''}
                          isScaffold={Boolean(q.modelAnswerIsScaffold)}
                          personalizedFromYourAnswer={Boolean(q.modelAnswerPersonalized)}
                          serverGlosses={session.sampleAnswerWordGlosses ?? {}}
                        />
                      )}
                    </div>
                  </div>

                  <QuestionAnswerFitPanel evaluation={q.llmAnswerEvaluation} pending={answerEvalMutation.isPending} />

                  {knmExamItemMinimal && taskDef ? (
                    <>
                      <div className="rounded-xl border border-indigo-100/90 bg-indigo-50/50 px-3 py-3 space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-indigo-900/75">
                          Study note (English) — context for the answer
                        </p>
                        {taskDef.promptEn.trim() ? (
                          <p className="text-caption text-indigo-950/90 leading-relaxed">{taskDef.promptEn}</p>
                        ) : (
                          <p className="text-caption text-indigo-900/80 leading-relaxed">
                            This item has no English helper in the bank — rely on the Dutch question and the correct
                            option above.
                          </p>
                        )}
                      </div>
                      <KnmSaveExamQuestionButton
                        task={taskDef}
                        sessionId={sessionId}
                        userAnswerText={userAnsTrim}
                      />
                    </>
                  ) : null}

                  {dimEntries.length ? (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 mb-2">
                        Scores on this question
                      </p>
                      <ul className="space-y-2">
                        {dimEntries.map(([k, v]) => {
                          const pct = Math.round(Math.min(1, v ?? 0) * 100)
                          return (
                            <li key={k}>
                              <div className="flex justify-between text-caption gap-2">
                                <span className="font-medium text-ink-primary truncate">{dimLabel(k)}</span>
                                <span className="tabular-nums text-ink-secondary shrink-0">{pct}%</span>
                              </div>
                              <div className="mt-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${dimBarTone(v ?? 0)}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  ) : null}

                  {!(knmExamComputerReport && mcqUi) ? (
                    <QuestionImprovementPanel lines={mcqFeedbackLines} heading={mcqUi ? 'Feedback' : 'How to improve'} />
                  ) : null}
                  {!mcqUi && q.weakDimensions.length ? (
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-2 border-t border-slate-100 pt-3">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                        Focus areas
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {q.weakDimensions.map((d) => (
                          <span
                            key={d}
                            className="inline-flex items-center rounded-full border border-rose-200/85 bg-gradient-to-b from-rose-50 to-rose-50/70 px-2.5 py-1 text-[11px] font-semibold text-rose-950 shadow-sm shadow-rose-900/5"
                          >
                            {dimLabel(d)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </Card>
              )
            })}
          </div>
        </section>
      ) : null}

      {/* Task type breakdown */}
      {taskTypeEntries.length && !knmExamComputerReport ? (
        <section className="mt-8 space-y-3">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">By task type</h2>
          <Card variant="flat" padding="md" className="rounded-2xl border border-slate-200/90 bg-white shadow-sm space-y-3">
            <ul className="space-y-2.5">
              {taskTypeEntries.map(([k, v]) => (
                <li key={k} className="flex justify-between items-center text-caption">
                  <span className="font-medium text-ink-primary">{examTaskTypeLabel(k as ExamTaskType)}</span>
                  <span className="tabular-nums text-ink-secondary">{((v ?? 0) * 100).toFixed(0)}%</span>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ) : null}

      {/* Dimensions */}
      {dimEntries.length && !knmExamComputerReport ? (
        <section className="mt-8 space-y-3">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Skills we measured</h2>
          <Card variant="flat" padding="md" className="rounded-2xl border border-slate-200/90 bg-white shadow-sm space-y-3">
            <ul className="space-y-3">
              {dimEntries.map(([k, v]) => (
                <li key={k}>
                  <div className="flex justify-between text-caption">
                    <span className="font-medium text-ink-primary">{dimLabel(k)}</span>
                    <span className="tabular-nums text-ink-secondary">{((v ?? 0) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${dimBarTone(v ?? 0)}`}
                      style={{ width: `${Math.round(Math.min(1, v ?? 0) * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ) : null}

      {/* Best next training */}
      <section className="mt-8">
        <Card variant="flat" padding="md" className="rounded-2xl border border-primary-200/50 bg-gradient-to-br from-primary-50/80 to-white shadow-sm">
          <CardTitle className="text-body-sm font-semibold text-primary-950">Best next training</CardTitle>
          <p className="text-body-sm text-ink-primary leading-relaxed mt-2">{report.nextTrainingRecommendation}</p>
          <Link href={examTrainSetupHref} className="mt-4 block">
            <Button
              type="button"
              variant="secondary"
              fullWidth
              className="border-primary-300/90 bg-white/95 text-primary-950 hover:bg-primary-50/80"
            >
              <span className="inline-flex items-center justify-center gap-2">
                <GraduationCap className="h-4 w-4 shrink-0" aria-hidden />
                Open Exam Train setup
              </span>
            </Button>
          </Link>
          <p className="text-caption text-ink-secondary mt-2 leading-relaxed">
            Preloads this exam profile
            {session.scope === 'section' && session.sectionId ? ' and the same section' : ''}, with almost-exam style
            support and timers. Use Start training on the next screen when you are ready.
          </p>
        </Card>
      </section>

      <ExamDevDebugPanel
        title="Simulation report · dev internals"
        blocks={[
          ...(examProfile ? [{ label: 'Blueprint summary', body: formatBlueprintDebugSummary(examProfile) }] : []),
          { label: 'Report payload', body: JSON.stringify(report, null, 2) },
          {
            label: 'Recommendation string (reportBuilder)',
            body: report.nextTrainingRecommendation,
          },
          {
            label: 'Session attempts (count + progression XP)',
            body: JSON.stringify(
              {
                attemptCount: session.attempts.length,
                progressionXpAwarded: session.progressionXpAwarded ?? null,
                readinessSnapshot: session.readinessSnapshot ?? null,
                readinessConfidence: report.readinessConfidence,
                readinessConfidenceNotes: report.readinessConfidenceNotes,
              },
              null,
              2,
            ),
          },
        ]}
      />

      <div className="mt-10 flex flex-col gap-2">
        <Link href={APP_EXAM_SYSTEM}>
          <Button variant="primary" fullWidth size="lg">
            Back to Exam hub
          </Button>
        </Link>
        <Link href={APP_EXAM_SIMULATION_SETUP}>
          <Button variant="secondary" fullWidth>
            New simulation
          </Button>
        </Link>
      </div>
    </ExamShell>
  )
}
