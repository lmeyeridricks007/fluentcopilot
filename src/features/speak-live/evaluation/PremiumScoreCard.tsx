'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Minus } from 'lucide-react'

type ReliabilityLevel = 'high' | 'medium' | 'low'

type ScoreBand = {
  id: string
  label: string
  shortLabel: string
}

type DimensionFeedbackItem = {
  issue: string
  fix: string
  whyItMatters: string
  word?: string
  phrase?: string
}

type ScoreDimension = {
  id: string
  score: number | null
  band: ScoreBand | null
  reliability: { level: ReliabilityLevel; reason: string }
  source: string
  evidenceSummary: string
  feedbackItems: DimensionFeedbackItem[]
}

type RecommendedDrill = {
  dimension: string
  type: string
  title: string
  detail: string
  targetText?: string
  priority: 'high' | 'medium' | 'low'
}

type WeightedComposite = {
  overall: number
  band: ScoreBand
  breakdown: { dimension: string; score: number | null; weight: number; contribution: number | null }[]
}

type PremiumEvaluation = {
  dimensions: ScoreDimension[]
  composite: WeightedComposite
  reliability: { level: ReliabilityLevel; reason: string }
  priorityDimensions: ScoreDimension[]
  headlineSummary: string
  recommendedDrills: RecommendedDrill[]
}

const DIMENSION_LABELS: Record<string, { label: string; icon: string; tone: string }> = {
  pronunciation: { label: 'Pronunciation clarity', icon: '🎙', tone: 'sky' },
  fluency: { label: 'Fluency', icon: '💬', tone: 'violet' },
  rhythm: { label: 'Rhythm & phrasing', icon: '🎵', tone: 'purple' },
  wording: { label: 'Natural wording', icon: '📝', tone: 'amber' },
  grammar: { label: 'Grammar & construction', icon: '📐', tone: 'emerald' },
  scenarioFit: { label: 'Fits the situation', icon: '🎯', tone: 'rose' },
}

const TONE_CLASSES: Record<string, { border: string; bg: string; text: string; badge: string }> = {
  sky: { border: 'border-violet-200', bg: 'bg-violet-50', text: 'text-sky-950', badge: 'bg-violet-100 text-violet-800' },
  violet: { border: 'border-violet-200', bg: 'bg-violet-50', text: 'text-violet-950', badge: 'bg-violet-100 text-violet-800' },
  purple: { border: 'border-purple-200', bg: 'bg-purple-50', text: 'text-purple-950', badge: 'bg-purple-100 text-purple-800' },
  amber: { border: 'border-amber-200', bg: 'bg-amber-50', text: 'text-amber-950', badge: 'bg-amber-100 text-amber-800' },
  emerald: { border: 'border-emerald-200', bg: 'bg-emerald-50', text: 'text-emerald-950', badge: 'bg-emerald-100 text-emerald-800' },
  rose: { border: 'border-rose-200', bg: 'bg-rose-50', text: 'text-rose-950', badge: 'bg-rose-100 text-rose-800' },
}

function ReliabilityBadge({ level, reason }: { level: ReliabilityLevel; reason: string }) {
  const config = {
    high: { cls: 'bg-emerald-100 text-emerald-800', Icon: CheckCircle, label: 'Reliable' },
    medium: { cls: 'bg-amber-100 text-amber-800', Icon: Minus, label: 'Estimated' },
    low: { cls: 'bg-slate-100 text-slate-600', Icon: AlertTriangle, label: 'Rough estimate' },
  }[level]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold ${config.cls}`} title={reason}>
      <config.Icon className="h-2.5 w-2.5" aria-hidden />
      {config.label}
    </span>
  )
}

function ScoreRing({ score, band }: { score: number | null; band: ScoreBand | null }) {
  if (score == null) {
    return (
      <div className="flex flex-col items-center justify-center w-14 h-14 rounded-full border-2 border-dashed border-slate-300 bg-slate-50">
        <span className="text-[10px] text-slate-400">N/A</span>
      </div>
    )
  }
  const color =
    score >= 90 ? 'border-emerald-400 text-emerald-700' :
    score >= 75 ? 'border-emerald-300 text-emerald-600' :
    score >= 60 ? 'border-amber-300 text-amber-700' :
    score >= 40 ? 'border-orange-300 text-orange-700' :
    'border-rose-300 text-rose-700'

  return (
    <div className={`flex flex-col items-center justify-center w-14 h-14 rounded-full border-[3px] ${color}`}>
      <span className="text-lg font-bold tabular-nums leading-none">{score}</span>
      <span className="text-[8px] font-semibold uppercase tracking-wide mt-0.5 opacity-70">
        {band?.shortLabel ?? ''}
      </span>
    </div>
  )
}

function DimensionCard({ dim, defaultExpanded = false }: { dim: ScoreDimension; defaultExpanded?: boolean }) {
  const [open, setOpen] = useState(defaultExpanded)
  const meta = DIMENSION_LABELS[dim.id] ?? { label: dim.id, icon: '•', tone: 'slate' }
  const tc = TONE_CLASSES[meta.tone] ?? TONE_CLASSES.sky

  const isAudioDim = ['pronunciation', 'fluency', 'rhythm'].includes(dim.id)
  const sourceLabel = isAudioDim ? 'Voice-based' : dim.source === 'scenario_matcher' ? 'Scenario coaching' : 'Text-based'

  return (
    <div className={`rounded-xl border ${tc.border} ${tc.bg} overflow-hidden`}>
      <button
        type="button"
        className="w-full px-3 py-2.5 flex items-center gap-3 text-left"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <ScoreRing score={dim.score} band={dim.band} />
        <div className="flex-1 min-w-0">
          <p className={`text-[11px] font-bold ${tc.text}`}>{meta.label}</p>
          <p className="text-[10px] text-ink-secondary mt-0.5 truncate">{dim.evidenceSummary}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-semibold ${tc.badge}`}>{sourceLabel}</span>
            <ReliabilityBadge level={dim.reliability.level} reason={dim.reliability.reason} />
          </div>
        </div>
        {open
          ? <ChevronUp className="h-3.5 w-3.5 text-ink-tertiary shrink-0" aria-hidden />
          : <ChevronDown className="h-3.5 w-3.5 text-ink-tertiary shrink-0" aria-hidden />}
      </button>

      {open && dim.feedbackItems.length > 0 ? (
        <div className="px-3 pb-3 space-y-2 border-t border-slate-200/60">
          {dim.feedbackItems.slice(0, 5).map((fb, i) => (
            <div key={`fb-${i}`} className="bg-white/80 rounded-lg px-2.5 py-2 text-[11px] text-ink-secondary">
              <p className="font-medium text-ink-primary">
                {fb.word ? <span className="font-bold text-rose-800">"{fb.word}" — </span> : null}
                {fb.issue}
              </p>
              <p className="mt-1 text-emerald-900">
                <span className="font-semibold">Fix:</span> {fb.fix}
              </p>
              <p className="mt-0.5 text-ink-tertiary">{fb.whyItMatters}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function DrillCard({ drill }: { drill: RecommendedDrill }) {
  const priorityCls =
    drill.priority === 'high' ? 'border-l-rose-400' :
    drill.priority === 'medium' ? 'border-l-amber-400' :
    'border-l-slate-300'
  return (
    <div className={`border border-slate-200 border-l-4 ${priorityCls} rounded-lg bg-white px-3 py-2`}>
      <p className="text-[11px] font-semibold text-ink-primary">{drill.title}</p>
      <p className="text-[10px] text-ink-secondary mt-0.5">{drill.detail}</p>
    </div>
  )
}

export function PremiumTurnScoreCard({ evaluation }: { evaluation: PremiumEvaluation }) {
  const [showAll, setShowAll] = useState(false)
  const { composite, priorityDimensions, dimensions, reliability, headlineSummary, recommendedDrills } = evaluation

  const displayDimensions = showAll ? dimensions : priorityDimensions

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
      <div className="px-4 py-4 border-b border-slate-100">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ScoreRing score={composite.overall} band={composite.band} />
              <div>
                <p className="text-body-sm font-semibold text-ink-primary">{headlineSummary}</p>
                <ReliabilityBadge level={reliability.level} reason={reliability.reason} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-3 space-y-2">
        {displayDimensions.map((dim) => (
          <DimensionCard key={dim.id} dim={dim} defaultExpanded={priorityDimensions.includes(dim)} />
        ))}
        {!showAll && dimensions.length > priorityDimensions.length ? (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="w-full text-center text-[11px] font-semibold text-primary-700 py-1.5 hover:bg-slate-50 rounded-lg"
          >
            Show all {dimensions.length} dimensions
          </button>
        ) : null}
        {showAll ? (
          <button
            type="button"
            onClick={() => setShowAll(false)}
            className="w-full text-center text-[11px] font-semibold text-ink-secondary py-1.5 hover:bg-slate-50 rounded-lg"
          >
            Show priority only
          </button>
        ) : null}
      </div>

      {recommendedDrills.length > 0 ? (
        <div className="px-4 pb-4 space-y-2 border-t border-slate-100 pt-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-ink-tertiary">How to improve</p>
          {recommendedDrills.slice(0, 4).map((drill, i) => (
            <DrillCard key={`drill-${i}`} drill={drill} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function PremiumSessionScoreCard({ evaluation }: { evaluation: PremiumEvaluation & {
  strongestDimension?: ScoreDimension | null
  weakestDimension?: ScoreDimension | null
  priorityImprovement?: string
  patternNotes?: string[]
}}) {
  const { composite, dimensions, reliability, headlineSummary, strongestDimension, weakestDimension, priorityImprovement, patternNotes, recommendedDrills } = evaluation
  const [showAllDims, setShowAllDims] = useState(false)

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
      <div className="px-5 py-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <ScoreRing score={composite.overall} band={composite.band} />
          <div>
            <p className="text-body-sm font-semibold text-ink-primary">{headlineSummary}</p>
            <ReliabilityBadge level={reliability.level} reason={reliability.reason} />
          </div>
        </div>

        {(strongestDimension || weakestDimension) ? (
          <div className="flex gap-4 mt-3 text-[11px]">
            {strongestDimension?.score != null ? (
              <div className="flex-1 rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-2">
                <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-700">Strongest</p>
                <p className="text-emerald-950 font-semibold mt-0.5">
                  {DIMENSION_LABELS[strongestDimension.id]?.label ?? strongestDimension.id} — {strongestDimension.score}
                </p>
              </div>
            ) : null}
            {weakestDimension?.score != null ? (
              <div className="flex-1 rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-2">
                <p className="text-[9px] font-bold uppercase tracking-wider text-amber-700">Priority</p>
                <p className="text-amber-950 font-semibold mt-0.5">
                  {DIMENSION_LABELS[weakestDimension.id]?.label ?? weakestDimension.id} — {weakestDimension.score}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {priorityImprovement ? (
          <p className="text-body-sm text-ink-primary mt-3 leading-relaxed border-l-2 border-violet-400 pl-2.5">
            {priorityImprovement}
          </p>
        ) : null}

        {patternNotes && patternNotes.length > 0 ? (
          <div className="mt-3 text-[11px] text-ink-secondary space-y-1">
            {patternNotes.map((n, i) => <p key={`pn-${i}`}>· {n}</p>)}
          </div>
        ) : null}
      </div>

      <div className="px-4 py-3 space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-ink-tertiary">Dimensions</p>
        {(showAllDims ? dimensions : dimensions.filter((d) => d.score != null).slice(0, 3)).map((dim) => (
          <DimensionCard key={dim.id} dim={dim} />
        ))}
        {dimensions.length > 3 ? (
          <button
            type="button"
            onClick={() => setShowAllDims((o) => !o)}
            className="w-full text-center text-[11px] font-semibold text-primary-700 py-1.5 hover:bg-slate-50 rounded-lg"
          >
            {showAllDims ? 'Show top 3' : `Show all ${dimensions.length} dimensions`}
          </button>
        ) : null}
      </div>

      {recommendedDrills.length > 0 ? (
        <div className="px-4 pb-4 space-y-2 border-t border-slate-100 pt-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-ink-tertiary">Recommended drills</p>
          {recommendedDrills.slice(0, 5).map((drill, i) => (
            <DrillCard key={`sd-${i}`} drill={drill} />
          ))}
        </div>
      ) : null}
    </div>
  )
}
