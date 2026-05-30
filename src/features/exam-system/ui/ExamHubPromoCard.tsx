'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'

type Variant = 'simulation' | 'training' | 'neutral'

const variantClass: Record<Variant, string> = {
  simulation:
    'border-slate-800/10 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white shadow-lg shadow-slate-900/20',
  training:
    'border-primary-600/15 bg-gradient-to-br from-primary-800 via-primary-700 to-primary-900 text-white shadow-lg shadow-primary-900/15',
  neutral: 'border-slate-200/90 bg-white text-ink-primary shadow-sm shadow-slate-900/5',
}

export function ExamHubPromoCard(props: {
  href: string
  variant: Variant
  icon: ReactNode
  title: string
  subtitle: string
  meta?: string
}) {
  const { href, variant, icon, title, subtitle, meta } = props
  const isDark = variant === 'simulation' || variant === 'training'
  return (
    <Link
      href={href}
      className={clsx(
        'group relative flex w-full items-stretch gap-3.5 rounded-2xl border p-4 min-h-touch transition-transform duration-200 active:scale-[0.99]',
        variantClass[variant],
      )}
    >
      <span
        className={clsx(
          'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
          isDark ? 'bg-white/12 text-white' : 'bg-slate-100 text-slate-800',
        )}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1 text-left">
        <p
          className={clsx(
            'text-[10px] font-bold uppercase tracking-[0.14em]',
            isDark ? 'text-white/70' : 'text-slate-500',
          )}
        >
          {meta}
        </p>
        <p className={clsx('text-body font-bold tracking-tight mt-0.5', isDark ? 'text-white' : 'text-ink-primary')}>
          {title}
        </p>
        <p className={clsx('text-caption mt-1 leading-snug', isDark ? 'text-white/75' : 'text-ink-secondary')}>
          {subtitle}
        </p>
      </div>
      <ChevronRight
        className={clsx(
          'h-5 w-5 shrink-0 self-center transition-transform duration-200 group-hover:translate-x-0.5',
          isDark ? 'text-white/50' : 'text-slate-400',
        )}
        aria-hidden
      />
    </Link>
  )
}
