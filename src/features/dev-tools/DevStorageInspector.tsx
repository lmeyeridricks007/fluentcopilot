'use client'

import { useMemo, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { buildDevStorageSnapshot } from '@/lib/dev-tools'

export function DevStorageInspector() {
  const [tick, setTick] = useState(0)
  const snap = useMemo(() => buildDevStorageSnapshot(), [tick])

  return (
    <Card variant="outlined" padding="md" className="space-y-3 border-amber-200/80 bg-amber-50/20">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-body-sm font-bold text-ink-primary uppercase tracking-wide">Inspect storage</h2>
        <Button type="button" size="sm" variant="secondary" onClick={() => setTick((t) => t + 1)}>
          Refresh snapshot
        </Button>
      </div>
      <p className="text-caption text-ink-secondary">
        Read-only view of persisted documents for <code className="text-ink-primary">{snap.userId ?? '—'}</code>.
      </p>
      {snap.resumableSummary ? (
        <p className="text-caption text-ink-secondary">
          <span className="font-semibold text-ink-primary">Resume priority:</span> {snap.resumableSummary}
        </p>
      ) : null}
      <div className="space-y-2">
        <p className="text-caption font-semibold text-ink-tertiary">Auth session (Zustand persist)</p>
        <pre className="text-caption bg-surface-muted border border-slate-200 rounded-lg p-3 overflow-auto max-h-48 whitespace-pre-wrap break-all">
          {snap.authSession ? JSON.stringify(snap.authSession, null, 2) : '—'}
        </pre>
      </div>
      <div className="space-y-2">
        <p className="text-caption font-semibold text-ink-tertiary">Learner profile document</p>
        <pre className="text-caption bg-surface-muted border border-slate-200 rounded-lg p-3 overflow-auto max-h-64 whitespace-pre-wrap break-all">
          {snap.profileJson ?? '—'}
        </pre>
      </div>
      <div className="space-y-2">
        <p className="text-caption font-semibold text-ink-tertiary">Progress manifest</p>
        <pre className="text-caption bg-surface-muted border border-slate-200 rounded-lg p-3 overflow-auto max-h-64 whitespace-pre-wrap break-all">
          {snap.progressJson ?? '—'}
        </pre>
      </div>
      <div className="space-y-2">
        <p className="text-caption font-semibold text-ink-tertiary">Drafts document</p>
        <pre className="text-caption bg-surface-muted border border-slate-200 rounded-lg p-3 overflow-auto max-h-48 whitespace-pre-wrap break-all">
          {snap.draftsJson ?? '—'}
        </pre>
      </div>
      <div className="space-y-2">
        <p className="text-caption font-semibold text-ink-tertiary">
          Cold-start wipe keys with data ({snap.populatedWipeKeys.length})
        </p>
        <ul className="text-caption text-ink-secondary max-h-40 overflow-auto space-y-1 list-none p-0 m-0">
          {snap.populatedWipeKeys.map(({ key, byteLength }) => (
            <li key={key} className="font-mono break-all">
              {key} <span className="text-ink-tertiary">({byteLength} B)</span>
            </li>
          ))}
          {snap.populatedWipeKeys.length === 0 ? <li className="text-ink-tertiary">No keys from wipe list currently hold data.</li> : null}
        </ul>
      </div>
    </Card>
  )
}
