'use client'

import { useParams } from 'next/navigation'
import { SpeakingPracticeExamScreen } from '@/features/exam-prep/practice-exams/SpeakingPracticeExamScreen'

export default function SpeakingPracticeExamSetPage() {
  const params = useParams()
  const setId = typeof params.setId === 'string' ? params.setId : ''
  if (!setId) return null
  return <SpeakingPracticeExamScreen setId={setId} />
}
