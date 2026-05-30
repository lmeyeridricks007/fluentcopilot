'use client'

import { useParams } from 'next/navigation'
import { ScenarioLaunchPage } from '@/features/practice-scenario-launch'

export default function Page() {
  const { scenarioId } = useParams()
  const id = typeof scenarioId === 'string' ? scenarioId : scenarioId?.[0] ?? ''
  if (!id) {
    return (
      <div className="px-4 py-10 text-center text-body-sm text-ink-secondary max-w-lg mx-auto">
        Missing scenario.
      </div>
    )
  }
  return <ScenarioLaunchPage scenarioId={id} />
}
