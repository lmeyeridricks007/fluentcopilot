'use client'

import { useEffect, useState } from 'react'
import type { ReviewSessionCard, ReviewScore } from '@/lib/review-engine/types'
import { ReviewChoiceCard } from '@/components/review/ReviewChoiceCard'
import { ReviewReorderCard } from '@/components/review/ReviewReorderCard'
import { ReviewFillBlankCard } from '@/components/review/ReviewFillBlankCard'
import { ReviewSpeakCard } from '@/components/review/ReviewSpeakCard'
import { Button } from '@/components/ui/Button'

export type ReviewCardPayload = {
  score: ReviewScore
  userAnswer: string
  hintUsed: boolean
  speakingConfidence?: number
}

export function ReviewCard({
  card,
  onSubmit,
  telemetry,
  listenChoicesBlocked,
}: {
  card: ReviewSessionCard
  onSubmit: (payload: ReviewCardPayload) => void
  telemetry: (event: 'card_started' | 'hint_used') => void
  /** Listening cards: block MCQ picks until the learner has played audio once. */
  listenChoicesBlocked?: boolean
}) {
  const [hintUsed, setHintUsed] = useState(false)
  const [hintVisible, setHintVisible] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [locked, setLocked] = useState(false)
  const [mcqPick, setMcqPick] = useState<string | null>(null)

  useEffect(() => {
    telemetry('card_started')
  }, [card.instanceId, telemetry])

  useEffect(() => {
    setHintUsed(false)
    setHintVisible(false)
    setRevealed(false)
    setLocked(false)
    setMcqPick(null)
  }, [card.instanceId])

  const correctStr =
    typeof card.correctAnswer === 'string' ? card.correctAnswer : card.correctAnswer[0]

  const emit = (score: ReviewScore, userAnswer: string, speakingConfidence?: number) => {
    onSubmit({ score, userAnswer, hintUsed, speakingConfidence })
  }

  const hintBody = (() => {
    const t = correctStr.trim()
    const words = t.split(/\s+/).filter(Boolean)
    const translation = card.translation?.trim()
    const exampleEn = card.exampleEn?.trim()
    const partOfSpeech = card.partOfSpeech?.trim()

    if (card.uiMode === 'fill_blank' && t) {
      // Cloze sentence: explain the missing word's meaning + the sentence's meaning.
      if (card.isCloze) {
        if (translation && exampleEn) {
          return `The missing Dutch word means “${translation}”. The whole sentence reads: “${exampleEn}”.`
        }
        if (translation) return `The missing Dutch word means “${translation}”.`
        if (exampleEn) return `In English the sentence reads: “${exampleEn}”.`
      }
      // Standalone vocab card with known meaning — anchor on usage, not letters.
      if (card.itemType === 'vocab' && translation) {
        const pos = partOfSpeech ? `${partOfSpeech} ` : ''
        const base = `It's the Dutch ${pos}for “${translation}”.`
        return exampleEn ? `${base} Example use: “${exampleEn}”.` : base
      }
      // Multi-word phrase fallback — show word count + first letter as a last resort.
      const first = words[0] ?? ''
      const letter = first && /\p{L}/u.test(first[0] ?? '') ? first[0].toUpperCase() : (first[0] ?? '?')
      return words.length > 1
        ? `The answer has ${words.length} words. It starts with “${letter}…”.`
        : `Single word — starts with “${letter}…”.`
    }
    if (card.uiMode === 'reorder' && card.tokens?.length) {
      return `You already have every word — try grouping the small glue words (de, het, een) next to the noun they belong to.`
    }
    if (card.uiMode === 'mcq' || card.uiMode === 'listening_mcq') {
      if (card.itemType === 'vocab' && translation) {
        return `Pick the Dutch word that matches “${translation}”.`
      }
      return `Eliminate answers that do not match the tense or situation in the prompt.`
    }
    return `Think back to the lesson pattern, then make your best attempt — partial credit still helps spacing.`
  })()

  return (
    <div className="space-y-4">
      {!revealed && card.uiMode !== 'speaking' && card.uiMode !== 'kmn_flash' ? (
        <div className="space-y-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-caption -ml-1"
            onClick={() => {
              setHintUsed(true)
              setHintVisible(true)
              telemetry('hint_used')
            }}
          >
            Need a hint?
          </Button>
          {hintVisible ? (
            <div
              className="rounded-xl border border-amber-200/90 bg-amber-50/90 px-3 py-2.5 text-body-sm leading-relaxed text-amber-950 shadow-sm"
              role="status"
            >
              <p className="text-caption font-bold uppercase tracking-wide text-amber-900/90">Hint</p>
              <p className="mt-1">{hintBody}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {card.uiMode === 'mcq' || card.uiMode === 'listening_mcq' ? (
        <ReviewChoiceCard
          options={card.options ?? [correctStr]}
          disabled={locked || !!listenChoicesBlocked}
          selected={mcqPick}
          revealed={revealed}
          correctAnswer={correctStr}
          onSelect={(opt) => {
            if (locked) return
            setMcqPick(opt)
            setLocked(true)
            setRevealed(true)
            const ok = opt.trim().toLowerCase() === correctStr.trim().toLowerCase()
            emit(ok ? 4 : 1, opt)
          }}
        />
      ) : null}

      {card.uiMode === 'reorder' && card.tokens ? (
        <ReviewReorderCard
          tokens={card.tokens}
          disabled={locked}
          revealed={revealed}
          correctAnswer={correctStr}
          onSubmit={(ordered) => {
            if (locked) return
            setLocked(true)
            setRevealed(true)
            const ok = ordered.join(' ').trim().toLowerCase() === correctStr.trim().toLowerCase()
            emit(ok ? 4 : 1, ordered.join(' '))
          }}
        />
      ) : null}

      {card.uiMode === 'fill_blank' ? (
        <ReviewFillBlankCard
          disabled={locked}
          revealed={revealed}
          correctAnswer={correctStr}
          onSubmit={(text) => {
            if (locked) return
            setLocked(true)
            setRevealed(true)
            const ok = text.trim().toLowerCase() === correctStr.trim().toLowerCase()
            emit(ok ? 4 : 1, text)
          }}
        />
      ) : null}

      {card.uiMode === 'speaking' ? (
        <ReviewSpeakCard
          disabled={locked}
          revealed={revealed}
          expectedText={correctStr}
          onSubmit={({ score, confidence, transcript }) => {
            if (locked) return
            setLocked(true)
            setRevealed(true)
            emit(score, transcript, confidence)
          }}
        />
      ) : null}

      {card.uiMode === 'kmn_flash' ? (
        <KmnFlashGradeBlock
          disabled={locked}
          front={card.prompt}
          back={correctStr}
          exampleNl={card.kmnExampleNl}
          onGrade={(score) => {
            if (locked) return
            setLocked(true)
            setRevealed(true)
            emit(score, score >= 3 ? 'known' : 'review')
          }}
        />
      ) : null}
    </div>
  )
}

function KmnFlashGradeBlock({
  disabled,
  front,
  back,
  exampleNl,
  onGrade,
}: {
  disabled: boolean
  front: string
  back: string
  exampleNl?: string
  onGrade: (score: ReviewScore) => void
}) {
  const [flipped, setFlipped] = useState(false)
  return (
    <div className="space-y-4">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setFlipped((f) => !f)}
        className="w-full min-h-[140px] rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/80 px-4 py-4 text-left transition-colors hover:border-primary-300 hover:bg-primary-50/20 disabled:opacity-60"
      >
        {!flipped ? (
          <div>
            <p className="text-caption font-semibold text-primary-700 uppercase tracking-wide">KMN</p>
            <p className="mt-2 text-body-lg font-semibold text-ink-primary leading-snug">{front}</p>
            <p className="mt-3 text-caption text-ink-tertiary">Tik om te draaien</p>
          </div>
        ) : (
          <div>
            <p className="text-caption font-semibold text-emerald-800 uppercase tracking-wide">Uitleg</p>
            <p className="mt-2 text-body text-ink-primary leading-relaxed">{back}</p>
            {exampleNl ? (
              <p className="mt-3 text-body-sm text-ink-secondary border-t border-slate-200 pt-3">
                <span className="font-medium text-ink-primary">Voorbeeld: </span>
                {exampleNl}
              </p>
            ) : null}
          </div>
        )}
      </button>
      {flipped ? (
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="secondary" className="min-h-touch text-body-sm" disabled={disabled} onClick={() => onGrade(1)}>
            Opnieuw
          </Button>
          <Button type="button" variant="secondary" className="min-h-touch text-body-sm" disabled={disabled} onClick={() => onGrade(2)}>
            Moeilijk
          </Button>
          <Button type="button" className="min-h-touch text-body-sm" disabled={disabled} onClick={() => onGrade(3)}>
            Goed
          </Button>
          <Button type="button" className="min-h-touch text-body-sm" disabled={disabled} onClick={() => onGrade(4)}>
            Makkelijk
          </Button>
        </div>
      ) : null}
    </div>
  )
}
