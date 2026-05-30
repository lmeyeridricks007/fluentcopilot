/**
 * FD-08 — frequency preference (always / once per venue / daily).
 */

import type { PromptPreferences } from '../types'

type Frequency = PromptPreferences['frequency']

const OPTIONS: { value: Frequency; label: string }[] = [
  { value: 'always', label: 'Whenever I’m near a place' },
  { value: 'once_per_venue', label: 'Once per place per day' },
  { value: 'daily', label: 'At most once per day' },
]

interface PromptFrequencySelectorProps {
  value: Frequency
  onChange: (v: Frequency) => void
  disabled?: boolean
}

export function PromptFrequencySelector({ value, onChange, disabled }: PromptFrequencySelectorProps) {
  return (
    <div className="space-y-2" role="radiogroup" aria-label="Prompt frequency">
      {OPTIONS.map((opt) => (
        <label
          key={opt.value}
          className="flex items-center gap-3 py-2 cursor-pointer"
        >
          <input
            type="radio"
            name="prompt-frequency"
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            disabled={disabled}
            className="border-slate-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-body text-ink-primary">{opt.label}</span>
        </label>
      ))}
    </div>
  )
}
