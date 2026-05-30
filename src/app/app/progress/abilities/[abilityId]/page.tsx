'use client'

import { useParams } from 'next/navigation'
import { AbilityDetailPage } from '@/features/progress/AbilityDetailPage'

export default function Page() {
  const { abilityId } = useParams()
  const id = typeof abilityId === 'string' ? abilityId : abilityId?.[0] ?? ''
  if (!id) {
    return (
      <div className="px-4 py-10 text-center text-body-sm text-ink-secondary max-w-lg mx-auto">
        Missing ability.
      </div>
    )
  }
  return <AbilityDetailPage abilityId={id} />
}
