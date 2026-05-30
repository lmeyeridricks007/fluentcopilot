/**
 * App shell navigation — bottom tabs, header back/brand/title.
 * IA doc: `docs/product/behavior-driven-app-architecture.md`
 */

import { APP_COACH_HUB, APP_EXAM_HUB, APP_LIBRARY_CAPTURE, APP_LIBRARY_HUB, APP_TALK_HUB } from '@/lib/routing/appRoutes'

/** Logged-in “tab root” paths (exactly `/app/<segment>` — two segments under app). */
export const APP_TAB_ROOT_PATHS = new Set([
  '/app/home',
  APP_TALK_HUB,
  '/app/learn',
  '/app/practice',
  APP_EXAM_HUB,
  '/app/exam',
  APP_COACH_HUB,
  APP_LIBRARY_HUB,
  '/app/settings',
  '/app/revision',
  '/app/leaderboard',
  '/app/premium',
  '/app/achievements',
  '/app/reflection',
  '/app/dev-tools',
])

/** Bottom nav primary tabs (order matters). */
export const BOTTOM_NAV_TABS: { href: string; label: string }[] = [
  { href: APP_TALK_HUB, label: 'Talk' },
  { href: APP_COACH_HUB, label: 'Coach' },
  { href: APP_EXAM_HUB, label: 'Exam' },
  { href: APP_LIBRARY_HUB, label: 'Library' },
]

export function isAppTabRootPath(pathname: string): boolean {
  const normalized = pathname.split('?')[0].replace(/\/$/, '') || '/'
  return APP_TAB_ROOT_PATHS.has(normalized)
}

/** True when the header should use back + title (deep stack). */
export function headerShowsBack(pathname: string): boolean {
  const parts = pathname.split('/').filter(Boolean)
  if (parts[0] !== 'app') return false
  return parts.length > 2
}

/** Tapping the wordmark jumps to Talk when not already there. */
export function brandTapNavigatesHome(pathname: string): boolean {
  const parts = pathname.split('/').filter(Boolean)
  if (parts[0] !== 'app' || parts.length !== 2) return false
  return pathname.replace(/\/$/, '') !== APP_TALK_HUB
}

const HEADER_TITLE_PREFIXES: { test: (p: string) => boolean; title: string }[] = [
  { test: (p) => p.startsWith(APP_TALK_HUB) || p.startsWith('/app/practice'), title: 'Talk' },
  { test: (p) => p.startsWith(APP_COACH_HUB), title: 'Coach' },
  { test: (p) => p.startsWith('/app/review'), title: 'Review' },
  { test: (p) => p.startsWith('/app/progress'), title: 'Progress' },
  { test: (p) => p.startsWith('/app/learn'), title: 'Library' },
  { test: (p) => p.startsWith(APP_LIBRARY_CAPTURE), title: 'Capture' },
  { test: (p) => p.startsWith(APP_LIBRARY_HUB), title: 'Library' },
  { test: (p) => p.startsWith('/app/revision'), title: 'Revision' },
  { test: (p) => p.startsWith('/app/exam-prep') || p.startsWith('/app/exam'), title: 'Exam' },
  { test: (p) => p.startsWith('/app/settings'), title: 'Account' },
  { test: (p) => p.startsWith('/app/daily-lessons'), title: 'Daily lessons' },
  { test: (p) => p.startsWith('/app/context-prompts'), title: 'Prompts' },
  { test: (p) => p.startsWith('/app/dev-tools'), title: 'Dev tools' },
]

/** Title shown in the header center on deep screens. */
export function headerCenterTitle(pathname: string): string {
  const p = pathname.split('?')[0]
  for (const { test, title } of HEADER_TITLE_PREFIXES) {
    if (test(p)) return title
  }
  return 'FluentCopilot'
}
