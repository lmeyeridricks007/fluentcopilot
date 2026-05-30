'use client'

import { useParams } from 'next/navigation'
import { ReadingPracticeExamScreen } from '@/features/exam-prep/practice-exams/ReadingPracticeExamScreen'

export default function ReadingPracticeExamSetPage() {
  const params = useParams()
  const setId = typeof params.setId === 'string' ? params.setId : ''
  if (!setId) return null
  return <ReadingPracticeExamScreen setId={setId} />
}
