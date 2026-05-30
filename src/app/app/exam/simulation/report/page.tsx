import { Suspense } from 'react'
import { ExamSimulationReportClient } from '@/features/exam-system/ExamSimulationReportClient'

export default function ExamSimulationReportPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] flex items-center justify-center px-4">
          <p className="text-caption font-medium text-slate-500">Loading report…</p>
        </div>
      }
    >
      <ExamSimulationReportClient />
    </Suspense>
  )
}
