'use client'

import { Suspense } from 'react'
import { LearnExplorePage } from '@/features/lessons/LearnExplorePage'
import { LoadingScreen } from '@/components/ui/LoadingScreen'

export default function LearnExploreRoutePage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <LearnExplorePage />
    </Suspense>
  )
}
