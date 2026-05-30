'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Award,
  BookOpen,
  ClipboardList,
  Flame,
  LineChart,
  MessageCircle,
  Settings,
  Sparkles,
  Trophy,
  Zap,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useAuthStore } from '@/store/authStore'
import {
  APP_COACH_HUB,
  APP_EXAM_SYSTEM,
  APP_LIBRARY_HUB,
  APP_TALK_HUB,
} from '@/lib/routing/appRoutes'
import { pathnameMatchesExamsNav } from '@/lib/routing/examsNav'
import { useProgression } from '@/lib/hooks/useProgression'

type NavItem = {
  to: string
  icon: typeof MessageCircle
  label: string
  matches?: (pathname: string) => boolean
}

const primaryNav: ReadonlyArray<NavItem> = [
  {
    to: APP_TALK_HUB,
    icon: MessageCircle,
    label: 'Talk',
    matches: (p) =>
      p === APP_TALK_HUB ||
      p.startsWith(`${APP_TALK_HUB}/`) ||
      p.startsWith('/app/practice'),
  },
  {
    to: APP_COACH_HUB,
    icon: Sparkles,
    label: 'Coach',
    matches: (p) =>
      p === APP_COACH_HUB ||
      p.startsWith(`${APP_COACH_HUB}/`) ||
      p.startsWith('/app/review') ||
      p.startsWith('/app/progress'),
  },
  {
    to: APP_LIBRARY_HUB,
    icon: BookOpen,
    label: 'Library',
    matches: (p) =>
      p === APP_LIBRARY_HUB ||
      p.startsWith(`${APP_LIBRARY_HUB}/`) ||
      p.startsWith('/app/learn') ||
      p.startsWith('/app/revision'),
  },
  {
    to: APP_EXAM_SYSTEM,
    icon: ClipboardList,
    label: 'Exam',
    matches: (p) => pathnameMatchesExamsNav(p),
  },
  { to: '/app/progress', icon: LineChart, label: 'Progress' },
  { to: '/app/leaderboard', icon: Trophy, label: 'Leaderboard' },
  { to: '/app/achievements', icon: Award, label: 'Achievements' },
  { to: '/app/settings', icon: Settings, label: 'Settings' },
] as const

function initialsFromUser(name: string | undefined, email: string | undefined): string {
  const raw = (name || email || '').trim()
  if (!raw) return ''
  if (name && name.includes(' ')) {
    const p = name.trim().split(/\s+/)
    return `${p[0][0] ?? ''}${p[1]?.[0] ?? ''}`.toUpperCase().slice(0, 2)
  }
  const local = email?.split('@')[0] ?? raw
  return local.slice(0, 2).toUpperCase()
}

/**
 * Desktop sidebar for the authenticated app shell.
 * Hidden on mobile (where the BottomNav handles primary navigation).
 */
export function Sidebar() {
  const pathname = usePathname() ?? ''
  const user = useAuthStore((s) => s.user)
  const { streak, xpWeek } = useProgression()
  const initials = initialsFromUser(user?.name, user?.email)
  const displayName = user?.name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'You'

  return (
    <aside
      className="hidden lg:flex sticky top-0 h-screen w-[248px] shrink-0 flex-col border-r border-slate-200/70 bg-surface-elevated/90 backdrop-blur-sm shadow-sidebar"
      aria-label="Primary"
    >
      {/* Brand */}
      <Link
        href={APP_TALK_HUB}
        className="flex items-center gap-2.5 px-5 pt-6 pb-5"
        aria-label="FluentCopilot home"
      >
        <span className="fc-brand-mark">
          <Sparkles className="h-4.5 w-4.5" strokeWidth={2.4} aria-hidden />
        </span>
        <span className="text-[17px] font-bold tracking-tight text-ink-primary">FluentCopilot</span>
      </Link>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        <ul className="space-y-1">
          {primaryNav.map(({ to, icon: Icon, label, matches }) => {
            const isActive = matches ? matches(pathname) : pathname === to || pathname.startsWith(`${to}/`)
            return (
              <li key={to}>
                <Link
                  href={to}
                  aria-current={isActive ? 'page' : undefined}
                  className={clsx(
                    'group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[14px] font-semibold transition-colors',
                    isActive
                      ? 'bg-primary-100 text-primary-800'
                      : 'text-slate-600 hover:bg-surface-muted hover:text-ink-primary'
                  )}
                >
                  <Icon
                    className={clsx(
                      'h-[18px] w-[18px] shrink-0',
                      isActive ? 'text-primary-700' : 'text-slate-500 group-hover:text-ink-primary'
                    )}
                    strokeWidth={isActive ? 2.25 : 2}
                    aria-hidden
                  />
                  <span className="truncate">{label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User card */}
      <div className="border-t border-slate-200/70 p-3">
        <Link
          href="/app/settings"
          className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface-muted transition-colors"
          aria-label="Account and settings"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary-100 to-accent-100 text-primary-800 text-[12px] font-bold ring-1 ring-primary-200/70">
            {initials || (
              <span aria-hidden>
                {(displayName[0] ?? 'U').toUpperCase()}
              </span>
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold text-ink-primary">{displayName}</span>
            <span className="flex items-center gap-2 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-0.5">
                <Flame className="h-3 w-3 text-orange-500" aria-hidden />
                {streak > 0 ? `${streak}d` : '—'}
              </span>
              <span className="text-slate-300">·</span>
              <span className="inline-flex items-center gap-0.5">
                <Zap className="h-3 w-3 text-primary-600" aria-hidden />
                {xpWeek} XP
              </span>
            </span>
          </span>
        </Link>
      </div>
    </aside>
  )
}
