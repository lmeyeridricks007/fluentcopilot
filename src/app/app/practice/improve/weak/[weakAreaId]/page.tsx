'use client'

import { Suspense } from 'react'
import { useParams } from 'next/navigation'
import { ImproveWeakDrillPage } from '@/features/practice-hub/improve/ImproveWeakDrillPage'
import { LoadingScreen } from '@/components/ui/LoadingScreen'

function ImproveWeakDrillRouteInner() {
  const params = useParams()
  const raw = params.weakAreaId
  const weakAreaId = typeof raw === 'string' ? raw : raw?.[0] ?? ''
  if (!weakAreaId) {
    return (
      <div className="px-4 py-10 text-center text-body-sm text-ink-secondary max-w-lg mx-auto">
        Missing focus.
      </div>
    )
  }
  return <ImproveWeakDrillPage rawWeakAreaId={weakAreaId} />
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <ImproveWeakDrillRouteInner />
    </Suspense>
  )
}
