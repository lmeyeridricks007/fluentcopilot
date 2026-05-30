'use client'

import { Suspense } from 'react'
import { ScenarioCatalogPage } from '@/features/scenario-catalog'

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[50vh] px-4 text-body-sm text-ink-secondary">
          Loading scenario library…
        </div>
      }
    >
      <ScenarioCatalogPage />
    </Suspense>
  )
}
