'use client'

import Link from 'next/link'
import { useCallback, useMemo, useState } from 'react'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { clsx } from 'clsx'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PackReferenceAudioControls } from '@/features/generated-exercise-pack/PackReferenceAudioControls'
import { KnmExamQuestionMedia } from '@/features/exam-system/KnmExamQuestionMedia'
import { mcqSubmissionMatchesCorrect, parseMcqSubmissionIds } from '@/lib/exam-system/scoringEngine'
import {
  removeSavedKnmExamQuestion,
  type SavedKnmExamQuestion,
} from '@/lib/exam-prep/kmn/savedKnmExamQuestions'
import { useSavedKnmExamQuestions } from '@/features/exam-prep/kmn/useSavedKnmExamQuestions'
import { knowledgeMcqOptionDisplayLetter } from '@/lib/exam-system/knowledgeMcqOptionShuffle'

function optionLetterByIndex(optionIndex: number): string {
  return knowledgeMcqOptionDisplayLetter(optionIndex)
}

function shuffleOptions<T extends { id: string }>(options: T[], seed: number): T[] {
  const out = [...options]
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.abs(Math.sin(seed + i * 17) * 10000) % (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

function SavedQuestionPracticeCard({ item, seed }: { item: SavedKnmExamQuestion; seed: number }) {
  const [picked, setPicked] = useState<string | null>(null)
  const shuffled = useMemo(() => shuffleOptions(item.options, seed), [item.options, seed])
  const correct = picked
    ? mcqSubmissionMatchesCorrect(item.correctOptionIds, picked)
    : null

  const correctLines = item.correctOptionIds.map((id) => {
    const ix = shuffled.findIndex((o) => o.id === id)
    const opt = shuffled[ix]
    const L = ix >= 0 ? optionLetterByIndex(ix) : id
    return opt ? `${L} — ${opt.label}` : L
  })

  return (
    <Card variant="flat" padding="md" className="rounded-2xl border border-slate-200/90 bg-white space-y-3">
      <KnmExamQuestionMedia
        illustrationId={item.illustrationId}
        questionImageUrl={item.questionImageUrl}
        questionNl={item.promptNl}
      />
      {item.audioScriptNl ? (
        <PackReferenceAudioControls
          line={item.audioScriptNl}
          variant="playOnly"
          playOnlyHint="Tik om de vraag te horen."
        />
      ) : null}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Vraag</p>
        <p className="text-body-sm font-semibold text-ink-primary leading-relaxed whitespace-pre-wrap mt-1">
          {item.promptNl}
        </p>
      </div>
      {!picked ? (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Kies één antwoord</p>
          {shuffled.map((opt, optionIndex) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setPicked(opt.id)}
              className="w-full min-h-touch rounded-xl border border-slate-200 bg-white px-3 py-3 text-left text-body-sm text-ink-primary hover:border-primary-400 hover:bg-primary-50/25 transition-colors flex gap-2"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-600">
                {optionLetterByIndex(optionIndex)}
              </span>
              <span className="flex-1 leading-snug">{opt.label}</span>
            </button>
          ))}
        </div>
      ) : (
        <div
          className={clsx(
            'rounded-xl border px-3 py-3 space-y-2',
            correct ? 'border-emerald-200 bg-emerald-50/50' : 'border-amber-200 bg-amber-50/50',
          )}
        >
          <p className="text-body-sm font-semibold text-ink-primary">{correct ? 'Goed' : 'Niet goed'}</p>
          <p className="text-caption text-ink-secondary">
            Jouw keuze:{' '}
            {parseMcqSubmissionIds(picked)
              .map((id) => {
                const ix = shuffled.findIndex((o) => o.id === id)
                const opt = shuffled[ix]
                const L = ix >= 0 ? optionLetterByIndex(ix) : id
                return opt ? `${L} — ${opt.label}` : L
              })
              .join(', ')}
          </p>
          <p className="text-caption text-emerald-950/90">
            <span className="font-semibold">Juiste antwoord: </span>
            {correctLines.join(' · ')}
          </p>
          {item.promptEn.trim() ? (
            <p className="text-caption text-slate-600 border-t border-slate-200/80 pt-2 leading-relaxed">
              {item.promptEn}
            </p>
          ) : null}
          <Button type="button" variant="secondary" size="sm" className="mt-1" onClick={() => setPicked(null)}>
            Opnieuw proberen
          </Button>
        </div>
      )}
    </Card>
  )
}

function shuffleSavedItems(list: SavedKnmExamQuestion[], seed: number): SavedKnmExamQuestion[] {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.abs(Math.sin(seed + i * 11) * 10000) % (i + 1))
    ;[copy[i], copy[j]] = [copy[j]!, copy[i]!]
  }
  return copy
}

export function KnmSavedQuestionsScreen() {
  const items = useSavedKnmExamQuestions()
  const [mode, setMode] = useState<'list' | 'practice'>('list')
  const [practiceQueue, setPracticeQueue] = useState<SavedKnmExamQuestion[]>([])
  const [practiceIndex, setPracticeIndex] = useState(0)

  const remove = useCallback((id: string) => {
    removeSavedKnmExamQuestion(id)
    setPracticeIndex((i) => Math.max(0, Math.min(i, items.length - 2)))
  }, [items.length])

  if (items.length === 0) {
    return (
      <div className="px-4 py-6 pb-28 max-w-lg mx-auto space-y-4 min-h-[70vh]">
        <Link
          href="/app/exam-prep/kmn"
          className="inline-flex items-center gap-1 text-body-sm font-medium text-primary-600 min-h-touch"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          KNM
        </Link>
        <header className="space-y-2">
          <h1 className="text-title font-bold text-ink-primary tracking-tight">Saved exam questions</h1>
          <p className="text-body-sm text-ink-secondary leading-relaxed">
            After a KNM simulation, tap <span className="font-medium">Save for review</span> on any question in the
            report. Those items appear here — separate from words and phrases in your library.
          </p>
        </header>
        <Card variant="outlined" padding="md" className="border-dashed border-slate-200">
          <p className="text-body-sm text-ink-secondary">Nothing saved yet.</p>
          <Link href="/app/exam" className="mt-3 block">
            <Button type="button" variant="secondary" className="w-full min-h-touch">
              Go to Exam
            </Button>
          </Link>
        </Card>
      </div>
    )
  }

  if (mode === 'practice' && practiceQueue.length > 0) {
    const current = practiceQueue[practiceIndex]!
    const done = practiceIndex + 1 >= practiceQueue.length
    return (
      <div className="px-4 py-6 pb-28 max-w-lg mx-auto space-y-4 min-h-[70vh]">
        <button
          type="button"
          className="inline-flex items-center gap-1 text-body-sm font-medium text-primary-600 min-h-touch"
          onClick={() => setMode('list')}
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Saved list
        </button>
        <p className="text-caption text-ink-tertiary">
          Oefenen {practiceIndex + 1} / {practiceQueue.length}
        </p>
        <SavedQuestionPracticeCard item={current} seed={practiceIndex * 31 + 7} />
        <Button
          type="button"
          className="w-full min-h-touch"
          onClick={() => {
            if (done) setMode('list')
            else setPracticeIndex((i) => i + 1)
          }}
        >
          {done ? 'Klaar' : 'Volgende vraag'}
        </Button>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 pb-28 max-w-lg mx-auto space-y-5 min-h-[70vh]">
      <Link
        href="/app/exam-prep/kmn"
        className="inline-flex items-center gap-1 text-body-sm font-medium text-primary-600 min-h-touch"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden />
        KNM
      </Link>
      <header className="space-y-2">
        <h1 className="text-title font-bold text-ink-primary tracking-tight">Saved exam questions</h1>
        <p className="text-body-sm text-ink-secondary leading-relaxed">
          {items.length} item{items.length === 1 ? '' : 's'} from KNM simulation reports. Practice again anytime — not
          mixed with library words.
        </p>
      </header>
      <Button
        type="button"
        className="w-full min-h-touch"
        onClick={() => {
          setPracticeQueue(shuffleSavedItems(items, Date.now()))
          setPracticeIndex(0)
          setMode('practice')
        }}
      >
        Practice all ({items.length})
      </Button>
      <ul className="space-y-3 list-none p-0 m-0">
        {items.map((item) => (
          <li key={item.id}>
            <Card variant="outlined" padding="md" className="border-slate-200 space-y-2">
              <p className="text-body-sm font-semibold text-ink-primary line-clamp-3 leading-snug">{item.promptNl}</p>
              {item.lastAttemptCorrect === false ? (
                <p className="text-caption text-amber-800">Missed in last simulation — good to review</p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setPracticeQueue([item])
                    setPracticeIndex(0)
                    setMode('practice')
                  }}
                >
                  Practice
                </Button>
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  className="inline-flex min-h-touch items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-caption font-semibold text-ink-secondary hover:border-rose-200 hover:text-rose-800"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  Remove
                </button>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  )
}
