'use client'

import { Flame } from 'lucide-react'
import { clsx } from 'clsx'

export function StreakBadge({ streak, className }: { streak: number; className?: string }) {
  return (
    <div
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-body-sm font-semibold text-amber-900',
        className
      )}
    >
      <Flame className="w-4 h-4 text-amber-600" aria-hidden />
      <span>{streak} day streak</span>
    </div>
  )
}
