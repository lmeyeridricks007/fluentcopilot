'use client'

import { Suspense } from 'react'
import { useParams } from 'next/navigation'
import { CaptureItemDetailView } from '@/features/library/capture/CaptureItemDetailView'
import { LoadingScreen } from '@/components/ui/LoadingScreen'

function Inner() {
  const params = useParams()
  const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : ''
  if (!id) return <LoadingScreen />
  return <CaptureItemDetailView captureId={id} />
}

export default function LibraryCaptureDetailPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Inner />
    </Suspense>
  )
}
