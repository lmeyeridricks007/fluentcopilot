import { Suspense } from 'react'
import { ExamSimulationSetupClient } from '@/features/exam-system/ExamSimulationSetupClient'

export default function ExamSimulationSetupPage() {
  return (
    <Suspense fallback={<p className="px-4 py-8 text-body-sm text-ink-secondary">Loading…</p>}>
      <ExamSimulationSetupClient />
    </Suspense>
  )
}
