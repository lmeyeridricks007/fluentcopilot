'use client'

import { useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useEntitlement, PaywallModal } from '@/features/entitlements'
import { setLastPracticeContinue } from '@/features/practice-hub'
import { getScenarioCatalogEntries } from '@/lib/practice/scenarioCatalog'
import { scenarioCatalogCategorySchema } from '@/lib/schemas/practice/scenarioCatalogEntry.schema'
import { isFeature1ChatBackendEnabled } from '@/lib/api/apiConfig'
import { BackendRequiredScreen } from '@/lib/api/BackendRequiredScreen'
import { useState } from 'react'

export function SimulationPage() {
  const { scenarioId } = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const categoryParam = searchParams.get('category')
  const id = typeof scenarioId === 'string' ? scenarioId : scenarioId?.[0] ?? ''
  const { canStartScenario, atScenarioCap, usage } = useEntitlement()
  const [paywallOpen, setPaywallOpen] = useState(false)

  const scenarioList = useMemo(() => {
    const parsed = categoryParam ? scenarioCatalogCategorySchema.safeParse(categoryParam) : null
    const entries = getScenarioCatalogEntries()
    if (!parsed?.success) return entries
    return entries.filter((e) => e.category === parsed.data)
  }, [categoryParam])

  useEffect(() => {
    if (!id) return
    const entry = scenarioList.find((s) => s.id === id)
    if (!entry) return
    setLastPracticeContinue({
      scenarioId: id,
      title: entry.title,
      mode: 'free',
      updatedAt: new Date().toISOString(),
    })
    router.replace(`/app/practice/free/${encodeURIComponent(id)}`)
  }, [id, router, scenarioList])

  if (!isFeature1ChatBackendEnabled()) {
    return (
      <BackendRequiredScreen
        title="Practice simulation needs the API"
        description="Conversation practice uses your FluentCopilot backend. Set NEXT_PUBLIC_API_BASE_URL and NEXT_PUBLIC_FEATURE1_CHAT_SOURCE=backend, then redeploy."
        backHref="/app/practice"
        backLabel="Back to Practice"
      />
    )
  }

  if (id) {
    return (
      <div className="px-4 py-10 text-center text-body-sm text-ink-secondary max-w-lg mx-auto">
        Opening practice…
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)]">
      <div className="px-4 py-3 border-b border-slate-200 bg-surface-muted">
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-body-sm font-medium text-ink-secondary">Choose a scenario</p>
          <Link
            href="/app/practice"
            className="text-caption font-medium text-primary-600 hover:underline shrink-0"
          >
            ← Practice hub
          </Link>
        </div>
        {categoryParam ? (
          <p className="text-caption text-ink-tertiary mb-2">
            Filtered by category ·{' '}
            <Link href="/app/practice/simulation" className="text-primary-600 font-medium">
              Show all
            </Link>
          </p>
        ) : null}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {scenarioList.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                if (!canStartScenario && atScenarioCap) {
                  setPaywallOpen(true)
                  return
                }
                router.push(`/app/practice/simulation/${s.id}`)
              }}
              className="shrink-0 px-4 py-2 rounded-lg border border-slate-200 bg-surface-elevated text-body-sm font-medium"
            >
              {s.title}
            </button>
          ))}
        </div>
      </div>
      <PaywallModal
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        reason="scenario_cap"
        usage={{ used: usage.scenariosToday, limit: usage.scenariosLimit }}
      />
    </div>
  )
}
