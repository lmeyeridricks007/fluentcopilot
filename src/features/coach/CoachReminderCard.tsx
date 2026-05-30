'use client'

import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useCoachReminderStore } from '@/store/coachReminderStore'
import { playAppSound } from '@/lib/interaction/appSounds'

/** Local reminder preference — scheduling is mocked until push backend. */
export function CoachReminderCard() {
  const { enabled, hour, minute, label, setEnabled, setTime, setLabel } = useCoachReminderStore()

  return (
    <section
      className="rounded-2xl border border-primary-200/60 bg-primary-50/35 p-4 space-y-3"
      aria-label="Practice reminder"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-800">
          <Bell className="w-5 h-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-body-sm font-semibold text-ink-primary">Continue tomorrow</p>
          <p className="text-caption text-ink-secondary mt-0.5 leading-snug">
            We will nudge you on this device — full push notifications ship later.
          </p>
        </div>
      </div>
      <label className="flex items-center gap-2 min-h-touch cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => {
            playAppSound('tap')
            setEnabled(e.target.checked)
          }}
          className="h-4 w-4 rounded border-slate-300 text-primary-600"
        />
        <span className="text-body-sm text-ink-primary">Remind me to open FluentCopilot</span>
      </label>
      <div className="flex flex-wrap gap-2 items-center">
        <label className="text-caption text-ink-secondary">Time</label>
        <input
          type="time"
          value={`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`}
          onChange={(e) => {
            const [h, m] = e.target.value.split(':').map(Number)
            if (!Number.isNaN(h) && !Number.isNaN(m)) setTime(h, m)
          }}
          className="rounded-lg border border-slate-200 px-2 py-1.5 text-body-sm min-h-touch"
        />
      </div>
      <label className="block">
        <span className="text-caption text-ink-secondary">Note</span>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-body-sm min-h-touch"
          placeholder="e.g. Finish train-station thread"
        />
      </label>
      {enabled ? (
        <p className="text-caption text-ink-tertiary">
          Saved locally — you will see this intent in Coach; native alerts are not wired yet.
        </p>
      ) : null}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => {
          playAppSound('primary_action')
          setEnabled(true)
        }}
      >
        Turn on gentle ping
      </Button>
    </section>
  )
}
