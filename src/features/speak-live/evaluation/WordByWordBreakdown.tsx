'use client'

import { useMemo, useState, useCallback, useRef } from 'react'
import { Volume2, BookmarkPlus, X, Play, ArrowLeftRight } from 'lucide-react'

// ─── Data types (matching backend PronunciationIssue + word assessments) ─

export type WordAssessment = {
  word: string
  score: number
  errorType?: string
  startMs?: number | null
  endMs?: number | null
  issue?: string
  fix?: string
}

export type PhraseGroup = {
  words: string[]
  startIndex: number
  endIndex: number
  issue?: string
  fix?: string
  pauseMs?: number | null
}

type BandId = 'strong' | 'building' | 'weak' | 'unavailable'

function wordBand(score: number | null): BandId {
  if (score == null) return 'unavailable'
  if (score >= 85) return 'strong'
  if (score >= 65) return 'building'
  return 'weak'
}

const BAND_STYLES: Record<BandId, { chip: string; ring: string; label: string; dotColor: string }> = {
  strong: {
    chip: 'bg-emerald-50 border-emerald-300 text-emerald-950 hover:bg-emerald-100',
    ring: 'ring-emerald-400',
    label: 'Strong',
    dotColor: 'bg-emerald-500',
  },
  building: {
    chip: 'bg-amber-50 border-amber-300 text-amber-950 hover:bg-amber-100',
    ring: 'ring-amber-400',
    label: 'Almost there',
    dotColor: 'bg-amber-500',
  },
  weak: {
    chip: 'bg-rose-50 border-rose-300 text-rose-950 hover:bg-rose-100',
    ring: 'ring-rose-400',
    label: 'Needs work',
    dotColor: 'bg-rose-500',
  },
  unavailable: {
    chip: 'bg-slate-50 border-slate-200 text-slate-500',
    ring: 'ring-slate-300',
    label: 'Not scored',
    dotColor: 'bg-slate-400',
  },
}

// ─── Word chip ──────────────────────────────────────────────────────────

function WordChip({
  word,
  score,
  band,
  isSelected,
  onTap,
}: {
  word: string
  score: number | null
  band: BandId
  isSelected: boolean
  onTap: () => void
}) {
  const styles = BAND_STYLES[band]
  return (
    <button
      type="button"
      onClick={onTap}
      className={[
        'relative inline-flex flex-col items-center rounded-xl border px-3 py-2 min-w-[2.75rem] min-h-touch',
        'transition-all duration-150 active:scale-95',
        styles.chip,
        isSelected ? `ring-2 ${styles.ring} shadow-md` : 'shadow-sm',
      ].join(' ')}
      aria-label={`${word}: ${score != null ? score : 'no score'}`}
    >
      <span className="text-[13px] font-semibold leading-tight">{word}</span>
      {score != null ? (
        <span className="text-[9px] font-bold tabular-nums mt-0.5 opacity-70">{Math.round(score)}</span>
      ) : null}
      <span className={`absolute -top-1 -right-1 h-2 w-2 rounded-full ${styles.dotColor}`} />
    </button>
  )
}

// ─── Phrase chip ────────────────────────────────────────────────────────

function PhraseChip({
  phrase,
  hasIssue,
  isSelected,
  onTap,
}: {
  phrase: string
  hasIssue: boolean
  isSelected: boolean
  onTap: () => void
}) {
  return (
    <button
      type="button"
      onClick={onTap}
      className={[
        'inline-flex items-center rounded-xl border px-3 py-2.5 min-h-touch',
        'transition-all duration-150 active:scale-95',
        hasIssue
          ? 'bg-violet-50 border-violet-300 text-violet-950 hover:bg-violet-100'
          : 'bg-slate-50 border-slate-200 text-ink-primary hover:bg-slate-100',
        isSelected ? 'ring-2 ring-violet-400 shadow-md' : 'shadow-sm',
      ].join(' ')}
    >
      <span className="text-[12px] font-medium leading-snug">{phrase}</span>
      {hasIssue ? (
        <span className="ml-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-violet-200 text-[9px] font-bold text-violet-800">!</span>
      ) : null}
    </button>
  )
}

// ─── Word detail sheet ──────────────────────────────────────────────────

function WordDetailSheet({
  word,
  onClose,
  learnerAudioSrc,
  referenceAudioSrc,
  onSaveForPractice,
}: {
  word: WordAssessment
  onClose: () => void
  learnerAudioSrc: string | null
  referenceAudioSrc: string | null
  onSaveForPractice?: (word: string) => void
}) {
  const learnerRef = useRef<HTMLAudioElement>(null)
  const referenceRef = useRef<HTMLAudioElement>(null)
  const band = wordBand(word.score)
  const styles = BAND_STYLES[band]

  const playLearner = useCallback(() => {
    const el = learnerRef.current
    if (!el) return
    el.pause()
    el.currentTime = 0
    void el.play().catch(() => {})
  }, [])

  const playReference = useCallback(() => {
    const el = referenceRef.current
    if (!el) return
    el.pause()
    el.currentTime = 0
    void el.play().catch(() => {})
  }, [])

  const issueText = word.issue || (word.errorType
    ? `This word was marked as "${word.errorType.toLowerCase()}" — the sound placement may need adjustment.`
    : `Scored ${Math.round(word.score)} / 100 — the vowel or consonant placement sounds a bit different from native pronunciation.`)
  const fixText = word.fix || `Listen to the reference, then say "${word.word}" slowly 3 times. Focus on vowel length.`

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border-2 ${styles.chip}`}>
              <span className="text-xl font-bold">{word.word}</span>
            </div>
            <div>
              <p className="text-body-sm font-bold text-ink-primary">{word.word}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`h-2 w-2 rounded-full ${styles.dotColor}`} />
                <span className="text-[11px] font-semibold text-ink-secondary">{styles.label} · {Math.round(word.score)}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200"
            aria-label="Close"
          >
            <X className="h-4 w-4 text-ink-secondary" />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4">
          <div className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-rose-800 mb-1">What happened</p>
            <p className="text-[12px] text-rose-950 leading-relaxed">{issueText}</p>
          </div>

          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-800 mb-1">How to fix</p>
            <p className="text-[12px] text-emerald-950 leading-relaxed">{fixText}</p>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-ink-tertiary">Compare</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={playLearner}
                disabled={!learnerAudioSrc}
                className="flex items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-3 min-h-touch text-[11px] font-semibold text-violet-900 hover:bg-violet-100 disabled:opacity-40 active:scale-[0.98]"
              >
                <Volume2 className="h-4 w-4" />
                Your audio
              </button>
              <button
                type="button"
                onClick={playReference}
                disabled={!referenceAudioSrc}
                className="flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 min-h-touch text-[11px] font-semibold text-emerald-900 hover:bg-emerald-100 disabled:opacity-40 active:scale-[0.98]"
              >
                <Volume2 className="h-4 w-4" />
                Reference
              </button>
            </div>
            {learnerAudioSrc ? <audio ref={learnerRef} src={learnerAudioSrc} preload="metadata" className="hidden" /> : null}
            {referenceAudioSrc ? <audio ref={referenceRef} src={referenceAudioSrc} preload="metadata" className="hidden" /> : null}
          </div>

          {onSaveForPractice ? (
            <button
              type="button"
              onClick={() => onSaveForPractice(word.word)}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-3 min-h-touch text-[11px] font-bold text-violet-900 hover:bg-violet-100 active:scale-[0.98]"
            >
              <BookmarkPlus className="h-4 w-4" />
              Save "{word.word}" for practice
            </button>
          ) : null}

          <p className="text-[9px] text-ink-tertiary text-center">
            Based on your recording · Score out of 100
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Phrase detail sheet ────────────────────────────────────────────────

function PhraseDetailSheet({
  phrase,
  onClose,
  learnerAudioSrc,
  referenceAudioSrc,
  onSaveForPractice,
}: {
  phrase: PhraseGroup
  onClose: () => void
  learnerAudioSrc: string | null
  referenceAudioSrc: string | null
  onSaveForPractice?: (phrase: string) => void
}) {
  const learnerRef = useRef<HTMLAudioElement>(null)
  const referenceRef = useRef<HTMLAudioElement>(null)
  const text = phrase.words.join(' ')

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <p className="text-body-sm font-bold text-ink-primary">Phrase: "{text}"</p>
            {phrase.pauseMs != null ? (
              <p className="text-[11px] text-violet-700 mt-0.5">{Math.round(phrase.pauseMs)} ms pause detected</p>
            ) : null}
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200" aria-label="Close">
            <X className="h-4 w-4 text-ink-secondary" />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {phrase.issue ? (
            <div className="rounded-xl bg-violet-50 border border-violet-200 px-3.5 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-violet-800 mb-1">What happened</p>
              <p className="text-[12px] text-violet-950 leading-relaxed">{phrase.issue}</p>
            </div>
          ) : null}
          {phrase.fix ? (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-800 mb-1">How to fix</p>
              <p className="text-[12px] text-emerald-950 leading-relaxed">{phrase.fix}</p>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => { learnerRef.current?.pause(); if (learnerRef.current) { learnerRef.current.currentTime = 0; void learnerRef.current.play().catch(() => {}) } }} disabled={!learnerAudioSrc}
              className="flex items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-3 min-h-touch text-[11px] font-semibold text-violet-900 hover:bg-violet-100 disabled:opacity-40 active:scale-[0.98]">
              <Volume2 className="h-4 w-4" />Your audio
            </button>
            <button type="button" onClick={() => { referenceRef.current?.pause(); if (referenceRef.current) { referenceRef.current.currentTime = 0; void referenceRef.current.play().catch(() => {}) } }} disabled={!referenceAudioSrc}
              className="flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 min-h-touch text-[11px] font-semibold text-emerald-900 hover:bg-emerald-100 disabled:opacity-40 active:scale-[0.98]">
              <Volume2 className="h-4 w-4" />Reference
            </button>
          </div>
          {learnerAudioSrc ? <audio ref={learnerRef} src={learnerAudioSrc} preload="metadata" className="hidden" /> : null}
          {referenceAudioSrc ? <audio ref={referenceRef} src={referenceAudioSrc} preload="metadata" className="hidden" /> : null}

          {onSaveForPractice ? (
            <button type="button" onClick={() => onSaveForPractice(text)}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-3 min-h-touch text-[11px] font-bold text-violet-900 hover:bg-violet-100 active:scale-[0.98]">
              <BookmarkPlus className="h-4 w-4" />Save phrase for practice
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

// ─── Compare mode ───────────────────────────────────────────────────────

function CompareMode({
  learnerAudioSrc,
  referenceAudioSrc,
  transcript,
}: {
  learnerAudioSrc: string | null
  referenceAudioSrc: string | null
  transcript: string
}) {
  const learnerRef = useRef<HTMLAudioElement>(null)
  const referenceRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState<'none' | 'learner' | 'reference'>('none')

  const play = useCallback((which: 'learner' | 'reference') => {
    const el = which === 'learner' ? learnerRef.current : referenceRef.current
    const other = which === 'learner' ? referenceRef.current : learnerRef.current
    other?.pause()
    if (!el) return
    el.pause()
    el.currentTime = 0
    setPlaying(which)
    void el.play().catch(() => {})
    el.onended = () => setPlaying('none')
  }, [])

  const playAB = useCallback(() => {
    const l = learnerRef.current
    const r = referenceRef.current
    if (!l || !r) return
    r.pause()
    l.pause()
    l.currentTime = 0
    setPlaying('learner')
    void l.play().catch(() => {})
    l.onended = () => {
      r.currentTime = 0
      setPlaying('reference')
      void r.play().catch(() => {})
      r.onended = () => setPlaying('none')
    }
  }, [])

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-ink-tertiary">Compare your delivery</p>
      <p className="text-[12px] text-ink-primary font-medium leading-relaxed border-l-2 border-slate-300 pl-2.5">
        {transcript}
      </p>
      <div className="grid grid-cols-3 gap-2">
        <button type="button" onClick={() => play('learner')} disabled={!learnerAudioSrc}
          className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 min-h-touch text-[10px] font-semibold active:scale-95 disabled:opacity-40 ${playing === 'learner' ? 'border-violet-400 bg-violet-100 text-violet-900 ring-2 ring-violet-300' : 'border-violet-200 bg-violet-50 text-violet-900 hover:bg-violet-100'}`}>
          <Play className="h-4 w-4" />Your take
        </button>
        <button type="button" onClick={() => play('reference')} disabled={!referenceAudioSrc}
          className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 min-h-touch text-[10px] font-semibold active:scale-95 disabled:opacity-40 ${playing === 'reference' ? 'border-emerald-400 bg-emerald-100 text-emerald-900 ring-2 ring-emerald-300' : 'border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'}`}>
          <Play className="h-4 w-4" />Reference
        </button>
        <button type="button" onClick={playAB} disabled={!learnerAudioSrc || !referenceAudioSrc}
          className="flex flex-col items-center gap-1 rounded-xl border border-violet-200 bg-violet-50 px-2 py-2.5 min-h-touch text-[10px] font-semibold text-violet-900 hover:bg-violet-100 active:scale-95 disabled:opacity-40">
          <ArrowLeftRight className="h-4 w-4" />A / B loop
        </button>
      </div>
      {learnerAudioSrc ? <audio ref={learnerRef} src={learnerAudioSrc} preload="metadata" className="hidden" /> : null}
      {referenceAudioSrc ? <audio ref={referenceRef} src={referenceAudioSrc} preload="metadata" className="hidden" /> : null}
    </div>
  )
}

// ─── Legend ──────────────────────────────────────────────────────────────

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[9px] font-semibold text-ink-tertiary">
      {(['strong', 'building', 'weak'] as BandId[]).map((b) => (
        <span key={b} className="flex items-center gap-1">
          <span className={`h-2 w-2 rounded-full ${BAND_STYLES[b].dotColor}`} />
          {BAND_STYLES[b].label}
        </span>
      ))}
      <span className="text-ink-tertiary">· Tap a word for details</span>
    </div>
  )
}

// ─── Main component ─────────────────────────────────────────────────────

export type WordByWordBreakdownProps = {
  wordAssessments: WordAssessment[]
  phraseGroups?: PhraseGroup[]
  fluencyIssues?: Array<{ segment: string; issue: string; fix: string; pauseMs: number | null; afterWordIndex: number | null }>
  learnerAudioSrc: string | null
  referenceAudioSrc: string | null
  transcript: string
  hasAudio: boolean
  alignmentQuality?: 'full' | 'partial' | 'none'
  onSaveWord?: (word: string) => void
  onSavePhrase?: (phrase: string) => void
}

export function WordByWordBreakdown({
  wordAssessments,
  phraseGroups: phraseGroupsProp,
  fluencyIssues,
  learnerAudioSrc,
  referenceAudioSrc,
  transcript,
  hasAudio,
  alignmentQuality = 'full',
  onSaveWord,
  onSavePhrase,
}: WordByWordBreakdownProps) {
  const [view, setView] = useState<'words' | 'phrases'>('words')
  const [selectedWordIdx, setSelectedWordIdx] = useState<number | null>(null)
  const [selectedPhraseIdx, setSelectedPhraseIdx] = useState<number | null>(null)

  const phraseGroups = useMemo(() => {
    if (phraseGroupsProp && phraseGroupsProp.length > 0) return phraseGroupsProp
    if (wordAssessments.length === 0) return []
    const groups: PhraseGroup[] = []
    let start = 0
    for (let i = 0; i < wordAssessments.length; i++) {
      const isBreak = fluencyIssues?.some((f) => f.afterWordIndex === i) ?? false
      if (isBreak || i === wordAssessments.length - 1) {
        const end = i === wordAssessments.length - 1 ? i : i
        const words = wordAssessments.slice(start, end + 1).map((w) => w.word)
        const fi = fluencyIssues?.find((f) => f.afterWordIndex === i)
        groups.push({
          words,
          startIndex: start,
          endIndex: end,
          issue: fi?.issue,
          fix: fi?.fix,
          pauseMs: fi?.pauseMs,
        })
        start = end + 1
      }
    }
    if (groups.length === 0 && wordAssessments.length > 0) {
      groups.push({
        words: wordAssessments.map((w) => w.word),
        startIndex: 0,
        endIndex: wordAssessments.length - 1,
      })
    }
    return groups
  }, [wordAssessments, phraseGroupsProp, fluencyIssues])

  if (!hasAudio) return null

  if (alignmentQuality === 'none' || wordAssessments.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-700 mb-1">How each word sounded</p>
        <p className="text-[12px] text-ink-secondary leading-relaxed">
          Word-by-word detail couldn't be generated for this turn. See the coaching notes above.
        </p>
      </div>
    )
  }

  const selectedWord = selectedWordIdx != null ? wordAssessments[selectedWordIdx] : null
  const selectedPhrase = selectedPhraseIdx != null ? phraseGroups[selectedPhraseIdx] : null

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest text-ink-tertiary">Pronunciation breakdown</p>
        <div className="flex rounded-lg border border-slate-200 overflow-hidden text-[10px] font-semibold">
          <button type="button" onClick={() => setView('words')}
            className={`px-3 py-1.5 ${view === 'words' ? 'bg-slate-800 text-white' : 'bg-white text-ink-secondary hover:bg-slate-50'}`}>
            Words
          </button>
          <button type="button" onClick={() => setView('phrases')}
            className={`px-3 py-1.5 border-l border-slate-200 ${view === 'phrases' ? 'bg-slate-800 text-white' : 'bg-white text-ink-secondary hover:bg-slate-50'}`}>
            Phrases
          </button>
        </div>
      </div>

      {alignmentQuality === 'partial' ? (
        <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
          Audio alignment was partial — some word scores may be approximate.
        </p>
      ) : null}

      {view === 'words' ? (
        <div className="flex flex-wrap gap-2">
          {wordAssessments.map((w, i) => (
            <WordChip
              key={`w-${i}`}
              word={w.word}
              score={w.score}
              band={wordBand(w.score)}
              isSelected={selectedWordIdx === i}
              onTap={() => setSelectedWordIdx(selectedWordIdx === i ? null : i)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {phraseGroups.map((pg, i) => (
            <PhraseChip
              key={`pg-${i}`}
              phrase={pg.words.join(' ')}
              hasIssue={Boolean(pg.issue)}
              isSelected={selectedPhraseIdx === i}
              onTap={() => setSelectedPhraseIdx(selectedPhraseIdx === i ? null : i)}
            />
          ))}
        </div>
      )}

      <Legend />

      <CompareMode
        learnerAudioSrc={learnerAudioSrc}
        referenceAudioSrc={referenceAudioSrc}
        transcript={transcript}
      />

      {selectedWord ? (
        <WordDetailSheet
          word={selectedWord}
          onClose={() => setSelectedWordIdx(null)}
          learnerAudioSrc={learnerAudioSrc}
          referenceAudioSrc={referenceAudioSrc}
          onSaveForPractice={onSaveWord}
        />
      ) : null}

      {selectedPhrase ? (
        <PhraseDetailSheet
          phrase={selectedPhrase}
          onClose={() => setSelectedPhraseIdx(null)}
          learnerAudioSrc={learnerAudioSrc}
          referenceAudioSrc={referenceAudioSrc}
          onSaveForPractice={onSavePhrase}
        />
      ) : null}
    </div>
  )
}
