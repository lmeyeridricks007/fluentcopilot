'use client'

import { clsx } from 'clsx'

/** Compact premium chips — max 2 recommended at call sites. */
export function TalkSkillSignalRow({ chips, className }: { chips: string[]; className?: string }) {
  if (!chips.length) return null
  return (
    <div className={clsx('flex flex-wrap gap-1.5', className)} aria-label="Skill signals">
      {chips.map((c) => (
        <span
          key={c}
          className="inline-flex max-w-full items-center rounded-full border border-slate-200/90 bg-white/95 px-2.5 py-1 text-[11px] font-semibold leading-snug text-slate-700 shadow-sm"
        >
          <span className="truncate">{c}</span>
        </span>
      ))}
    </div>
  )
}
