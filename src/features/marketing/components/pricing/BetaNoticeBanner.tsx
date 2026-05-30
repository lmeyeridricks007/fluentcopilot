import { Info } from 'lucide-react'

/**
 * Persistent closed-beta context for pricing and conversion pages.
 */
export function BetaNoticeBanner() {
  return (
    <div
      className="rounded-xl border border-primary-400/70 bg-primary-50 px-4 py-3 sm:px-5 sm:py-4 shadow-sm"
      role="status"
      aria-live="polite"
    >
      <div className="flex gap-3">
        <Info className="h-5 w-5 shrink-0 text-primary-900 mt-0.5" aria-hidden />
        <div className="text-body-sm text-ink-secondary">
          <p className="font-semibold text-ink-primary">Invite-only early access</p>
          <p className="mt-1 leading-relaxed">
            We onboard learners in waves while we harden speaking flows, exam simulations, and personalization.{' '}
            <strong className="text-ink-primary">Self-serve sign-up isn&apos;t open yet</strong> — request early access
            and we&apos;ll follow up by email, or sign in if you already have an invite.
          </p>
        </div>
      </div>
    </div>
  )
}
