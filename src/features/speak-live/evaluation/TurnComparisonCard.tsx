'use client'

import { useMemo, useState, useCallback } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { ImprovementHighlightList } from './ImprovementHighlightList'
import { LearnerAudioPlayer } from './LearnerAudioPlayer'
import { ReferenceAudioPlayer } from './ReferenceAudioPlayer'
import { SaveForLaterActions, type SaveActionItem } from './SaveForLaterActions'
import { LearnerFacingMetricStrip } from './LearnerFacingMetricStrip'
import { LocalDutchPhrasingComparison } from './LocalDutchPhrasingComparison'
import { WordByWordBreakdown, type PhraseGroup } from './WordByWordBreakdown'
import { TranscriptCoachingSection } from './TranscriptCoachingSection'
import {
  detectTurnSignals,
  mapWordAssessments,
  mapPhraseGroups,
  extractTranscriptCoaching,
  type BackendPronunciationIssue,
  type BackendFluencyIssue,
  type BackendPremiumTurnEvaluation,
} from './speechEvaluationBridge'
import { buildFallbackDutchLikenessNarrative, buildLearnerFacingTurnMetrics } from './evaluationHumanCopy'
import { clipStatus, num, strArr } from './evaluationUtils'

export type TurnComparisonCardProps = {
  /** Stable DOM id for a11y / analytics */
  turnId: string
  turnIndex: number
  defaultExpanded?: boolean
  transcriptOriginal: string
  transcriptNormalized: string
  referenceKind: 'reference_pronunciation' | 'more_natural_dutch'
  referenceSentence: string
  referenceSentenceReason: string
  learnerStored: string
  refStored: string
  learnerResolved: string | null
  refResolved: string | null
  batchMediaLoading: boolean
  audioScores: Record<string, unknown>
  languageScores: Record<string, unknown>
  combinedScores: Record<string, unknown>
  goalFit: Record<string, unknown>
  signalSources: Record<string, unknown>
  quickLabels: Record<string, string> | null | undefined
  /** Coach sentence: how Dutch / natural this turn sounded (no digits). */
  dutchLikenessNarrative: string
  hasLearnerAudio: boolean
  /** Server notice when no clip was assessed (transcript-only path). */
  voiceAnalysisUnavailableMessage?: string | null
  /** Low-scoring words from Azure (audio turns only). */
  pronunciationIssues?: BackendPronunciationIssue[]
  /** Pause / rush signals from word timestamps — only with audio. */
  fluencyIssues?: BackendFluencyIssue[]
  /** Pre-computed phrase groups for rhythm display. */
  phraseGroups?: PhraseGroup[]
  /** Premium 6-dimension evaluation from backend scoring engine. */
  premiumEvaluation?: BackendPremiumTurnEvaluation | null
  turn: Record<string, unknown>
  improvementActions: SaveActionItem[]
  onSave: (action: SaveActionItem) => void
  savingKey: string | null
}

function weakWordSet(issues: Array<{ word: string; score: number }> | undefined): Set<string> {
  const s = new Set<string>()
  for (const x of issues ?? []) {
    const w = x.word?.trim()
    if (w) s.add(w.toLowerCase())
  }
  return s
}

function TranscriptWithPronunciationHints(props: { text: string; weakWords: Set<string> }) {
  const parts = props.text.split(/(\s+)/)
  return (
    <p className="text-body-sm text-ink-primary mt-1 leading-relaxed">
      {parts.map((part, i) => {
        if (/^\s+$/.test(part)) return <span key={`w-${i}`}>{part}</span>
        const stripped = part.replace(/^["'«»(]+|["'»).,!?…;:]+$/g, '')
        const core = stripped || part
        const mark = props.weakWords.has(core.toLowerCase())
        return (
          <span key={`w-${i}`} className={mark ? 'rounded bg-amber-100/90 px-0.5 text-amber-950 font-medium' : undefined}>
            {part}
            {mark ? <span className="text-amber-700"> (⚠️)</span> : null}
          </span>
        )
      })}
    </p>
  )
}

/**
 * Per-turn A/B comparison: learner lane vs reference lane, scores, feedback, saves.
 * Mobile-first: stacked columns; optional compact summary.
 */
export function TurnComparisonCard({
  turnId,
  turnIndex,
  defaultExpanded = false,
  transcriptOriginal,
  transcriptNormalized,
  referenceKind,
  referenceSentence,
  referenceSentenceReason,
  learnerStored,
  refStored,
  learnerResolved,
  refResolved,
  batchMediaLoading,
  audioScores,
  languageScores,
  combinedScores,
  goalFit,
  signalSources,
  quickLabels,
  dutchLikenessNarrative,
  hasLearnerAudio,
  voiceAnalysisUnavailableMessage,
  pronunciationIssues,
  fluencyIssues: fluencyIssuesProp,
  phraseGroups: phraseGroupsProp,
  premiumEvaluation,
  turn,
  improvementActions,
  onSave,
  savingKey,
}: TurnComparisonCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  const learnerStatus = useMemo(
    () => clipStatus(learnerStored, learnerResolved, batchMediaLoading),
    [learnerStored, learnerResolved, batchMediaLoading]
  )
  const referenceStatus = useMemo(
    () => clipStatus(refStored, refResolved, batchMediaLoading),
    [refStored, refResolved, batchMediaLoading]
  )

  const strengths = strArr(turn.keyStrengths)
  const problems = strArr(turn.keyProblems)
  const audioFindings = strArr(turn.audioFindings)
  const focusWords = strArr(turn.focusWords)
  const chunking = String(turn.chunkingRhythmSuggestion ?? '')

  const dutchLine =
    dutchLikenessNarrative.trim() ||
    buildFallbackDutchLikenessNarrative({
      clarity: num(combinedScores.clarityScore),
      dutchLikeness: num(combinedScores.dutchLikenessScore),
      rhythm: num(audioScores.rhythm),
      naturalness: num(languageScores.naturalness),
      scenarioFit: num(goalFit.alignmentScore),
      hasLearnerAudio,
    })

  const facingMetrics = buildLearnerFacingTurnMetrics({
    clarity: num(combinedScores.clarityScore),
    dutchLikeness: num(combinedScores.dutchLikenessScore),
    rhythm: num(audioScores.rhythm),
    pronunciation: num(audioScores.pronunciation),
    scenarioFit: num(goalFit.alignmentScore),
    audioMetricsAvailable: hasLearnerAudio,
  })

  const weakWords = weakWordSet(pronunciationIssues)
  const feedbackItems = Array.isArray(turn.feedbackItems) ? (turn.feedbackItems as Record<string, unknown>[]) : []

  const pronIssues: BackendPronunciationIssue[] = useMemo(() => {
    if (!pronunciationIssues?.length) return []
    return pronunciationIssues
  }, [pronunciationIssues])

  const fluencyIssuesArr: BackendFluencyIssue[] = useMemo(() => {
    if (fluencyIssuesProp && fluencyIssuesProp.length > 0) return fluencyIssuesProp
    const raw = (turn as { fluencyIssues?: BackendFluencyIssue[] }).fluencyIssues
    return Array.isArray(raw) ? raw : []
  }, [fluencyIssuesProp, turn])

  const premiumEv = useMemo((): BackendPremiumTurnEvaluation | null => {
    if (premiumEvaluation) return premiumEvaluation
    const raw = (turn as { premiumEvaluation?: BackendPremiumTurnEvaluation }).premiumEvaluation
    return raw ?? null
  }, [premiumEvaluation, turn])

  const signals = useMemo(() => detectTurnSignals({
    audioMetricsSource: String(signalSources.audioMetrics ?? ''),
    pronunciationIssues: pronIssues,
    fluencyIssues: fluencyIssuesArr,
    premiumEvaluation: premiumEv,
  }), [signalSources, pronIssues, fluencyIssuesArr, premiumEv])

  const wordAssessments = useMemo(
    () => mapWordAssessments(pronIssues, signals),
    [pronIssues, signals],
  )

  const phraseGroups = useMemo(
    () => phraseGroupsProp?.length
      ? phraseGroupsProp
      : mapPhraseGroups(fluencyIssuesArr, wordAssessments, signals),
    [phraseGroupsProp, fluencyIssuesArr, wordAssessments, signals],
  )

  const transcriptCoaching = useMemo(
    () => extractTranscriptCoaching(premiumEv),
    [premiumEv],
  )

  const handleSaveWord = useCallback((word: string) => {
    onSave({
      type: 'save_pronunciation_word',
      title: `Practice "${word}"`,
      detail: `Isolated pronunciation drill for "${word}" from this turn.`,
      saveKey: `pron-word-${turnId}-${word}`,
      tagCategory: 'pronunciation',
      suggestedTrainingMode: 'isolated_word',
    })
  }, [onSave, turnId])

  const handleSavePhrase = useCallback((phrase: string) => {
    onSave({
      type: 'save_phrase',
      title: `Practice phrase: "${phrase}"`,
      detail: `Rhythm and chunking drill for "${phrase}" from this turn.`,
      saveKey: `phrase-${turnId}-${phrase.slice(0, 20)}`,
      tagCategory: 'rhythm',
      suggestedTrainingMode: 'chunk_practice',
    })
  }, [onSave, turnId])

  const whyBetter =
    referenceSentenceReason.trim() ||
    String(goalFit.summary ?? '').trim() ||
    (hasLearnerAudio
      ? 'Compare your recording with the reference audio — notice stress, endings, and where native speakers breathe between chunks.'
      : 'Compare your wording with the more natural Dutch version — notice word order, phrasing, and register.')

  const langEv =
    turn.languageEvaluation && typeof turn.languageEvaluation === 'object'
      ? (turn.languageEvaluation as Record<string, unknown>)
      : null
  const deepEv =
    turn.deepEvaluation && typeof turn.deepEvaluation === 'object'
      ? (turn.deepEvaluation as Record<string, unknown>)
      : null

  return (
    <article
      id={turnId ? `eval-turn-${turnId}` : undefined}
      className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden"
    >
      <div className="px-4 py-4 border-b border-slate-200">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">Turn {turnIndex + 1}</p>
            <h3 className="text-body-sm font-semibold text-ink-primary mt-1 leading-snug">Your sentence</h3>
            {hasLearnerAudio && weakWords.size > 0 ? (
              <TranscriptWithPronunciationHints text={transcriptOriginal} weakWords={weakWords} />
            ) : (
              <p className="text-body-sm text-ink-primary mt-1 leading-relaxed">{transcriptOriginal}</p>
            )}
            {transcriptNormalized !== transcriptOriginal ? (
              <p className="text-[11px] text-ink-tertiary mt-1">Heard as: {transcriptNormalized}</p>
            ) : null}

            {!hasLearnerAudio && voiceAnalysisUnavailableMessage?.trim() ? (
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-700">Voice analysis</p>
                <p className="text-body-sm text-ink-primary mt-1.5 leading-relaxed">{voiceAnalysisUnavailableMessage.trim()}</p>
              </div>
            ) : null}

            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-900">
                {hasLearnerAudio ? 'How Dutch did you sound here?' : 'How natural is this Dutch (from text)?'}
              </p>
              <p className="text-body-sm text-ink-primary mt-1.5 leading-relaxed">{dutchLine}</p>
              {hasLearnerAudio && focusWords.length > 0 ? (
                <p className="text-[11px] text-amber-900 mt-2 leading-snug">
                  <span className="font-semibold text-amber-950">Words that stood out:</span> {focusWords.join(' · ')}
                </p>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="shrink-0 flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] font-semibold text-ink-secondary hover:bg-slate-100"
            aria-expanded={expanded}
          >
            {expanded ? (
              <>
                Compact <ChevronUp className="h-3.5 w-3.5" aria-hidden />
              </>
            ) : (
              <>
                Details <ChevronDown className="h-3.5 w-3.5" aria-hidden />
              </>
            )}
          </button>
        </div>

        <div className="mt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-tertiary mb-2">At a glance</p>
          <LearnerFacingMetricStrip metrics={facingMetrics} hideScores={!expanded} />
        </div>

        {quickLabels?.naturalness ? (
          <p className="text-[11px] text-ink-secondary leading-relaxed mt-2">
            {hasLearnerAudio ? (
              <>
                <span className="text-violet-800 font-medium">Pronunciation (audio):</span> {quickLabels?.pronunciation ?? '—'}
                <span className="text-ink-tertiary"> · </span>
                <span className="text-violet-800 font-medium">Rhythm (audio):</span> {quickLabels?.rhythm ?? '—'}
                <span className="text-ink-tertiary"> · </span>
              </>
            ) : null}
            <span className="text-amber-800 font-medium">Naturalness (transcript):</span> {quickLabels?.naturalness ?? '—'}
          </p>
        ) : null}
      </div>

      {expanded ? (
        <div className="px-4 py-4 space-y-5">
          {signals.hasAudio ? (
            <WordByWordBreakdown
              wordAssessments={wordAssessments}
              phraseGroups={phraseGroups}
              fluencyIssues={fluencyIssuesArr}
              learnerAudioSrc={learnerResolved}
              referenceAudioSrc={refResolved}
              transcript={transcriptOriginal}
              hasAudio
              alignmentQuality={signals.alignmentQuality}
              onSaveWord={signals.hasAzureWordScores ? handleSaveWord : undefined}
              onSavePhrase={signals.hasFluencyTimingData ? handleSavePhrase : undefined}
            />
          ) : null}

          <TranscriptCoachingSection coaching={transcriptCoaching} hasAudio={signals.hasAudio} />

          <LocalDutchPhrasingComparison youSaid={transcriptOriginal} localWouldSay={referenceSentence} whyBetter={whyBetter} />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <LearnerAudioPlayer src={learnerResolved} status={learnerStatus} />
            <ReferenceAudioPlayer
              src={refResolved}
              status={referenceStatus}
              variant={referenceKind}
              sentenceText={referenceSentence}
              reasonText={referenceSentenceReason}
            />
          </div>

          <p className="text-[10px] text-ink-tertiary leading-relaxed">
            Signals — audio: {String(signalSources.audioMetrics ?? '—')} · coach: {String(signalSources.languageCoach ?? '—')}{' '}
            · scene: {String(signalSources.scenarioContext ?? '—')}
          </p>

          {feedbackItems.length > 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-800">Evidence-based feedback</p>
              <ul className="space-y-2 text-[11px] text-ink-secondary list-none">
                {feedbackItems.slice(0, 12).map((it, idx) => {
                  const type = String(it.type ?? '')
                  const source = String(it.source ?? '')
                  const issue = String(it.issue ?? '')
                  const fix = String(it.fix ?? '')
                  const expl = String(it.explanation ?? '')
                  const ev = it.evidence && typeof it.evidence === 'object' ? (it.evidence as Record<string, unknown>) : {}
                  const snippet = String(ev.transcriptSnippet ?? '').trim()
                  return (
                    <li key={`fb-${idx}`} className="border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                      <p className="font-semibold text-ink-primary">
                        {type} <span className="text-ink-tertiary font-normal">({source})</span>
                      </p>
                      {snippet ? (
                        <p className="mt-0.5 text-ink-tertiary">
                          <span className="font-medium text-ink-secondary">You said:</span> “{snippet.length > 220 ? `${snippet.slice(0, 220)}…` : snippet}”
                        </p>
                      ) : null}
                      <p className="mt-1">
                        <span className="font-medium text-rose-900">Issue:</span> {issue}
                      </p>
                      <p className="mt-0.5">
                        <span className="font-medium text-emerald-900">Fix:</span> {fix}
                      </p>
                      {expl ? (
                        <p className="mt-0.5 text-ink-tertiary">
                          <span className="font-medium text-ink-secondary">Why it matters:</span> {expl}
                        </p>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : null}

          {langEv ? (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-3 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-900">
                Grammar & sentence construction (transcript — not audio)
              </p>
              <p className="text-[11px] text-ink-secondary tabular-nums">
                Grammar {num(langEv.grammarScore)} · Construction {num(langEv.sentenceConstructionScore)} · Naturalness{' '}
                {num(langEv.naturalnessScore)} · Level fit {num(langEv.levelFitScore)}
              </p>
              {String(langEv.learnerFacingGrammarLine ?? '').trim() ? (
                <p className="text-body-sm font-medium text-emerald-950 leading-relaxed border-l-2 border-emerald-400 pl-2">
                  {String(langEv.learnerFacingGrammarLine)}
                </p>
              ) : null}
              {String(langEv.levelBasedComment ?? '').trim() ? (
                <p className="text-body-sm text-ink-primary leading-relaxed">{String(langEv.levelBasedComment)}</p>
              ) : null}
              {String(langEv.improvedVersion ?? '').trim() ? (
                <div className="text-[11px] text-ink-secondary space-y-1">
                  <p>
                    <span className="font-semibold text-ink-primary">A Dutch speaker would more naturally say:</span>{' '}
                    {String(langEv.improvedVersion)}
                  </p>
                  {String(langEv.whyThisIsMoreNatural ?? '').trim() || String(langEv.whyItIsBetter ?? '').trim() ? (
                    <p>
                      <span className="font-semibold text-ink-primary">Why this is more natural:</span>{' '}
                      {String(langEv.whyThisIsMoreNatural ?? langEv.whyItIsBetter)}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {String(langEv.nextPatternToPractice ?? '').trim() ? (
                <p className="text-[11px] text-violet-950 bg-violet-50/80 rounded-lg px-2 py-1.5 border border-violet-100">
                  <span className="font-semibold">Next pattern to practice:</span> {String(langEv.nextPatternToPractice)}
                </p>
              ) : null}
              {strArr(langEv.whatWorked).length > 0 ? (
                <p className="text-[11px] text-emerald-950">
                  <span className="font-semibold">What worked:</span> {strArr(langEv.whatWorked).join(' · ')}
                </p>
              ) : null}
              {strArr(langEv.grammarIssues).length > 0 ? (
                <p className="text-[11px] text-rose-900">
                  <span className="font-semibold">Grammar:</span> {strArr(langEv.grammarIssues).join(' · ')}
                </p>
              ) : null}
              {strArr(langEv.sentenceStructureIssues).length > 0 ? (
                <p className="text-[11px] text-amber-950">
                  <span className="font-semibold">Structure:</span> {strArr(langEv.sentenceStructureIssues).join(' · ')}
                </p>
              ) : null}
              {strArr(langEv.wordOrderNotes).length > 0 ? (
                <p className="text-[11px] text-violet-950">
                  <span className="font-semibold">Word order:</span> {strArr(langEv.wordOrderNotes).join(' · ')}
                </p>
              ) : null}
              {strArr(langEv.questionFormNotes).length > 0 ? (
                <p className="text-[11px] text-violet-900">
                  <span className="font-semibold">Questions:</span> {strArr(langEv.questionFormNotes).join(' · ')}
                </p>
              ) : null}
              {strArr(langEv.verbTenseNotes).length > 0 ? (
                <p className="text-[11px] text-amber-950">
                  <span className="font-semibold">Verb / tense:</span> {strArr(langEv.verbTenseNotes).join(' · ')}
                </p>
              ) : null}
              {strArr(langEv.agreementNotes).length > 0 ? (
                <p className="text-[11px] text-rose-900">
                  <span className="font-semibold">Agreement:</span> {strArr(langEv.agreementNotes).join(' · ')}
                </p>
              ) : null}
              {String(langEv.nextStepBeyondLevel ?? '').trim() ? (
                <p className="text-[11px] text-ink-primary leading-relaxed border-t border-emerald-200/80 pt-2 mt-1">
                  <span className="font-semibold text-emerald-950">Beyond your level:</span> {String(langEv.nextStepBeyondLevel)}
                </p>
              ) : null}
            </div>
          ) : null}

          {deepEv && expanded && hasLearnerAudio ? (
            <div className="rounded-xl border border-violet-100 bg-violet-50/50 px-3 py-3 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-violet-900">Post-session deep lens (audio)</p>
              {strArr(deepEv.pronunciationFeedback).length > 0 ? (
                <ul className="text-[11px] text-sky-950 list-disc pl-4 space-y-0.5">
                  {strArr(deepEv.pronunciationFeedback).map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              ) : null}
              {strArr(deepEv.rhythmFeedback).length > 0 ? (
                <ul className="text-[11px] text-violet-950 list-disc pl-4 space-y-0.5">
                  {strArr(deepEv.rhythmFeedback).map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <ImprovementHighlightList
            keyStrengths={strengths}
            keyProblems={problems}
            audioFindings={audioFindings}
            chunkingRhythmSuggestion={chunking}
            focusWords={focusWords}
            audioMetricsAvailable={hasLearnerAudio}
            referenceSentenceReason={referenceSentenceReason}
          />

          <SaveForLaterActions actions={improvementActions} savingKey={savingKey} onSave={onSave} />
        </div>
      ) : (
        <div className="px-4 py-3 bg-slate-50">
          <p className="text-[11px] text-ink-secondary text-center">Open details to compare audio, coaching, and saves.</p>
        </div>
      )}
    </article>
  )
}
