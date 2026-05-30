import { Suspense } from 'react'
import { ExamTrainingReportClient } from '@/features/exam-system/ExamTrainingReportClient'

export default function ExamTrainingReportPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] flex items-center justify-center px-4">
          <p className="text-caption font-medium text-slate-500">Loading report…</p>
        </div>
      }
    >
      <ExamTrainingReportClient />
    </Suspense>
  )
}
