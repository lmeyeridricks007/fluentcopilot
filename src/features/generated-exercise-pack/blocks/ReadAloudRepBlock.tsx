'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import type { ExerciseBlockResultPayload } from '../exerciseBlockResult'
import { BlockSurface } from '../blockPrimitives'
import { PackReferenceAudioControls } from '../PackReferenceAudioControls'

export function ReadAloudRepBlock(props: {
  blockId: string
  textNl: string
  readAloudHref: string
  afterReadPromptEn?: string
  referenceAudioUrl?: string | null
  voice?: string
  optionalDeepLinks?: { label: string; href: string }[]
  compact?: boolean
  disabled?: boolean
  onComplete: (result: ExerciseBlockResultPayload) => void
}) {
  const { textNl, readAloudHref, afterReadPromptEn, referenceAudioUrl, voice, optionalDeepLinks, compact, disabled, onComplete } = props
  const extras = (optionalDeepLinks ?? []).filter((l) => l.href?.trim() && l.label?.trim())

  return (
    <BlockSurface compact={compact} data-block-id={props.blockId}>
      {afterReadPromptEn ? <p className="text-caption text-ink-secondary leading-snug">{afterReadPromptEn}</p> : null}
      <div className="rounded-2xl border border-slate-200 bg-white p-3.5 max-h-48 overflow-y-auto">
        <p className="text-body-sm text-ink-primary whitespace-pre-wrap leading-relaxed">{textNl}</p>
      </div>
      <PackReferenceAudioControls
        line={textNl}
        referenceAudioUrl={referenceAudioUrl}
        voice={voice}
        disabled={disabled}
        compact={compact}
        rowLabel="Listen"
      />
      <Link
        href={readAloudHref}
        className="inline-flex min-h-touch items-center justify-center rounded-2xl bg-primary-600 px-4 py-3 text-body-sm font-semibold text-white w-full text-center shadow-sm hover:bg-primary-700"
      >
        Open Read aloud
      </Link>
      {extras.length ? (
        <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5 space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Optional</p>
          <ul className="space-y-1">
            {extras.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-caption font-semibold text-primary-800 underline-offset-2 hover:underline">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <Button
        variant="primary"
        fullWidth
        disabled={disabled}
        onClick={() => onComplete({ outcome: 'self_reported' })}
      >
        Done in Read aloud or twice here
      </Button>
    </BlockSurface>
  )
}
