'use client'

import { clsx } from 'clsx'
import { Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { stripMarkdownForTts } from './speakTextUtils'
import { useSpeechSynthesis } from './useSpeechSynthesis'

type Props = {
  text: string
  disabled?: boolean
  className?: string
  /** When set, used instead of hook speak (e.g. parent already owns synthesis). */
  speakFn?: (plain: string) => void
  ariaLabel?: string
  /** Larger touch target for dense grammar / language-focus rows. */
  size?: 'default' | 'comfortable'
}

const sizeClasses = {
  default: 'min-h-0 h-8 w-8',
  comfortable: 'min-h-touch h-11 w-11 sm:h-12 sm:w-12',
} as const

const iconSize = {
  default: 'w-4 h-4',
  comfortable: 'w-5 h-5 sm:w-6 sm:h-6',
} as const

export function SpeakSnippetButton({
  text,
  disabled,
  className,
  speakFn,
  ariaLabel,
  size = 'default',
}: Props) {
  const { speak } = useSpeechSynthesis()
  const doSpeak = speakFn ?? speak
  const plain = stripMarkdownForTts(text)
  if (!plain) return null

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={clsx(
        'shrink-0 p-0 rounded-xl border border-slate-200 bg-surface-elevated hover:bg-slate-100',
        sizeClasses[size],
        className
      )}
      onClick={() => doSpeak(plain)}
      disabled={disabled}
      aria-label={ariaLabel ?? `Listen: ${plain.slice(0, 80)}`}
      title="Listen"
    >
      <Volume2 className={clsx('text-primary-600', iconSize[size])} aria-hidden />
    </Button>
  )
}
