/**
 * Dev-only: switch demo data scenario via dropdown.
 * Sets localStorage 'demoScenario' and reloads so the app loads the selected scenario.
 */

import type { DemoScenarioId } from '@/demo-data'

const SCENARIOS: { value: DemoScenarioId; label: string }[] = [
  { value: 'happy-path', label: 'Happy path' },
  { value: 'new-user', label: 'New user' },
  { value: 'at-cap', label: 'At cap' },
  { value: 'trial', label: 'Trial' },
  { value: 'premium', label: 'Premium' },
  { value: 'power-user', label: 'Power user' },
  { value: 'edge-case', label: 'Edge case' },
]

const STORAGE_KEY = 'demoScenario'

export function DevScenarioSwitcher() {
  if (process.env.NODE_ENV === 'production') return null

  const current =
    (typeof window !== 'undefined' && (window.localStorage.getItem(STORAGE_KEY) as DemoScenarioId | null)) ||
    'happy-path'

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as DemoScenarioId
    window.localStorage.setItem(STORAGE_KEY, value)
    window.location.reload()
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="dev-scenario" className="text-caption text-ink-tertiary whitespace-nowrap">
        Demo:
      </label>
      <select
        id="dev-scenario"
        value={current}
        onChange={handleChange}
        className="text-caption bg-surface-muted border border-slate-200 rounded-md px-2 py-1 text-ink-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
        aria-label="Switch demo data scenario"
      >
        {SCENARIOS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  )
}
