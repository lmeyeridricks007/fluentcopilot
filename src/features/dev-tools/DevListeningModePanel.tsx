'use client'

import { useMemo, useState } from 'react'
import { LISTENING_CLIP_BANK, LISTENING_PACKS } from '@/lib/listening-mode/catalog'
import { readListeningProfile } from '@/lib/listening-mode/listeningProfileStorage'
import { useAuthStore } from '@/store/authStore'
import { LOCAL_ANONYMOUS_LEARNER_ID } from '@/lib/storage/storageKeys'

export function DevListeningModePanel() {
  const userId = useAuthStore((s) => s.user?.id ?? LOCAL_ANONYMOUS_LEARNER_ID)
  const profile = useMemo(() => readListeningProfile(userId), [userId])
  const [open, setOpen] = useState(false)

  return (
    <section className="rounded-xl border border-slate-200 bg-surface-elevated p-4 space-y-2">
      <h2 className="text-body-sm font-semibold text-ink-primary">Listening mode (debug)</h2>
      <p className="text-caption text-ink-secondary leading-relaxed">
        Local profile stress + catalog ids. Session-level debug lives on the session screen when dev tools are enabled.
      </p>
      <button
        type="button"
        className="text-caption font-semibold text-primary-700 hover:underline"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? 'Hide payload' : 'Show payload'}
      </button>
      {open ? (
        <pre className="max-h-64 overflow-auto rounded-lg bg-slate-900/90 p-3 text-[10px] leading-snug text-slate-100">
          {JSON.stringify(
            {
              packs: LISTENING_PACKS.map((p) => ({ id: p.id, scenarioId: p.scenarioId, clipIds: p.clipIds })),
              clipIds: Object.keys(LISTENING_CLIP_BANK),
              dimensionStress: profile.dimensionStress,
              sessionIds: profile.sessionIds.slice(0, 6),
            },
            null,
            2
          )}
        </pre>
      ) : null}
    </section>
  )
}
