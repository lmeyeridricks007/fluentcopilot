'use client'

import { Suspense } from 'react'
import { LibraryHubPage } from '@/features/library/LibraryHubPage'
import { LoadingScreen } from '@/components/ui/LoadingScreen'

export default function Page() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <LibraryHubPage />
    </Suspense>
  )
}
