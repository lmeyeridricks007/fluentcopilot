'use client'

import { useParams } from 'next/navigation'
import { ListeningPracticeExamScreen } from '@/features/exam-prep/practice-exams/ListeningPracticeExamScreen'

export default function ListeningPracticeExamSetPage() {
  const params = useParams()
  const setId = typeof params.setId === 'string' ? params.setId : ''
  if (!setId) return null
  return <ListeningPracticeExamScreen setId={setId} />
}
