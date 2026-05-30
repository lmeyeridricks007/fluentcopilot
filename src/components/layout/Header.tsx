'use client'

import { usePathname, useRouter } from 'next/navigation'
import { ArrowLeft, Flame, Plus, Sparkles, Zap } from 'lucide-react'
import Link from 'next/link'
import { isDevToolsRouteEnabled } from '@/lib/dev-tools'
import {
  brandTapNavigatesHome,
  headerCenterTitle,
  headerShowsBack,
} from '@/lib/routing/appNavigation'
import { ProfileAvatarLink } from './ProfileAvatarLink'
import { useQuickCaptureOptional } from '@/components/capture/QuickCaptureContext'
import { playAppSound } from '@/lib/interaction/appSounds'
import { useProgression } from '@/lib/hooks/useProgression'
import { APP_MOMENTUM, APP_TALK_HUB } from '@/lib/routing/appRoutes'

export function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const { streak, xpWeek } = useProgression()
  const quickCapture = useQuickCaptureOptional()
  const showBack = headerShowsBack(pathname)
  const deepTitle = headerCenterTitle(pathname)
  const brandToHome = brandTapNavigatesHome(pathname)

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back()
    else router.push(APP_TALK_HUB)
  }

  const handleBrand = () => {
    if (brandToHome) router.push(APP_TALK_HUB)
  }

  return (
    <header className="sticky top-0 z-40 bg-surface-elevated/85 lg:bg-surface-subtle/80 backdrop-blur-md border-b border-slate-200/70 safe-area-pt">
      <div className="grid grid-cols-[minmax(2.75rem,1fr)_minmax(0,3fr)_minmax(2.75rem,1fr)] items-center gap-1 min-h-[56px] px-3 sm:px-4 lg:px-8 max-w-[1180px] mx-auto w-full">
        <div className="flex justify-start min-w-0">
          {showBack ? (
            <button
              type="button"
              onClick={handleBack}
              className="flex h-11 w-11 min-h-touch min-w-touch items-center justify-center rounded-xl hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-ink-primary" aria-hidden />
            </button>
          ) : (
            /* Mobile-only brand (sidebar shows the desktop brand). */
            <button
              type="button"
              onClick={handleBrand}
              className="lg:hidden inline-flex items-center gap-2 min-h-touch px-1.5 py-1 rounded-xl hover:bg-surface-muted/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
              aria-label={brandToHome ? 'Go to Talk' : 'FluentCopilot'}
            >
              <span className="fc-brand-mark h-8 w-8">
                <Sparkles className="h-4 w-4" strokeWidth={2.4} aria-hidden />
              </span>
              <span className="text-[14px] font-bold tracking-tight text-ink-primary">FluentCopilot</span>
            </button>
          )}
        </div>

        <div className="min-w-0 flex justify-center px-1">
          {showBack ? (
            <h1 className="text-body-sm font-semibold text-ink-primary tracking-tight truncate text-center w-full">
              {deepTitle}
            </h1>
          ) : null}
        </div>

        <div className="flex justify-end items-center gap-1.5 min-w-0">
          {/* Streak pill — orange capsule on desktop, compact column on mobile. */}
          <Link
            href={APP_MOMENTUM}
            className="hidden sm:inline-flex items-center gap-1.5 min-h-touch rounded-full bg-orange-50 px-3 py-1.5 text-orange-700 ring-1 ring-orange-200/80 hover:bg-orange-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
            aria-label={streak > 0 ? `Practice streak ${streak} days` : 'Practice streak'}
          >
            <Flame className="h-4 w-4 shrink-0" strokeWidth={2.25} aria-hidden />
            <span className="text-[12px] font-bold tabular-nums">
              {streak > 0 ? `${streak} day${streak === 1 ? '' : 's'} streak` : 'No streak'}
            </span>
          </Link>
          <Link
            href={APP_MOMENTUM}
            className="sm:hidden flex min-h-touch min-w-[2.75rem] flex-col items-center justify-center rounded-xl px-1 py-0.5 text-orange-700 hover:bg-orange-50/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
            aria-label={streak > 0 ? `Practice streak ${streak} days` : 'Practice streak'}
          >
            <Flame className="h-4 w-4 shrink-0" strokeWidth={2.25} aria-hidden />
            <span className="text-[10px] font-bold leading-none tabular-nums">{streak > 0 ? `${streak}d` : '—'}</span>
          </Link>

          {/* XP pill — desktop only (sidebar shows lifetime). */}
          <Link
            href={APP_MOMENTUM}
            className="hidden sm:inline-flex items-center gap-1.5 min-h-touch rounded-full bg-primary-50 px-3 py-1.5 text-primary-800 ring-1 ring-primary-200/80 hover:bg-primary-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
            aria-label={`${xpWeek} XP this week`}
          >
            <Zap className="h-4 w-4 shrink-0" strokeWidth={2.25} aria-hidden />
            <span className="text-[12px] font-bold tabular-nums">{xpWeek} XP</span>
          </Link>

          {quickCapture ? (
            <button
              type="button"
              onClick={() => {
                playAppSound('tap')
                quickCapture.open()
              }}
              className="flex h-10 w-10 min-h-touch min-w-touch items-center justify-center rounded-full bg-brand-gradient text-white shadow-hero transition-[transform,filter] duration-200 hover:brightness-110 active:scale-[0.96] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
              aria-label="Quick capture — save to Library"
            >
              <Plus className="w-5 h-5" strokeWidth={2.5} aria-hidden />
            </button>
          ) : null}
          {isDevToolsRouteEnabled() ? (
            <Link
              href="/app/dev-tools"
              className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 hover:text-amber-800/80 px-1 py-1 rounded-md border border-transparent hover:border-amber-200/60 hover:bg-amber-50/50 transition-colors leading-none shrink-0"
              title="Internal dev tools"
            >
              Dev
            </Link>
          ) : null}
          {/* Avatar only on mobile; desktop sidebar already shows the user card. */}
          <span className="lg:hidden">
            <ProfileAvatarLink />
          </span>
        </div>
      </div>
    </header>
  )
}
