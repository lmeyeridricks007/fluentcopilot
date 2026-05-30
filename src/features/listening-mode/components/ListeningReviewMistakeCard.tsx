'use client'

import { useState } from 'react'
import { ChevronDown, Headphones } from 'lucide-react'
import { speakNlAsync, speakNlLinesAsync } from '@/lib/lesson-engine/speakNl'
import type { ListeningReviewMistakeItem } from '@/lib/listening-mode/listeningReportBuilder'
import { Button } from '@/components/ui/Button'

type Props = {
  item: ListeningReviewMistakeItem
}

export function ListeningReviewMistakeCard({ item }: Props) {
  const [busy, setBusy] = useState(false)
  const play = async () => {
    setBusy(true)
    try {
      if (item.speakLinesNl.length === 1) {
        await speakNlAsync(item.speakLinesNl[0]!, { rate: 0.88 })
      } else {
        await speakNlLinesAsync(item.speakLinesNl, { rate: 0.88, pauseMsBetween: 380 })
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className="rounded-2xl border border-slate-200/85 bg-white/95 px-4 py-3.5 shadow-sm ring-1 ring-slate-900/[0.02]">
      <p className="text-caption font-semibold uppercase tracking-[0.12em] text-slate-500">Clip</p>
      <p className="mt-1 text-body-sm font-medium leading-snug text-slate-900">{item.instructionEn}</p>
      <p className="mt-2 text-body-sm leading-relaxed text-amber-950/90">{item.whatMissedEn}</p>
      <p className="mt-2 text-body-sm leading-relaxed text-slate-600">{item.whatItMeantEn}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" className="gap-1.5" disabled={busy} onClick={() => void play()}>
          <Headphones className="h-4 w-4" aria-hidden />
          {busy ? 'Playing…' : 'Replay Dutch'}
        </Button>
      </div>
      <details className="mt-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2">
        <summary className="cursor-pointer text-caption font-semibold text-slate-600 outline-none">
          <span className="inline-flex items-center gap-1">
            <ChevronDown className="h-3.5 w-3.5" aria-hidden />
            Dutch line
          </span>
        </summary>
        <p className="mt-2 text-body-sm leading-relaxed text-slate-800">{item.transcriptNl}</p>
        {item.hadTranscriptReveal ? (
          <p className="mt-1 text-caption text-slate-500">You had already opened text during this clip.</p>
        ) : null}
      </details>
    </article>
  )
}
