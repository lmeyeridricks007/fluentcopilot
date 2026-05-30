import { SKILL_FOCUS_LABELS } from '@/lib/practice/scenarioCatalog'
import type { ScenarioSkillFocus } from '@/lib/schemas/practice/scenarioCatalogEntry.schema'

export function SkillTagList({
  skills,
  max = 4,
  size = 'sm',
}: {
  skills: ScenarioSkillFocus[]
  max?: number
  size?: 'sm' | 'xs'
}) {
  const show = skills.slice(0, max)
  if (show.length === 0) return null
  const text = size === 'xs' ? 'text-caption' : 'text-body-sm'
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Skills practiced">
      {show.map((s) => (
        <li
          key={s}
          className={`${text} font-medium text-ink-secondary bg-surface-muted px-2 py-0.5 rounded-md border border-slate-200/80`}
        >
          {SKILL_FOCUS_LABELS[s]}
        </li>
      ))}
    </ul>
  )
}
