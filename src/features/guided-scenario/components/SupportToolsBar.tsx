import { Lightbulb, ListMusic, SlidersHorizontal } from 'lucide-react'
import { clsx } from 'clsx'

/** Primary on-screen support — Hint, Phrases, Easier. */
export function SupportToolsBar({
  hintActive,
  onHint,
  onPhrases,
  phrasesOpen,
  onEasier,
  easierEnabled,
  easierActive,
}: {
  hintActive: boolean
  onHint: () => void
  onPhrases: () => void
  phrasesOpen: boolean
  onEasier: () => void
  easierEnabled: boolean
  easierActive: boolean
}) {
  const btn =
    'min-h-touch min-w-touch px-3 rounded-xl text-caption font-medium border transition-colors inline-flex items-center justify-center gap-1'

  return (
    <div className="flex flex-wrap gap-2 pt-1" role="toolbar" aria-label="Quick help">
      <button
        type="button"
        onClick={onHint}
        className={clsx(
          btn,
          hintActive
            ? 'border-primary-300 bg-primary-50 text-primary-800'
            : 'border-slate-200 bg-surface-elevated text-ink-secondary hover:border-primary-200'
        )}
      >
        <Lightbulb className="w-3.5 h-3.5" aria-hidden />
        Hint
      </button>
      <button
        type="button"
        onClick={onPhrases}
        className={clsx(
          btn,
          phrasesOpen
            ? 'border-primary-300 bg-primary-50 text-primary-800'
            : 'border-slate-200 bg-surface-elevated text-ink-secondary hover:border-primary-200'
        )}
      >
        <ListMusic className="w-3.5 h-3.5" aria-hidden />
        Phrases
      </button>
      <button
        type="button"
        onClick={onEasier}
        disabled={!easierEnabled}
        className={clsx(
          btn,
          easierActive
            ? 'border-primary-300 bg-primary-50 text-primary-800'
            : 'border-slate-200 bg-surface-elevated text-ink-secondary hover:border-primary-200',
          !easierEnabled && 'opacity-40 pointer-events-none'
        )}
      >
        <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden />
        Easier
      </button>
    </div>
  )
}
