'use client'

import { useParams } from 'next/navigation'
import { WritingPracticeExamScreen } from '@/features/exam-prep/practice-exams/WritingPracticeExamScreen'

export default function WritingPracticeExamSetPage() {
  const params = useParams()
  const setId = typeof params.setId === 'string' ? params.setId : ''
  if (!setId) return null
  return <WritingPracticeExamScreen setId={setId} />
}
