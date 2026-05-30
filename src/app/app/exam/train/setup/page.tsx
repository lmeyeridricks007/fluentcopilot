import { Suspense } from 'react'
import { ExamTrainSetupClient } from '@/features/exam-system/ExamTrainSetupClient'

export default function ExamTrainSetupPage() {
  return (
    <Suspense fallback={<p className="px-4 py-8 text-body-sm text-ink-secondary">Loading…</p>}>
      <ExamTrainSetupClient />
    </Suspense>
  )
}
