import { Suspense } from 'react'
import { ExamRunSessionClient } from '@/features/exam-system/ExamRunSessionClient'

export default function ExamSimulationRunPage() {
  return (
    <Suspense fallback={<p className="px-4 py-8 text-caption text-ink-secondary">Loading…</p>}>
      <ExamRunSessionClient mode="simulation" />
    </Suspense>
  )
}
