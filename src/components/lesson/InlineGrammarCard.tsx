'use client'

import { useState } from 'react'
import { clsx } from 'clsx'

export type GrammarInlineContent = {
  title: string
  summary: string
  examples: { nl: string; en?: string }[]
}

type Props = {
  content: GrammarInlineContent
  onExpand: () => void
}

export function InlineGrammarCard({ content, onExpand }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-card border border-slate-200 bg-surface-elevated overflow-hidden shadow-card">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o)
          onExpand()
        }}
        className="w-full flex items-center justify-between min-h-touch px-4 py-3 text-left"
      >
        <span className="font-semibold text-ink-primary">{content.title}</span>
        <span className="text-primary-600 text-body-lg">{open ? '−' : '+'}</span>
      </button>
      <div
        className={clsx(
          'grid transition-[grid-template-rows] duration-300 ease-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4 pt-0 space-y-3 border-t border-slate-100">
            <p
              className="text-body-sm text-ink-secondary leading-relaxed"
              dangerouslySetInnerHTML={{ __html: content.summary.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
            />
            <ul className="space-y-2">
              {content.examples.map((ex, i) => (
                <li key={i} className="text-body-sm">
                  <span className="text-ink-primary font-medium">{ex.nl}</span>
                  {ex.en && <span className="block text-caption text-ink-tertiary">{ex.en}</span>}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
