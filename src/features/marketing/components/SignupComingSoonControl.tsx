'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { trackSignupDisabledClicked } from '@/lib/analytics/waitlistAnalytics'

/**
 * Intentional disabled sign-up — tertiary funnel step with clear explanation.
 */
export function SignupComingSoonControl({ surface = 'login_page' }: { surface?: string }) {
  const pathname = usePathname() ?? ''
  return (
    <div className="rounded-xl border border-slate-300 bg-surface-elevated px-4 py-4 text-center shadow-sm">
      <button
        type="button"
        disabled
        className="w-full min-h-touch rounded-lg border border-slate-300 bg-surface-muted text-body-sm font-semibold text-ink-secondary cursor-not-allowed"
        aria-describedby="signup-soon-help"
      >
        Create account (opens after beta)
      </button>
      <p id="signup-soon-help" className="mt-3 text-body-sm text-ink-secondary leading-relaxed">
        We&apos;re keeping the beta <strong className="text-ink-primary">invite-only</strong> so exam simulations and AI
        feedback stay sharp. Self-serve sign-up flips on when we&apos;re ready to scale — not because registration is
        &quot;broken&quot;.
      </p>
      <Link
        href="/signup"
        onClick={() =>
          trackSignupDisabledClicked({
            source_surface: surface,
            route: pathname || undefined,
          })
        }
        className="mt-3 inline-block text-body-sm font-semibold text-primary-900 hover:text-primary-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 rounded"
      >
        Why sign-up is closed →
      </Link>
    </div>
  )
}
