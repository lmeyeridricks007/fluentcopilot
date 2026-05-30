'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, Sparkles } from 'lucide-react'
import { clsx } from 'clsx'
import { useAuth } from '@/lib/auth/useAuth'
import { getPrivateEntryPath } from '@/lib/routing/authRedirects'
import { JoinWaitlistAnchor } from './JoinWaitlistAnchor'
import { CookieConsentBanner } from './CookieConsentBanner'

const btnBase =
  'inline-flex items-center justify-center font-semibold rounded-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 min-h-touch text-body-sm px-3 py-2'
const btnPrimary = 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 shadow-card border border-primary-700/10'
const btnSecondary = 'bg-surface-elevated text-ink-primary hover:bg-surface-muted border border-slate-300'

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/features', label: 'Features' },
  { href: '/exam-prep', label: 'Exam prep' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/beta', label: 'Early access' },
] as const

export function PublicShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const { isReady, isAuthenticated, hasCompletedOnboarding } = useAuth()
  const appEntryHref = getPrivateEntryPath(hasCompletedOnboarding)

  return (
    <div className="min-h-screen flex flex-col bg-surface text-ink-primary">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-surface-elevated/95 backdrop-blur-md safe-area-pt shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold text-ink-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 rounded-lg"
            onClick={() => setOpen(false)}
          >
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-white shadow-card"
              aria-hidden
            >
              <Sparkles className="h-5 w-5" />
            </span>
            <span className="text-body-sm sm:text-body">FluentCopilot</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 lg:gap-2" aria-label="Primary">
            {NAV.map(({ href, label }) => {
              const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={clsx(
                    'rounded-lg px-3 py-2 text-body-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500',
                    active
                      ? 'text-primary-900 bg-primary-100/90'
                      : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-muted',
                  )}
                >
                  {label}
                </Link>
              )
            })}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            {!(isReady && isAuthenticated) && (
              <JoinWaitlistAnchor surface="public_shell_desktop" className={`${btnBase} ${btnPrimary}`}>
                Request early access
              </JoinWaitlistAnchor>
            )}
            {isReady && isAuthenticated ? (
              <Link href={appEntryHref} className={`${btnBase} ${btnPrimary}`}>
                Open app
              </Link>
            ) : (
              <Link href="/login" className={`${btnBase} ${btnSecondary}`}>
                Sign in
              </Link>
            )}
          </div>

          <button
            type="button"
            className="md:hidden min-h-touch min-w-touch flex items-center justify-center rounded-lg border border-slate-300 bg-surface-elevated text-ink-primary shadow-sm"
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {open && (
          <div className="md:hidden border-t border-slate-200 bg-surface-elevated px-4 py-4 space-y-1 shadow-elevated">
            <p className="px-3 pb-2 text-caption font-bold uppercase tracking-wide text-primary-800">Explore</p>
            {NAV.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="block rounded-lg px-3 py-3 text-body font-medium text-ink-primary hover:bg-surface-muted transition-colors"
                onClick={() => setOpen(false)}
              >
                {label}
              </Link>
            ))}
            <div className="pt-3 flex flex-col gap-2">
              {!(isReady && isAuthenticated) && (
                <JoinWaitlistAnchor
                  surface="public_shell_mobile"
                  className={`${btnBase} ${btnPrimary} w-full justify-center`}
                  onClick={() => setOpen(false)}
                >
                  Request early access
                </JoinWaitlistAnchor>
              )}
              {isReady && isAuthenticated ? (
                <Link
                  href={appEntryHref}
                  className={`${btnBase} ${btnPrimary} w-full justify-center`}
                  onClick={() => setOpen(false)}
                >
                  Open app
                </Link>
              ) : (
                <Link
                  href="/login"
                  className={`${btnBase} ${btnSecondary} w-full justify-center`}
                  onClick={() => setOpen(false)}
                >
                  Sign in
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-slate-200 bg-slate-100/80 mt-auto">
        <div className="mx-auto max-w-6xl px-4 py-10 safe-area-pb">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="font-bold text-ink-primary">FluentCopilot</p>
              <p className="mt-2 text-body-sm text-ink-secondary max-w-sm leading-relaxed">
                AI-native Dutch coach for life in the Netherlands: messaging, speaking, read-aloud feedback, your own
                words, and exam prep when you need it — not a phrase app or a generic chatbot.
              </p>
            </div>
            <div className="space-y-3 text-body-sm font-medium">
              <p className="font-semibold text-ink-primary">Product</p>
              <div className="space-y-2">
                <Link href="/" className="block text-ink-secondary hover:text-primary-900">
                  Home
                </Link>
                <Link href="/features" className="block text-ink-secondary hover:text-primary-900">
                  Features
                </Link>
                <Link href="/exam-prep" className="block text-ink-secondary hover:text-primary-900">
                  Exam prep
                </Link>
                <Link href="/pricing" className="block text-ink-secondary hover:text-primary-900">
                  Pricing
                </Link>
              </div>
            </div>
            <div className="space-y-3 text-body-sm font-medium">
              <p className="font-semibold text-ink-primary">Access</p>
              <div className="space-y-2">
              {!(isReady && isAuthenticated) && (
                <>
                  <JoinWaitlistAnchor
                    surface="public_footer"
                    className="block text-ink-secondary hover:text-primary-900 font-medium"
                  >
                    Request early access
                  </JoinWaitlistAnchor>
                  <Link href="/beta" className="block text-ink-secondary hover:text-primary-900">
                    How early access works
                  </Link>
                </>
              )}
              {isReady && isAuthenticated ? (
                  <Link href={appEntryHref} className="block text-ink-secondary hover:text-primary-900">
                  Open app
                </Link>
              ) : (
                  <Link href="/login" className="block text-ink-secondary hover:text-primary-900">
                  Sign in
                </Link>
              )}
              </div>
            </div>
            <div className="space-y-3 text-body-sm font-medium">
              <p className="font-semibold text-ink-primary">Legal</p>
              <div className="space-y-2">
                <Link href="/privacy" className="block text-ink-secondary hover:text-primary-900">
                  Privacy
                </Link>
                <Link href="/terms" className="block text-ink-secondary hover:text-primary-900">
                  Terms
                </Link>
                <Link href="/cookies" className="block text-ink-secondary hover:text-primary-900">
                  Cookies
                </Link>
                <Link href="/contact" className="block text-ink-secondary hover:text-primary-900">
                  Contact
                </Link>
              </div>
            </div>
          </div>
          <p className="mt-8 text-body-sm text-ink-secondary text-center sm:text-left leading-relaxed max-w-3xl">
            Invite-only early access — we onboard in waves by email. Public sign-up and billing go live when we are ready
            to scale; after you sign in, your learning data stays in the app.
          </p>
        </div>
      </footer>
      <CookieConsentBanner />
    </div>
  )
}
