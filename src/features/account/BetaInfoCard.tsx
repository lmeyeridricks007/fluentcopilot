'use client'

import { Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/Card'

export function BetaInfoCard() {
  return (
    <Card variant="flat" padding="md" className="bg-gradient-to-br from-primary-50/90 to-surface-elevated border border-primary-100">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-100/80 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-primary-700" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-caption font-semibold text-primary-900 uppercase tracking-wide">Closed beta</p>
          <p className="text-body-sm text-ink-primary mt-1 leading-relaxed">
            You&apos;re helping shape the product before public launch. Some flows may still evolve, and there&apos;s no
            live billing yet—your plan comes from your invite.
          </p>
          <p className="text-caption text-ink-secondary mt-2 leading-snug">
            Feedback is welcome as you explore. Thank you for testing with us.
          </p>
        </div>
      </div>
    </Card>
  )
}
