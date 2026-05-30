'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Lock } from 'lucide-react'
import { trackSignupDisabledClicked } from '@/lib/analytics/waitlistAnalytics'

/**
 * Intentional “sign-up not open” block — confident tone, routes to explanation + request flow.
 */
export function SignupComingSoonPanel({ surface = 'pricing' }: { surface?: string }) {
  const pathname = usePathname() ?? ''
  return (
    <div className="rounded-xl border-2 border-slate-300/80 bg-surface-elevated px-4 py-5 sm:px-6 shadow-card">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex gap-3 min-w-0">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-800">
            <Lock className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="font-semibold text-ink-primary">Public sign-up opens after the beta</p>
            <p className="mt-1 text-body-sm text-ink-secondary leading-relaxed">
              We&apos;re intentionally invite-only right now so exam prep and AI feedback stay precise. Self-serve
              registration and billing switch on when we&apos;re ready to scale — not because anything is “missing.”
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:items-end gap-2 shrink-0">
          <Link
            href="/beta#request"
            className="inline-flex min-h-touch shrink-0 items-center justify-center rounded-lg bg-primary-600 px-5 py-2.5 text-body-sm font-semibold text-white hover:bg-primary-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 shadow-card"
          >
            Request access
          </Link>
          <Link
            href="/signup"
            onClick={() =>
              trackSignupDisabledClicked({
                source_surface: surface,
                route: pathname || undefined,
              })
            }
            className="inline-flex min-h-touch shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-surface-muted px-5 py-2.5 text-body-sm font-semibold text-ink-primary hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
          >
            Why sign-up is closed
          </Link>
        </div>
      </div>
    </div>
  )
}
