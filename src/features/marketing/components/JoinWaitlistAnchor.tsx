'use client'

import type { ComponentProps, ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { trackWaitlistCtaViewed, trackWaitlistCtaClicked } from '@/lib/analytics/waitlistAnalytics'

const REQUEST_ACCESS_HREF = '/beta#request'

type JoinWaitlistAnchorProps = Omit<ComponentProps<typeof Link>, 'href'> & {
  /** Analytics: where the CTA lives (e.g. pricing_basic_card, login_page). */
  surface: string
  ctaVariant?: string
  planContext?: string
  children?: ReactNode
}

/**
 * Primary “request beta access” CTA — navigates to the in-app email form (no mailto).
 */
export function JoinWaitlistAnchor({
  surface,
  ctaVariant,
  planContext,
  children,
  onClick,
  ...rest
}: JoinWaitlistAnchorProps) {
  const pathname = usePathname() ?? ''
  const signedIn = useAuthStore((s) => s.isAuthenticated)
  const viewedRef = useRef(false)

  useEffect(() => {
    if (viewedRef.current) return
    viewedRef.current = true
    trackWaitlistCtaViewed({
      source_surface: surface,
      route: pathname || undefined,
      cta_variant: ctaVariant,
      plan_context: planContext,
      signed_in_state: signedIn ? 'signed_in' : 'signed_out',
    })
  }, [surface, pathname, ctaVariant, planContext, signedIn])

  return (
    <Link
      href={REQUEST_ACCESS_HREF}
      scroll={false}
      {...rest}
      onClick={(e) => {
        trackWaitlistCtaClicked({
          source_surface: surface,
          route: pathname || undefined,
          cta_variant: ctaVariant,
          plan_context: planContext,
          signed_in_state: signedIn ? 'signed_in' : 'signed_out',
        })
        onClick?.(e)
      }}
    >
      {children ?? 'Request early access'}
    </Link>
  )
}
