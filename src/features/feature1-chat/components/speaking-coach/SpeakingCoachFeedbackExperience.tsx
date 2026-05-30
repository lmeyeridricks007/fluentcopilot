'use client'

import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  Bookmark,
  ChevronDown,
  ChevronUp,
  Copy,
  Mic2,
  RotateCcw,
  Sparkles,
  Target,
  X,
} from 'lucide-react'
import { clsx } from 'clsx'
import type { PronunciationAssessmentApiResponse } from '@/lib/speech/audioPronunciationTypes'
import {
  buildCoachDimensionsFromPronunciation,
  buildImproveNextFromPayload,
  buildSpeakingTopVerdict,
  buildWhatWentWellFromPayload,
  isDutchNonLexemeToken,
  pickShadowPracticeChunk,
  resolveRetryUi,
  wordCoachBand,
  wordScoreGapNote,
  type CoachQualityTag,
} from '@/lib/speaking/pronunciationCoachModel'
import { ListenAndComparePanel, type ListenAndCompareHandlers } from '../ListenAndComparePanel'

const tagLabel: Record<CoachQualityTag, string> = {
  strong: 'Strong',
  steady: 'Steady',
  careful: 'Careful',
  building: 'Building',
  rushed: 'Rushed',
}

function DimensionCard({ row }: { row: ReturnType<typeof buildCoachDimensionsFromPronunciation>[number] }) {
  const pct = row.score == null ? null : Math.max(0, Math.min(100, Math.round(row.score)))
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white/95 px-3.5 py-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide text-ink-tertiary">{row.title}</p>
          <p className="text-caption text-ink-secondary mt-0.5 leading-snug">{row.hint}</p>
        </div>
        <span
          className={clsx(
            'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
            row.tag === 'strong' && 'bg-emerald-100 text-emerald-900',
            row.tag === 'steady' && 'bg-violet-100 text-violet-900',
            row.tag === 'careful' && 'bg-amber-100 text-amber-950',
            row.tag === 'building' && 'bg-slate-100 text-slate-800',
            row.tag === 'rushed' && 'bg-rose-100 text-rose-900'
          )}
        >
          {tagLabel[row.tag]}
        </span>
      </div>
      <div className="mt-2.5 flex items-center gap-2">
        {pct != null ? (
          <>
            <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden" aria-hidden>
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-600"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="tabular-nums text-xs font-bold text-ink-primary w-8 text-right">{pct}</span>
          </>
        ) : (
          <span className="text-xs font-semibold text-ink-tertiary">—</span>
        )}
      </div>
      <div className="mt-2.5 space-y-1.5 border-t border-slate-100/90 pt-2.5">
        <p className="text-[10px] font-bold uppercase tracking-wide text-ink-tertiary">Why this score</p>
        <p className="text-[11px] text-ink-secondary leading-relaxed">{row.why}</p>
        <p className="text-[10px] font-bold uppercase tracking-wide text-primary-800/85 pt-0.5">Try next</p>
        <p className="text-[11px] text-ink-primary font-medium leading-relaxed">{row.tryNext}</p>
      </div>
    </div>
  )
}

function normChipKey(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim()
}

function SectionTitle({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-ink-tertiary mt-6 first:mt-0">
      <span className="text-primary-600">{icon}</span>
      {children}
    </h3>
  )
}

function BulletList({ items, variant }: { items: string[]; variant: 'positive' | 'action' }) {
  return (
    <ul className="mt-2 space-y-2.5">
      {items.map((line, i) => (
        <li
          key={`${i}-${line.slice(0, 24)}`}
          className={clsx(
            'text-body-sm leading-relaxed pl-3 border-l-2',
            variant === 'positive' ? 'border-emerald-400/80 text-ink-primary' : 'border-primary-400/70 text-ink-primary'
          )}
        >
          {line}
        </li>
      ))}
    </ul>
  )
}

export function SpeakingCoachFeedbackExperience({
  layout = 'composer',
  payload,
  spokenTranscript,
  userRecordingUrl,
  compareCoachingText,
  onDismiss,
  onAfterPhraseApplied,
  onApplyPhraseToComposer,
  onSavePhrase,
  onQueuePhraseAssessment,
  onBeginShadowPractice,
}: {
  layout?: 'composer' | 'thread'
  payload: PronunciationAssessmentApiResponse
  spokenTranscript: string
  userRecordingUrl: string | null
  compareCoachingText?: string
  onDismiss: () => void
  onAfterPhraseApplied?: () => void
  onApplyPhraseToComposer?: (phrase: string) => void
  onSavePhrase?: (phrase: string) => void | Promise<void>
  /** Next mic capture scores audio against this reference (subset / phrase). Pass `null` for full-line open scoring. */
  onQueuePhraseAssessment?: (phrase: string | null) => void
  /** Listen → pause → record flow (sticky composer only). */
  onBeginShadowPractice?: (chunk: string) => void
}) {
  const a = payload.assessment!
  const [wordsOpen, setWordsOpen] = useState(false)
  const listenRef = useRef<ListenAndCompareHandlers | null>(null)
  const registerListenHandlers = useCallback((h: ListenAndCompareHandlers | null) => {
    listenRef.current = h
  }, [])

  const compareLine = (compareCoachingText ?? spokenTranscript).trim()
  const verdict = useMemo(() => buildSpeakingTopVerdict(a), [a])
  const scoreGapNote = useMemo(() => wordScoreGapNote(a), [a])
  const dimensions = useMemo(() => buildCoachDimensionsFromPronunciation(a), [a])
  const wentWell = useMemo(() => buildWhatWentWellFromPayload(a, payload.summaryFeedback), [a, payload.summaryFeedback])
  const improve = useMemo(() => buildImproveNextFromPayload(a, payload.recommendedNextStep), [a, payload.recommendedNextStep])

  const retry = useMemo(
    () => resolveRetryUi(a, compareLine, payload.retryHints ?? null),
    [a, compareLine, payload.retryHints]
  )
  const { fullLine, phrase: diffPhrase, word: diffWord, primary: primaryRetry, coachingWhy, coachingRetry } = retry
  const shadowChunk = useMemo(() => pickShadowPracticeChunk(retry), [retry])

  const apply = useCallback(
    (text: string) => {
      const t = text.trim()
      if (!t) return
      onApplyPhraseToComposer?.(t)
    },
    [onApplyPhraseToComposer]
  )

  const applyForRetry = useCallback(
    (text: string) => {
      apply(text)
      onAfterPhraseApplied?.()
    },
    [apply, onAfterPhraseApplied]
  )

  const copyPhrase = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      /* ignore */
    }
  }, [])

  const weakWords = useMemo(() => [...a.words].sort((x, y) => x.accuracyScore - y.accuracyScore).slice(0, 8), [a.words])

  return (
    <div
      className="mb-2 rounded-2xl border border-slate-200/90 bg-gradient-to-b from-surface-elevated via-white to-slate-50/90 shadow-[0_12px_40px_-16px_rgba(15,23,42,0.18)] overflow-x-hidden"
      role="region"
      aria-label="Speaking coach feedback"
    >
      <div className="px-4 pt-4 pb-3 border-b border-slate-100/90 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide text-primary-700 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 shrink-0" aria-hidden />
            How this sounded
          </p>
          <p className="text-lg sm:text-xl font-extrabold text-ink-primary leading-tight mt-1">{verdict.headline}</p>
          <p className="text-caption text-ink-secondary mt-2 leading-relaxed">{verdict.summary}</p>
          {scoreGapNote ? (
            <p className="text-caption text-amber-950/90 mt-2 leading-relaxed rounded-xl border border-amber-200/90 bg-amber-50/80 px-3 py-2">
              {scoreGapNote}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 min-h-touch min-w-touch rounded-xl flex items-center justify-center text-ink-tertiary hover:bg-slate-100/90"
          aria-label="Dismiss coach feedback"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="px-4 pb-2">
        <SectionTitle icon={<Mic2 className="w-3.5 h-3.5" aria-hidden />}>Your dimensions</SectionTitle>
        <p className="text-caption text-ink-tertiary mt-1 leading-snug">
          Each card explains what drove the number and one concrete practice step — still a snapshot, not an exam report.
        </p>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {dimensions.map((d) => (
            <DimensionCard key={d.id} row={d} />
          ))}
        </div>

        <SectionTitle icon={<Sparkles className="w-3.5 h-3.5" aria-hidden />}>What went well</SectionTitle>
        <BulletList items={wentWell} variant="positive" />

        <SectionTitle icon={<Target className="w-3.5 h-3.5" aria-hidden />}>What to improve next</SectionTitle>
        <BulletList items={improve} variant="action" />

        <SectionTitle icon={<Mic2 className="w-3.5 h-3.5" aria-hidden />}>Word-by-word breakdown</SectionTitle>
        <button
          type="button"
          onClick={() => setWordsOpen((o) => !o)}
          className="mt-2 w-full min-h-touch rounded-xl border border-slate-200/90 bg-white/90 px-3 flex items-center justify-between text-body-sm font-semibold text-ink-primary"
          aria-expanded={wordsOpen}
        >
          <span>{wordsOpen ? 'Hide' : 'Show'} word details</span>
          {wordsOpen ? <ChevronUp className="w-4 h-4" aria-hidden /> : <ChevronDown className="w-4 h-4" aria-hidden />}
        </button>
        {wordsOpen ? (
          <ul className="mt-3 space-y-2">
            {weakWords.map((w, i) => {
              const band = wordCoachBand(w)
              return (
                <li
                  key={`${w.word}-${i}`}
                  className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 bg-white/90 px-3 py-2.5"
                  title={w.errorType && w.errorType !== 'None' ? w.errorType : undefined}
                >
                  <span className="font-semibold text-ink-primary">{w.word}</span>
                  <span
                    className={clsx(
                      'text-[10px] font-bold uppercase px-2 py-0.5 rounded-full',
                      band === 'strong' && 'bg-emerald-100 text-emerald-900',
                      band === 'okay' && 'bg-violet-100 text-violet-900',
                      band === 'work' && 'bg-amber-100 text-amber-950'
                    )}
                  >
                    {band === 'strong' ? 'Strong' : band === 'okay' ? 'Okay' : 'Work on this'}
                  </span>
                  <span className="text-caption text-ink-tertiary tabular-nums">{w.accuracyScore}</span>
                </li>
              )
            })}
          </ul>
        ) : null}

        <div className="mt-6">
          <ListenAndComparePanel
            className="!mt-0"
            compareText={compareLine}
            userRecordingUrl={userRecordingUrl}
            visualStyle="premium"
            onRegisterHandlers={registerListenHandlers}
          />
        </div>

        <SectionTitle icon={<RotateCcw className="w-3.5 h-3.5" aria-hidden />}>Retry this now</SectionTitle>
        <p className="text-caption text-ink-secondary mt-1">
          Tap a row to copy that wording into the text box above, then tap the mic to record again.
        </p>
        {coachingWhy ? (
          <p className="mt-2 text-caption text-ink-tertiary leading-snug border-l-2 border-primary-300/80 pl-2.5">
            {coachingWhy}
          </p>
        ) : null}
        <div className="mt-3 grid grid-cols-1 gap-2.5">
          <RetryCta
            primary={primaryRetry === 'full'}
            label="Retry full sentence"
            sub={fullLine.length > 48 ? `${fullLine.slice(0, 46)}…` : fullLine}
            onPress={() => {
              onQueuePhraseAssessment?.(null)
              applyForRetry(fullLine)
            }}
            disabled={!onApplyPhraseToComposer || !fullLine}
          />
          <RetryCta
            primary={primaryRetry === 'phrase'}
            label="Retry difficult phrase"
            sub={diffPhrase ?? '—'}
            onPress={() => {
              if (!diffPhrase) return
              onQueuePhraseAssessment?.(diffPhrase)
              applyForRetry(diffPhrase)
            }}
            disabled={!onApplyPhraseToComposer || !diffPhrase}
          />
          <RetryCta
            primary={primaryRetry === 'word'}
            label="Retry difficult word"
            sub={diffWord ?? '—'}
            onPress={() => {
              if (!diffWord) return
              onQueuePhraseAssessment?.(diffWord)
              applyForRetry(diffWord)
            }}
            disabled={!onApplyPhraseToComposer || !diffWord}
          />
          <RetryCta
            primary={false}
            label="Shadow native version"
            sub="Play reference, then speak with it"
            onPress={() => listenRef.current?.playReference()}
            disabled={!compareLine}
          />
          <RetryCta
            primary={false}
            label="Shadow practice (listen → record)"
            sub="Listen to the clip, short pause, then your mic opens to repeat just that part"
            onPress={() => onBeginShadowPractice?.(shadowChunk)}
            disabled={!onBeginShadowPractice || !shadowChunk.trim()}
          />
        </div>

        <SectionTitle icon={<Bookmark className="w-3.5 h-3.5" aria-hidden />}>Save for later</SectionTitle>
        <p className="text-caption text-ink-secondary mt-1">
          Full lines or content words are best — tiny words like “de” or “is” are usually not worth saving.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {diffWord && !isDutchNonLexemeToken(diffWord) ? (
            <SaveChip text={diffWord} onSave={onSavePhrase} onCopy={() => void copyPhrase(diffWord)} disabled={!onSavePhrase} />
          ) : null}
          {diffPhrase && diffPhrase !== diffWord ? (
            <SaveChip text={diffPhrase} onSave={onSavePhrase} onCopy={() => void copyPhrase(diffPhrase)} disabled={!onSavePhrase} />
          ) : null}
          {coachingRetry &&
          coachingRetry !== diffWord &&
          coachingRetry !== diffPhrase &&
          normChipKey(coachingRetry) !== normChipKey(fullLine) ? (
            <SaveChip
              text={coachingRetry}
              onSave={onSavePhrase}
              onCopy={() => void copyPhrase(coachingRetry)}
              disabled={!onSavePhrase}
            />
          ) : null}
          <SaveChip text={fullLine} onSave={onSavePhrase} onCopy={() => void copyPhrase(fullLine)} disabled={!onSavePhrase} />
        </div>

        {payload.caveats.length > 0 ? (
          <p className="mt-4 text-caption text-amber-950/90 bg-amber-50/90 border border-amber-200/80 rounded-xl px-3 py-2 leading-snug">
            {payload.caveats.join(' ')}
          </p>
        ) : null}
      </div>

      <div
        className={clsx(
          'px-4 py-3 border-t border-slate-100/90',
          layout === 'composer'
            ? 'sticky bottom-0 z-[1] pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-white via-white to-transparent'
            : 'pb-1 bg-white/95'
        )}
      >
        <button
          type="button"
            onClick={() => {
            const line =
              primaryRetry === 'word' ? diffWord : primaryRetry === 'phrase' ? diffPhrase : fullLine
            if (!line?.trim()) return
            onQueuePhraseAssessment?.(primaryRetry === 'full' ? null : line)
            applyForRetry(line)
          }}
          disabled={!onApplyPhraseToComposer}
          className={clsx(
            'w-full min-h-touch rounded-2xl text-body-sm font-extrabold shadow-md transition-colors',
            onApplyPhraseToComposer
              ? 'bg-primary-600 text-white hover:bg-primary-700 active:scale-[0.99]'
              : 'bg-slate-200 text-slate-500 cursor-not-allowed'
          )}
        >
          {primaryRetry === 'word' ? 'Practice this word in composer' : primaryRetry === 'phrase' ? 'Practice phrase in composer' : 'Practice full line in composer'}
        </button>
      </div>
    </div>
  )
}

function RetryCta({
  primary,
  label,
  sub,
  onPress,
  disabled,
}: {
  primary: boolean
  label: string
  sub: string
  onPress: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={disabled}
      className={clsx(
        'min-h-touch w-full rounded-2xl border px-4 py-3 text-left transition-colors',
        primary
          ? 'border-primary-500/60 bg-primary-50/90 ring-2 ring-primary-500/25'
          : 'border-slate-200/90 bg-white/95 hover:bg-slate-50/90',
        disabled && 'opacity-40 pointer-events-none'
      )}
    >
      <p className="text-body-sm font-bold text-ink-primary">{label}</p>
      <p className="text-caption text-ink-secondary mt-0.5 line-clamp-2">{sub}</p>
    </button>
  )
}

function SaveChip({
  text,
  onSave,
  onCopy,
  disabled,
}: {
  text: string
  onSave?: (t: string) => void | Promise<void>
  onCopy: () => void
  disabled?: boolean
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white pl-3 pr-1 py-1 max-w-full">
      <span className="text-caption font-medium text-ink-primary truncate">{text}</span>
      <button
        type="button"
        onClick={() => void onSave?.(text)}
        disabled={disabled}
        className="min-h-touch min-w-touch rounded-full flex items-center justify-center text-primary-700 hover:bg-primary-50 disabled:opacity-30"
        aria-label={`Save ${text}`}
        title="Save to library"
      >
        <Bookmark className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={onCopy}
        className="min-h-touch min-w-touch rounded-full flex items-center justify-center text-ink-tertiary hover:bg-slate-100"
        aria-label="Copy"
        title="Copy"
      >
        <Copy className="w-4 h-4" />
      </button>
    </div>
  )
}
