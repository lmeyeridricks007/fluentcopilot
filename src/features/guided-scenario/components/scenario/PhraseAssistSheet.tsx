'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import type { GuidedPhrase } from '@/lib/schemas/practice/guidedScenarioDefinition.schema'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import { clsx } from 'clsx'
import { nativePress } from '@/lib/design/cardTiers'

export function PhraseAssistSheet({
  open,
  onClose,
  phrases,
  scenarioId,
  onPickPhrase,
}: {
  open: boolean
  onClose: () => void
  phrases: GuidedPhrase[]
  scenarioId: string
  onPickPhrase: (nl: string) => void
}) {
  const [showEnglishMeaning, setShowEnglishMeaning] = useState(false)

  if (!open) return null

  const hasAnyEn = phrases.some((p) => Boolean(p.en))

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end" role="dialog" aria-modal="true" aria-label="Useful phrases">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative max-h-[min(72vh,520px)] flex flex-col rounded-t-2xl bg-surface-elevated shadow-[0_-12px_40px_rgba(15,23,42,0.18)] border-t border-slate-200/90 safe-area-pb">
        <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-2 border-b border-slate-200/70">
          <h2 className="text-body font-bold text-ink-primary">Key Dutch you may need</h2>
          <div className="flex items-center gap-1 shrink-0">
            {hasAnyEn ? (
              <button
                type="button"
                onClick={() => setShowEnglishMeaning((v) => !v)}
                className={clsx(
                  'min-h-touch px-2.5 rounded-xl text-caption font-semibold border transition-colors',
                  showEnglishMeaning
                    ? 'border-primary-300 bg-primary-50 text-primary-900'
                    : 'border-slate-200 bg-white text-ink-secondary hover:border-primary-200'
                )}
              >
                {showEnglishMeaning ? 'Hide English meaning' : 'Show English meaning'}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className={clsx('min-h-touch min-w-touch rounded-xl flex items-center justify-center text-ink-secondary', nativePress)}
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto px-3 py-3 space-y-2">
          {phrases.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                track(ANALYTICS_EVENTS.guided_scenario_support_used, { tool: 'phrase_chip', scenarioId })
                onPickPhrase(p.nl)
                onClose()
              }}
              className={clsx(
                'w-full text-left rounded-xl border border-slate-200 bg-white px-3 py-2.5 min-h-touch',
                'hover:border-primary-200 hover:bg-primary-50/40 transition-colors',
                nativePress
              )}
            >
              <span className="text-body-sm font-medium text-ink-primary">{p.nl}</span>
              {showEnglishMeaning && p.en ? (
                <span className="block text-caption text-ink-secondary mt-0.5">{p.en}</span>
              ) : null}
            </button>
          ))}
        </div>
        <p className="text-caption text-ink-tertiary px-4 pb-4 pt-1">
          Tap a line to load it into your reply — you can still edit before sending.
        </p>
      </div>
    </div>
  )
}
