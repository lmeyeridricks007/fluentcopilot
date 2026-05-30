'use client'

import { Suspense } from 'react'
import { SimulationPage } from '@/features/simulations/SimulationPage'

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[40vh] px-4 text-body-sm text-ink-secondary">
          Loading scenarios…
        </div>
      }
    >
      <SimulationPage />
    </Suspense>
  )
}
