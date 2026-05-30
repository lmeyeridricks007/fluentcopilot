import { Suspense } from 'react'
import { PublicLoginPage } from '@/features/marketing'

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-lg px-4 py-16 text-center text-body-sm text-ink-secondary">Loading sign-in…</div>
      }
    >
      <PublicLoginPage />
    </Suspense>
  )
}
