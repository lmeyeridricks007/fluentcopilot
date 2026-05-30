'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { usePathname } from 'next/navigation'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { submitBetaRequestClient } from '@/lib/waitlist/submitBetaRequestClient'
import { useAuthStore } from '@/store/authStore'
import {
  trackBetaRequestFailed,
  trackBetaRequestFormViewed,
  trackBetaRequestSubmitted,
  trackBetaRequestSucceeded,
} from '@/lib/analytics/waitlistAnalytics'
import { clsx } from 'clsx'

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  firstName: z.string().max(80).optional(),
})

export type BetaRequestFormProps = {
  sourceSurface: string
  /** DOM id for deep-linking e.g. #request */
  /** Set to `BETA_REQUEST_SECTION_ID` on the beta page for `#request` deep links. */
  id?: string
  variant?: 'default' | 'compact'
  className?: string
  showFirstName?: boolean
  intro?: string
}

export function BetaRequestForm({
  sourceSurface,
  id,
  variant = 'default',
  className,
  showFirstName = true,
  intro,
}: BetaRequestFormProps) {
  const pathname = usePathname() ?? ''
  const signedIn = useAuthStore((s) => s.isAuthenticated)
  const rootRef = useRef<HTMLDivElement>(null)
  const viewedRef = useRef(false)

  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [emailError, setEmailError] = useState<string | undefined>()
  const [firstNameError, setFirstNameError] = useState<string | undefined>()
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | undefined>()
  const [website, setWebsite] = useState('')

  useEffect(() => {
    const el = rootRef.current
    if (!el || viewedRef.current) return
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting && !viewedRef.current) {
          viewedRef.current = true
          trackBetaRequestFormViewed({
            source_surface: sourceSurface,
            route: pathname || undefined,
            signed_in_state: signedIn ? 'signed_in' : 'signed_out',
          })
        }
      },
      { threshold: 0.2 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [sourceSurface, pathname, signedIn])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setEmailError(undefined)
    setFirstNameError(undefined)
    setErrorMessage(undefined)

    const parsed = schema.safeParse({
      email: email.trim(),
      firstName: showFirstName ? firstName.trim() || undefined : undefined,
    })

    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors
      if (flat.email?.[0]) setEmailError(flat.email[0])
      if (flat.firstName?.[0]) setFirstNameError(flat.firstName[0])
      trackBetaRequestFailed({
        source_surface: sourceSurface,
        route: pathname || undefined,
        reason: 'validation',
        signed_in_state: signedIn ? 'signed_in' : 'signed_out',
      })
      return
    }

    setLoading(true)
    trackBetaRequestSubmitted({
      source_surface: sourceSurface,
      route: pathname || undefined,
      signed_in_state: signedIn ? 'signed_in' : 'signed_out',
      has_first_name: !!(showFirstName && parsed.data.firstName),
    })

    const result = await submitBetaRequestClient({
      email: parsed.data.email,
      firstName: parsed.data.firstName,
      sourceSurface,
      route: pathname || undefined,
      website,
    })

    setLoading(false)

    if (!result.ok) {
      setStatus('error')
      const reason = result.error === 'validation' ? 'validation' : result.error === 'network' ? 'network' : 'server'
      trackBetaRequestFailed({
        source_surface: sourceSurface,
        route: pathname || undefined,
        reason,
        signed_in_state: signedIn ? 'signed_in' : 'signed_out',
      })
      setErrorMessage(
        result.error === 'network'
          ? 'Check your connection and try again.'
          : 'Something went wrong. Please try again in a moment.',
      )
      return
    }

    setStatus('success')
    trackBetaRequestSucceeded({
      source_surface: sourceSurface,
      route: pathname || undefined,
      delivered: result.delivered,
      signed_in_state: signedIn ? 'signed_in' : 'signed_out',
    })
  }

  if (status === 'success') {
    return (
      <div
        ref={rootRef}
        id={id}
        className={clsx(
          'rounded-xl border border-primary-200 bg-primary-50/90 px-4 py-5 sm:px-6',
          className,
        )}
        role="status"
      >
        <p className="font-semibold text-ink-primary">You&apos;re on the list</p>
        <p className="mt-2 text-body-sm text-ink-secondary">
          Thanks — we&apos;ve received your FluentCopilot beta request and we&apos;ll email you at{' '}
          <span className="font-medium text-ink-primary">{email.trim()}</span> when new beta spots open. Watch your inbox
          (and spam) for a message from us.
        </p>
        <p className="mt-3 text-caption text-ink-secondary">
          Already have an invite? Use the same email on the sign-in page with the password we sent you.
        </p>
      </div>
    )
  }

  return (
    <div ref={rootRef} id={id} className={className}>
      {intro && variant === 'default' && <p className="text-body-sm text-ink-secondary mb-4">{intro}</p>}
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <input
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          className="hidden"
          aria-hidden
          name="website"
        />
        {showFirstName && (
          <Input
            label="First name (optional)"
            autoComplete="given-name"
            placeholder="Alex"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            error={firstNameError}
          />
        )}
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={emailError}
        />
        {status === 'error' && errorMessage && (
          <p className="text-body-sm text-error" role="alert">
            {errorMessage}
          </p>
        )}
        <Button type="submit" size="lg" fullWidth={variant !== 'compact'} loading={loading} disabled={loading}>
          Request early access
        </Button>
        <p className="text-caption text-ink-secondary">
          We never sell your email. One short note from us when your spot is ready — no mail app required.
        </p>
      </form>
    </div>
  )
}
