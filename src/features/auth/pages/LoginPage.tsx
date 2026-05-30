'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { LoginForm } from '../components/LoginForm'

/**
 * Standalone login shell (legacy full-page). Prefer public marketing route `/login` + `PublicLoginPage`.
 */
export function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-surface safe-area-pt safe-area-pb">
      <div className="flex-1 px-4 py-6 flex flex-col justify-center max-w-md mx-auto w-full">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-body-sm text-ink-secondary hover:text-ink-primary mb-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 rounded"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Back
        </Link>

        <LoginForm
          signUpSlot={
            <p className="text-body-sm text-ink-secondary text-center">
              Don&apos;t have an account?{' '}
              <Link
                href="/signup"
                className="font-medium text-primary-600 hover:text-primary-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 rounded"
              >
                Create account
              </Link>
            </p>
          }
        />
      </div>
    </div>
  )
}
