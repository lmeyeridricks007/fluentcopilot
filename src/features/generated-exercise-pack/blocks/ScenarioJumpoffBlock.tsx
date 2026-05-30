'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import type { ExerciseBlockResultPayload } from '../exerciseBlockResult'
import { BlockSurface } from '../blockPrimitives'

export function ScenarioJumpoffBlock(props: {
  blockId: string
  title: string
  descriptionEn?: string
  href: string
  confirmLabel?: string
  linkLabel?: string
  /** Optional FluentCopilot entry points — never replace the in-pack primary CTA. */
  optionalDeepLinks?: { label: string; href: string }[]
  compact?: boolean
  disabled?: boolean
  onComplete: (result: ExerciseBlockResultPayload) => void
}) {
  const { title, descriptionEn, href, confirmLabel, linkLabel, optionalDeepLinks, compact, disabled, onComplete } = props
  const extras = (optionalDeepLinks ?? []).filter((l) => l.href?.trim() && l.label?.trim())

  return (
    <BlockSurface compact={compact} data-block-id={props.blockId}>
      <h3 className="text-body font-bold text-ink-primary">{title}</h3>
      {descriptionEn ? <p className="text-caption text-ink-secondary leading-snug">{descriptionEn}</p> : null}
      <Link
        href={href}
        className="inline-flex min-h-touch items-center justify-center rounded-2xl border border-primary-200 bg-primary-50 px-4 py-3 text-body-sm font-semibold text-primary-900 w-full text-center hover:bg-primary-100"
      >
        {linkLabel ?? 'Open in app'}
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
        {confirmLabel ?? 'Continue'}
      </Button>
    </BlockSurface>
  )
}
