'use client'

import { Feather, Languages, RefreshCw, RotateCcw, Sparkles, Turtle, Undo2 } from 'lucide-react'
import { clsx } from 'clsx'

/** Secondary support — tucked under “More help” to reduce noise. */
export function GuidedCalmSupportRow({
  onRedo,
  redoEnabled,
  onRepeat,
  repeatActive,
  onAnotherWay,
  anotherWayAvailable,
  onKeyPhrase,
  keyPhraseEnabled,
  onMeaning,
  meaningEnabled,
  onSimpler,
  simplerEnabled,
  onNatural,
  naturalEnabled,
  naturalPremiumLocked,
}: {
  onRedo: () => void
  redoEnabled: boolean
  onRepeat: () => void
  repeatActive: boolean
  onAnotherWay: () => void
  anotherWayAvailable: boolean
  onKeyPhrase: () => void
  keyPhraseEnabled: boolean
  onMeaning: () => void
  meaningEnabled: boolean
  onSimpler: () => void
  simplerEnabled: boolean
  onNatural: () => void
  naturalEnabled: boolean
  naturalPremiumLocked: boolean
}) {
  const btn =
    'min-h-touch px-2.5 rounded-xl text-caption font-medium border transition-colors inline-flex items-center justify-center gap-1 shrink-0'

  const Item = ({
    label,
    onClick,
    enabled,
    Icon,
    locked,
    active,
  }: {
    label: string
    onClick: () => void
    enabled: boolean
    Icon: typeof Feather
    locked?: boolean
    active?: boolean
  }) => (
    <button
      type="button"
      disabled={!enabled && !locked}
      onClick={onClick}
      className={clsx(
        btn,
        active
          ? 'border-primary-300 bg-primary-50 text-primary-800'
          : enabled || locked
            ? locked
              ? 'border-amber-200/80 bg-amber-50/50 text-ink-secondary'
              : 'border-slate-200 bg-surface-elevated text-ink-secondary hover:border-primary-200'
            : 'border-slate-100 bg-surface-muted/40 text-ink-tertiary opacity-50 cursor-not-allowed'
      )}
    >
      <Icon className="w-3.5 h-3.5" aria-hidden />
      {label}
    </button>
  )

  return (
    <div
      className="flex flex-wrap gap-2 pt-1 border-t border-slate-200/80 mt-2"
      role="toolbar"
      aria-label="More conversation help"
    >
      <Item label="Repeat" onClick={onRepeat} enabled active={repeatActive} Icon={RotateCcw} />
      <Item
        label="Another way"
        onClick={onAnotherWay}
        enabled={anotherWayAvailable}
        Icon={RefreshCw}
      />
      <Item label="Redo turn" onClick={onRedo} enabled={redoEnabled} Icon={Undo2} />
      <Item label="Phrase" onClick={onKeyPhrase} enabled={keyPhraseEnabled} Icon={Languages} />
      <Item label="Meaning" onClick={onMeaning} enabled={meaningEnabled} Icon={Feather} />
      <Item label="Simpler" onClick={onSimpler} enabled={simplerEnabled} Icon={Turtle} />
      <Item
        label="Natural"
        onClick={onNatural}
        enabled={naturalEnabled}
        locked={naturalPremiumLocked}
        Icon={Sparkles}
      />
    </div>
  )
}
