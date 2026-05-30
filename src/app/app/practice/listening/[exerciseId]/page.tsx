'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { listeningModeSessionHref } from '@/lib/routing/appRoutes'

const LEGACY_EXERCISE_TO_PACK: Record<string, { packId: string; level: 'A1' | 'A2' | 'B1' }> = {
  'cafe-order': { packId: 'pack-cafe-burst', level: 'A2' },
  'train-announcement': { packId: 'pack-train-platform', level: 'A2' },
  'job-interview': { packId: 'pack-clinic-instructions', level: 'B1' },
}

/** Legacy deep links → scenario-linked listening packs. */
export default function PracticeListeningExerciseRedirectPage() {
  const router = useRouter()
  const params = useParams<{ exerciseId: string }>()
  const exerciseId = params.exerciseId ?? ''

  useEffect(() => {
    const mapped = LEGACY_EXERCISE_TO_PACK[exerciseId] ?? { packId: 'pack-cafe-burst', level: 'A2' as const }
    router.replace(listeningModeSessionHref(mapped))
  }, [router, exerciseId])

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <p className="text-body-sm text-slate-600">Opening listening burst…</p>
    </div>
  )
}
