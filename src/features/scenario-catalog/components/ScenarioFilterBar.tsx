'use client'

import { clsx } from 'clsx'
import { SlidersHorizontal } from 'lucide-react'
import type { ScenarioCatalogFilterState, PremiumCatalogFilter } from '@/lib/practice/applyScenarioCatalogFilters'
import {
  CATALOG_CATEGORY_LABELS,
  READINESS_LABELS,
  SKILL_FOCUS_LABELS,
  MODE_LABELS,
  practiceConversationModes,
} from '@/lib/practice/scenarioCatalog'
import type { ScenarioCatalogCategory } from '@/lib/schemas/practice/scenarioCatalogEntry.schema'
import type { ScenarioReadiness } from '@/lib/schemas/practice/scenarioCatalogEntry.schema'
import type { ScenarioSkillFocus } from '@/lib/schemas/practice/scenarioCatalogEntry.schema'
const CATEGORIES: ScenarioCatalogCategory[] = [
  'food',
  'work',
  'health',
  'municipality',
  'housing',
  'transport',
  'social',
  'problem_solving',
  'appointments',
]

const READINESS: ScenarioReadiness[] = [
  'beginner_friendly',
  'a2_1',
  'a2_2',
  'near_b1',
  'confident_practice',
]

const SKILLS: ScenarioSkillFocus[] = [
  'speaking',
  'listening',
  'reading',
  'writing',
  'conversation_repair',
  'polite_requests',
  'clarification',
  'fluency',
  'workplace_register',
  'housing_register',
  'requests',
]

function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]
}

interface ScenarioFilterBarProps {
  filters: ScenarioCatalogFilterState
  onChange: (next: ScenarioCatalogFilterState) => void
  expanded: boolean
  onToggleExpanded: () => void
}

export function ScenarioFilterBar({
  filters,
  onChange,
  expanded,
  onToggleExpanded,
}: ScenarioFilterBarProps) {
  const chip = (active: boolean) =>
    clsx(
      'shrink-0 rounded-full border px-3 py-1.5 text-caption font-medium transition-colors min-h-touch flex items-center',
      active
        ? 'border-primary-500 bg-primary-50 text-primary-800'
        : 'border-slate-200 bg-surface-elevated text-ink-secondary hover:bg-surface-muted'
    )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-caption font-semibold text-ink-secondary uppercase tracking-wide flex items-center gap-1.5">
          <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden />
          Filters
        </p>
        <button
          type="button"
          onClick={onToggleExpanded}
          className="text-caption font-medium text-primary-600 hover:underline min-h-touch px-1"
        >
          {expanded ? 'Hide' : 'Show all'}
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
        <span className="text-caption text-ink-tertiary shrink-0 py-1.5">Category</span>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            className={chip(filters.category === c)}
            onClick={() =>
              onChange({
                ...filters,
                category: filters.category === c ? null : c,
              })
            }
          >
            {CATALOG_CATEGORY_LABELS[c].short}
          </button>
        ))}
      </div>

      {expanded ? (
        <>
          <div>
            <p className="text-caption text-ink-tertiary mb-1.5">Level</p>
            <div className="flex flex-wrap gap-2">
              {READINESS.map((r) => (
                <button
                  key={r}
                  type="button"
                  className={chip(filters.readiness.includes(r))}
                  onClick={() =>
                    onChange({ ...filters, readiness: toggle(filters.readiness, r) })
                  }
                >
                  {READINESS_LABELS[r]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-caption text-ink-tertiary mb-1.5">Skill focus</p>
            <div className="flex flex-wrap gap-2">
              {SKILLS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={chip(filters.skillFocus.includes(s))}
                  onClick={() =>
                    onChange({ ...filters, skillFocus: toggle(filters.skillFocus, s) })
                  }
                >
                  {SKILL_FOCUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-caption text-ink-tertiary mb-1.5">Mode</p>
            <div className="flex flex-wrap gap-2">
              {practiceConversationModes.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={chip(filters.modes.includes(m))}
                  onClick={() => onChange({ ...filters, modes: toggle(filters.modes, m) })}
                >
                  {MODE_LABELS[m]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-caption text-ink-tertiary mb-1.5">Access</p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['all', 'All'],
                  ['free_only', 'Free'],
                  ['premium_ok', 'Premium'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={chip(filters.premium === key)}
                  onClick={() =>
                    onChange({ ...filters, premium: key as PremiumCatalogFilter })
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <button
              type="button"
              className={chip(filters.weakOnly)}
              onClick={() => onChange({ ...filters, weakOnly: !filters.weakOnly })}
            >
              Helps my weak areas
            </button>
          </div>
        </>
      ) : null}
    </div>
  )
}
