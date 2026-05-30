'use client'

import { useParams } from 'next/navigation'
import { ExamTypeHubPage } from '@/features/exam-prep/ExamTypeHubPage'

export default function Page() {
  const p = useParams()
  const raw = p.examType
  const examType = typeof raw === 'string' ? raw : raw?.[0] ?? ''
  return <ExamTypeHubPage examType={examType} />
}
