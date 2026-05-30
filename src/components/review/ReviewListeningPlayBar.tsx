'use client'

import { useCallback, useRef, useState } from 'react'
import { Volume2 } from 'lucide-react'
import { speakNlAsync } from '@/lib/lesson-engine/speakNl'
import { Button } from '@/components/ui/Button'

export function ReviewListeningPlayBar({
  text,
  onFirstPlayEnd,
}: {
  text: string
  onFirstPlayEnd?: () => void
}) {
  const [busy, setBusy] = useState(false)
  const firstDone = useRef(false)

  const play = useCallback(async () => {
    setBusy(true)
    try {
      await speakNlAsync(text)
      if (!firstDone.current) {
        firstDone.current = true
        onFirstPlayEnd?.()
      }
    } finally {
      setBusy(false)
    }
  }, [text, onFirstPlayEnd])

  return (
    <div className="rounded-xl border border-primary-200/80 bg-primary-50/50 px-3 py-3 space-y-2">
      <p className="text-caption text-ink-secondary leading-snug">
        Listen to the Dutch line (browser voice), then choose your answer. You can replay anytime.
      </p>
      <Button
        type="button"
        variant="secondary"
        className="w-full min-h-touch gap-2 font-semibold inline-flex items-center justify-center"
        disabled={busy || !text.trim()}
        onClick={() => void play()}
      >
        <Volume2 className="h-5 w-5 shrink-0" aria-hidden />
        {busy ? 'Playing…' : 'Play audio'}
      </Button>
    </div>
  )
}
