'use client'

import { User } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import type { AccountIdentityView } from '@/lib/account'

export type AccountSummaryCardProps = {
  identity: AccountIdentityView
  planLabel: string
  isPremiumPlan: boolean
  onEditProfile?: () => void
}

export function AccountSummaryCard({
  identity,
  planLabel,
  isPremiumPlan,
  onEditProfile,
}: AccountSummaryCardProps) {
  return (
    <Card variant="outlined" padding="md" className="border-slate-200/90">
      <div className="flex items-start gap-3">
        <div className="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center shrink-0">
          <User className="w-7 h-7 text-primary-700" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-caption font-semibold text-ink-tertiary uppercase tracking-wide">Signed in as</p>
          <p className="text-body-lg font-bold text-ink-primary mt-0.5 truncate">{identity.displayName}</p>
          <p className="text-body-sm text-ink-secondary mt-0.5 truncate">{identity.email || 'No email on file'}</p>
          {identity.isInviteBeta ? (
            <p className="text-caption text-ink-tertiary mt-2">Invite-only closed beta account</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span
              className={`inline-flex items-center rounded-lg px-2.5 py-1 text-caption font-semibold ${
                isPremiumPlan
                  ? 'bg-primary-100 text-primary-900 border border-primary-200'
                  : 'bg-surface-muted text-ink-secondary border border-slate-200'
              }`}
            >
              {planLabel}
            </span>
          </div>
        </div>
        {onEditProfile ? (
          <Button variant="ghost" size="sm" className="shrink-0" type="button" onClick={onEditProfile}>
            Edit
          </Button>
        ) : null}
      </div>
    </Card>
  )
}
