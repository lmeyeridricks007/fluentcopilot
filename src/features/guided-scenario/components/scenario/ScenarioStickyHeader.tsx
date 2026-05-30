'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export function ScenarioStickyHeader({
  backHref,
  backLabel,
  title,
  subtitle,
  right,
}: {
  backHref: string
  backLabel: string
  title: string
  subtitle?: string
  right?: ReactNode
}) {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 -mx-4 px-4 py-2.5 bg-surface-elevated/92 backdrop-blur-md border-b border-slate-200/80">
      <Link
        href={backHref}
        className="min-h-touch min-w-touch inline-flex items-center justify-center rounded-xl text-ink-secondary hover:bg-slate-100/90 shrink-0 -ml-1"
        aria-label={backLabel}
      >
        <ArrowLeft className="w-5 h-5" aria-hidden />
      </Link>
      <div className="min-w-0 flex-1">
        <h1 className="text-body font-bold text-ink-primary tracking-tight truncate">{title}</h1>
        {subtitle ? <p className="text-caption text-ink-secondary truncate">{subtitle}</p> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </header>
  )
}
