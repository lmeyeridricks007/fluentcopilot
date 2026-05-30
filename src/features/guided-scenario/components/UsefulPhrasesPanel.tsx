'use client'

import { useCallback, useMemo, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Copy, Languages, Star, Volume2 } from 'lucide-react'
import type { GuidedPhrase } from '@/lib/schemas/practice/guidedScenarioDefinition.schema'

function speakNl(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'nl-NL'
  window.speechSynthesis.speak(u)
}

export function UsefulPhrasesPanel({
  phrases,
  onInsertPhrase,
  enableInsert = true,
}: {
  phrases: GuidedPhrase[]
  onInsertPhrase?: (nl: string) => void
  /** Off on the pre-chat phrases step (no composer yet). */
  enableInsert?: boolean
}) {
  const [showEn, setShowEn] = useState(true)
  const [starredId, setStarredId] = useState<string | null>(phrases[0]?.id ?? null)
  const [recallOpen, setRecallOpen] = useState(false)
  const [recallReveal, setRecallReveal] = useState(false)

  const ordered = useMemo(() => {
    const rest = phrases.filter((p) => p.id !== phrases[0]?.id)
    return phrases[0] ? [phrases[0], ...rest] : phrases
  }, [phrases])

  const recallPhrase = useMemo(() => ordered[Math.min(1, ordered.length - 1)] ?? ordered[0], [ordered])

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      /* ignore */
    }
  }

  const toggleRecall = useCallback(() => {
    setRecallOpen((o) => !o)
    setRecallReveal(false)
  }, [])

  return (
    <Card variant="flat" padding="md" className="border border-slate-200/90 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-body-sm font-semibold text-ink-primary">Prepare what to say</p>
        <button
          type="button"
          onClick={() => setShowEn((s) => !s)}
          className="inline-flex items-center gap-1 text-caption font-medium text-primary-600 min-h-touch px-2 rounded-lg hover:bg-primary-50"
        >
          <Languages className="w-3.5 h-3.5" aria-hidden />
          {showEn ? 'Hide EN' : 'Show EN'}
        </button>
      </div>
      <p className="text-caption text-ink-secondary">
        Tap to hear · star the line you’ll need first · quick recall check below.
      </p>
      <ul className="space-y-2">
        {ordered.map((p, idx) => (
          <li
            key={p.id}
            className={`rounded-lg px-3 py-2.5 border ${
              idx === 0 ? 'border-primary-200 bg-primary-50/30' : 'border-slate-200/80 bg-surface-muted/80'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                {idx === 0 ? (
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-primary-700 mb-1">
                    Likely first — learn this one cold
                  </p>
                ) : null}
                <p className="text-body-sm font-medium text-ink-primary leading-snug">{p.nl}</p>
                {showEn && p.en ? <p className="text-caption text-ink-secondary mt-1">{p.en}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => setStarredId((id) => (id === p.id ? null : p.id))}
                className="shrink-0 min-h-touch min-w-touch rounded-lg border border-slate-200 flex items-center justify-center text-ink-secondary hover:bg-surface-muted"
                aria-label={starredId === p.id ? 'Unmark priority phrase' : 'Mark as priority phrase'}
              >
                <Star
                  className={`w-4 h-4 ${starredId === p.id ? 'text-amber-500 fill-amber-400' : ''}`}
                  aria-hidden
                />
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <button
                type="button"
                onClick={() => speakNl(p.nl)}
                className="inline-flex items-center gap-1 text-caption font-medium text-primary-700 min-h-touch px-2 py-1.5 rounded-lg border border-primary-100 bg-white hover:bg-primary-50/80"
              >
                <Volume2 className="w-3.5 h-3.5" aria-hidden />
                Hear Dutch
              </button>
              {enableInsert && onInsertPhrase ? (
                <Button type="button" variant="secondary" size="sm" onClick={() => onInsertPhrase(p.nl)}>
                  Load into reply
                </Button>
              ) : (
                <span className="text-caption text-ink-tertiary self-center">Say it out loud once</span>
              )}
              <button
                type="button"
                onClick={() => copy(p.nl)}
                className="inline-flex items-center gap-1 text-caption font-medium text-ink-secondary min-h-touch px-2 py-1.5 rounded-lg border border-slate-200 hover:bg-surface-muted"
              >
                <Copy className="w-3.5 h-3.5" aria-hidden />
                Copy
              </button>
            </div>
          </li>
        ))}
      </ul>
      <div className="rounded-xl border border-dashed border-slate-300 bg-surface-muted/40 px-3 py-2.5">
        <button
          type="button"
          onClick={toggleRecall}
          className="text-caption font-semibold text-ink-primary w-full text-left"
        >
          {recallOpen ? 'Hide quick recall' : 'Quick recall check'}
        </button>
        {recallOpen && recallPhrase ? (
          <div className="mt-2 space-y-2">
            <p className="text-caption text-ink-secondary">How do you say this in Dutch?</p>
            <p className="text-body-sm font-medium text-ink-primary">{recallPhrase.en ?? recallPhrase.nl}</p>
            <Button type="button" size="sm" variant="secondary" onClick={() => setRecallReveal((r) => !r)}>
              {recallReveal ? 'Hide answer' : 'Show Dutch'}
            </Button>
            {recallReveal ? (
              <p className="text-body-sm text-primary-800 font-medium border-t border-slate-200 pt-2">{recallPhrase.nl}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </Card>
  )
}
