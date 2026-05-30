import type { ReactNode } from 'react'
import { ExamLayoutShell } from '@/features/exam-system/ExamLayoutShell'

export default function ExamLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100/90 via-white to-slate-50 text-ink-primary antialiased">
      <ExamLayoutShell>{children}</ExamLayoutShell>
    </div>
  )
}
