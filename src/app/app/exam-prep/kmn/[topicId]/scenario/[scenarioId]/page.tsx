'use client'

import { useParams } from 'next/navigation'
import { KMNScenarioScreen } from '@/features/exam-prep/kmn/KMNScenarioScreen'

export default function KMNScenarioPage() {
  const params = useParams()
  const topicId = typeof params.topicId === 'string' ? params.topicId : ''
  const scenarioId = typeof params.scenarioId === 'string' ? params.scenarioId : ''
  return <KMNScenarioScreen topicId={topicId} scenarioId={scenarioId} />
}
