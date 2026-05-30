'use client'

/**
 * Full-viewport placeholder while auth is hydrating or a guard is redirecting.
 */

export function AuthRoutingSplash({
  message = 'Loading your session…',
}: {
  message?: string
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-surface px-4 text-center text-ink-secondary">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600"
        aria-hidden
      />
      <p className="text-body-sm">{message}</p>
    </div>
  )
}
