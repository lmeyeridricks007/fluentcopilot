/**
 * FD-09 — generated lesson header (title, date, scenarios).
 */

import type { GeneratedDailyLesson } from '../types'

interface GeneratedLessonHeaderProps {
  lesson: GeneratedDailyLesson
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return 'Today'
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
}

export function GeneratedLessonHeader({ lesson }: GeneratedLessonHeaderProps) {
  return (
    <header className="pb-4 border-b border-slate-200">
      <p className="text-caption text-ink-tertiary">{formatDate(lesson.date)}</p>
      <h1 className="text-title font-bold text-ink-primary mt-1">{lesson.title}</h1>
      {lesson.scenarios.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {lesson.scenarios.map((s) => (
            <span
              key={s.scenarioId}
              className="inline-flex items-center rounded-full px-2 py-0.5 text-caption font-medium bg-primary-100 text-primary-700"
            >
              {s.title}
            </span>
          ))}
        </div>
      )}
    </header>
  )
}
