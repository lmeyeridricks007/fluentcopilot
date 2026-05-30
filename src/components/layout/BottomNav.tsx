'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, ClipboardList, MessageCircle, Sparkles } from 'lucide-react'
import { clsx } from 'clsx'
import { pathnameMatchesExamsNav } from '@/lib/routing/examsNav'
import { playAppSound } from '@/lib/interaction/appSounds'
import { APP_COACH_HUB, APP_EXAM_SYSTEM, APP_LIBRARY_HUB, APP_TALK_HUB } from '@/lib/routing/appRoutes'

const navItems = [
  { to: APP_TALK_HUB, icon: MessageCircle, label: 'Talk' },
  { to: APP_COACH_HUB, icon: Sparkles, label: 'Coach' },
  { to: APP_EXAM_SYSTEM, icon: ClipboardList, label: 'Exam' },
  { to: APP_LIBRARY_HUB, icon: BookOpen, label: 'Library' },
] as const

function isTalkArea(pathname: string): boolean {
  if (pathname === APP_TALK_HUB || pathname.startsWith(`${APP_TALK_HUB}/`)) return true
  if (pathname.startsWith('/app/practice')) return true
  return false
}

function isCoachArea(pathname: string): boolean {
  if (pathname === APP_COACH_HUB || pathname.startsWith(`${APP_COACH_HUB}/`)) return true
  if (pathname.startsWith('/app/review')) return true
  if (pathname.startsWith('/app/progress')) return true
  return false
}

function isLibraryArea(pathname: string): boolean {
  if (pathname === APP_LIBRARY_HUB || pathname.startsWith(`${APP_LIBRARY_HUB}/`)) return true
  if (pathname.startsWith('/app/learn')) return true
  if (pathname.startsWith('/app/revision')) return true
  return false
}

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 bg-surface-elevated/95 backdrop-blur-md border-t border-slate-200/80 pb-safe-bottom z-50 shadow-[0_-8px_32px_-12px_rgba(15,23,42,0.10)]"
      role="navigation"
      aria-label="Main"
    >
      <div className="flex justify-between items-end min-h-[64px] px-3 pt-2 pb-1.5 gap-1 max-w-lg mx-auto w-full">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isTalk = to === APP_TALK_HUB
          const isCoach = to === APP_COACH_HUB
          const isExams = to === APP_EXAM_SYSTEM
          const isLibrary = to === APP_LIBRARY_HUB

          const isExamsArea = pathnameMatchesExamsNav(pathname)
          const isActive =
            pathname === to ||
            (isTalk && isTalkArea(pathname)) ||
            (isCoach && isCoachArea(pathname)) ||
            (isExams && isExamsArea) ||
            (isLibrary && isLibraryArea(pathname))

          return (
            <Link
              key={to}
              href={to}
              onClick={() => playAppSound('nav_tab')}
              className={clsx(
                'relative flex flex-col items-center justify-center flex-1 min-w-0 rounded-2xl',
                'min-h-[52px] px-1 py-1.5 gap-1',
                'text-[10px] sm:text-[11px] leading-tight font-semibold touch-manipulation select-none',
                'transition-[color,background-color,box-shadow,transform] duration-200 ease-out',
                'active:scale-[0.96]',
                isActive
                  ? 'text-primary-800 bg-primary-100 ring-1 ring-primary-300/50 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)]'
                  : 'text-slate-600 active:text-slate-800 active:bg-slate-100/80'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon
                className={clsx(
                  'w-[1.45rem] h-[1.45rem] sm:w-[1.5rem] sm:h-[1.5rem] shrink-0 transition-[transform,color] duration-200 ease-out',
                  isActive ? 'text-primary-700 scale-[1.05]' : 'text-slate-500'
                )}
                strokeWidth={isActive ? 2.35 : 2}
                aria-hidden
              />
              <span className="tracking-tight max-w-[4.5rem] truncate text-center">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
