'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { MOCK_BETA_INVITED_USERS } from '@/lib/auth/mockUsers'
import { devToolsSwitchToMockUser } from '@/lib/dev-tools'
import { ROUTES } from '@/lib/routing/authRedirects'

export function DevUserSwitcher() {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const switchUser = async (id: string) => {
    const record = MOCK_BETA_INVITED_USERS.find((u) => u.id === id)
    if (!record) return
    setErr(null)
    setBusy(id)
    try {
      await devToolsSwitchToMockUser(record)
      router.replace(ROUTES.appHome)
      router.refresh()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Switch failed')
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card variant="outlined" padding="md" className="space-y-3 border-amber-200/80">
      <h2 className="text-body-sm font-bold text-ink-primary uppercase tracking-wide">Switch mock user</h2>
      <p className="text-caption text-ink-secondary leading-relaxed">
        Signs out the current session and signs in with the shared beta password. In-memory stores reset on logout;
        bootstrap runs for the new user.
      </p>
      {err ? <p className="text-caption text-error">{err}</p> : null}
      <ul className="space-y-2 list-none p-0 m-0">
        {MOCK_BETA_INVITED_USERS.map((u) => (
          <li key={u.id}>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              fullWidth
              className="text-left font-normal h-auto py-2 min-h-touch"
              disabled={busy !== null}
              onClick={() => switchUser(u.id)}
            >
              <span className="flex w-full justify-between gap-2 items-center">
                <span className="min-w-0">
                  <span className="font-semibold text-ink-primary block">{u.displayName}</span>
                  <span className="text-caption text-ink-secondary block truncate">{u.email}</span>
                </span>
                <span className="text-caption font-semibold uppercase shrink-0">
                  {busy === u.id ? '…' : u.plan}
                </span>
              </span>
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  )
}
