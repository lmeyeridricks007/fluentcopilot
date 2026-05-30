'use client'

import { useParams } from 'next/navigation'
import { SkillTrackSessionPage } from '@/features/skill-tracks'

export default function Page() {
  const { trackId } = useParams()
  const id = typeof trackId === 'string' ? trackId : trackId?.[0] ?? ''
  if (!id) {
    return (
      <div className="px-4 py-10 text-center text-body-sm text-ink-secondary max-w-lg mx-auto">
        Missing track.
      </div>
    )
  }
  return <SkillTrackSessionPage trackId={id} />
}
