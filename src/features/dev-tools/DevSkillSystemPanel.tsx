'use client'

import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { conversationClient } from '@/lib/api/conversationClient'
import { isFeature1ChatBackendEnabled } from '@/lib/api/apiConfig'

function JsonBlock({ title, value }: { title: string; value: unknown }) {
  const [open, setOpen] = useState(true)
  const text = useMemo(() => JSON.stringify(value, null, 2), [value])
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/80 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-left text-caption font-semibold text-slate-800 hover:bg-slate-100/80"
      >
        {title}
        <span className="text-slate-400">{open ? '−' : '+'}</span>
      </button>
      {open ? (
        <pre className="text-[10px] leading-snug text-slate-700 max-h-72 overflow-auto p-3 border-t border-slate-200 bg-white">
          {text}
        </pre>
      ) : null}
    </div>
  )
}

/**
 * Skill System QA panel — only mounted from Dev Tools (route already gated).
 * Fetches extended payload only when chat backend is enabled and API is non-production with dev header.
 */
export function DevSkillSystemPanel() {
  const backend = isFeature1ChatBackendEnabled()
  const q = useQuery({
    queryKey: ['dev-tools', 'skill-system-debug'],
    queryFn: () => conversationClient.getTalkSkillProfile({ forDevToolsSkillDebug: true }),
    enabled: backend,
    staleTime: 15_000,
  })

  if (!backend) {
    return (
      <section className="rounded-xl border border-slate-200 bg-surface-elevated p-4 space-y-2">
        <h2 className="text-body-sm font-semibold text-ink-primary">Skill System (debug)</h2>
        <p className="text-caption text-ink-secondary leading-relaxed">
          Enable the practice / chat backend (<code className="text-xs bg-surface-muted px-1 rounded">NEXT_PUBLIC_API_BASE_URL</code>)
          to load skill profile debug data.
        </p>
      </section>
    )
  }

  if (q.isLoading) {
    return (
      <section className="rounded-xl border border-slate-200 bg-surface-elevated p-4">
        <p className="text-caption text-ink-secondary">Loading skill debug snapshot…</p>
      </section>
    )
  }

  if (q.isError) {
    return (
      <section className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-2">
        <h2 className="text-body-sm font-semibold text-ink-primary">Skill System (debug)</h2>
        <p className="text-caption text-red-800">Could not load skills profile. Check API URL and sign-in.</p>
      </section>
    )
  }

  const data = q.data
  const debug = data?.skillSystemDebug
  const profile = data?.profile

  return (
    <section className="rounded-xl border border-slate-200 bg-surface-elevated p-4 space-y-3">
      <div>
        <h2 className="text-body-sm font-semibold text-ink-primary">Skill System (debug)</h2>
        <p className="text-caption text-ink-secondary mt-1 leading-relaxed">
          Extended payload only when the API runs with <code className="text-xs bg-surface-muted px-1 rounded">NODE_ENV !== production</code> and the dev-tools header is sent (this page does that automatically).
        </p>
      </div>

      <p className="text-caption text-ink-secondary">
        Cold start (product): <span className="font-medium text-ink-primary">{data?.coldStart ? 'yes' : 'no'}</span>
        {!debug ? (
          <span className="block mt-1 text-amber-900">
            No <code className="text-xs">skillSystemDebug</code> in response — production API or header not applied.
          </span>
        ) : null}
      </p>

      {debug ? (
        <div className="space-y-2">
          <JsonBlock title="Learning meta" value={(debug as { learningMeta?: unknown }).learningMeta} />
          <JsonBlock title="Scores table (per skill)" value={(debug as { scoresTable?: unknown }).scoresTable} />
          <JsonBlock title="Active focus & overall" value={(debug as { activeFocus?: unknown }).activeFocus} />
          <JsonBlock title="Persisted recommendations (profile JSON)" value={(debug as { persistedRecommendations?: unknown }).persistedRecommendations} />
          <JsonBlock title="Fresh skill-driven plan (recomputed)" value={(debug as { skillDrivenPlanFresh?: unknown }).skillDrivenPlanFresh} />
          <JsonBlock title="Talk / landing skills preview" value={(debug as { talkSkillsPreview?: unknown }).talkSkillsPreview} />
          <JsonBlock title="Truncation (evidence / snapshots)" value={(debug as { truncation?: unknown }).truncation} />
          <JsonBlock title="User skill profile (tail evidence)" value={(debug as { userSkillProfile?: unknown }).userSkillProfile} />
          {(debug as { personalizedTrainingLoops?: unknown }).personalizedTrainingLoops ? (
            <JsonBlock
              title="Personalized training loops (generation + lifecycle)"
              value={(debug as { personalizedTrainingLoops?: unknown }).personalizedTrainingLoops}
            />
          ) : null}
        </div>
      ) : profile ? (
        <JsonBlock title="API profile only (no debug envelope)" value={profile} />
      ) : (
        <p className="text-caption text-ink-secondary">No profile row yet for this user.</p>
      )}
    </section>
  )
}
