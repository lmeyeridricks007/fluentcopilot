'use client'

import { useParams } from 'next/navigation'
import { KmnPracticeExamScreen } from '@/features/exam-prep/practice-exams/KmnPracticeExamScreen'

export default function KmnPracticeExamSetPage() {
  const params = useParams()
  const setId = typeof params.setId === 'string' ? params.setId : ''
  if (!setId) return null
  return <KmnPracticeExamScreen setId={setId} />
}
