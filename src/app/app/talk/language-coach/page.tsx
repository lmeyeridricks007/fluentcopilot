'use client'

import { Suspense } from 'react'
import { LanguageCoachEntryScreen } from '@/features/speak-live/LanguageCoachEntryScreen'
import { LoadingScreen } from '@/components/ui/LoadingScreen'

export default function Page() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <LanguageCoachEntryScreen />
    </Suspense>
  )
}
