'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { ModuleReviewScreen } from '@/features/review/ModuleReviewScreen'
import { LoadingScreen } from '@/components/ui/LoadingScreen'

function Inner() {
  const router = useRouter()
  const sp = useSearchParams()
  const moduleId = sp.get('id') ?? 'a2-m02'
  return <ModuleReviewScreen moduleId={moduleId} onBack={() => router.push('/app/learn?tab=review')} />
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Inner />
    </Suspense>
  )
}
