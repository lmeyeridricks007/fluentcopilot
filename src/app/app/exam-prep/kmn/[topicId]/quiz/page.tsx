'use client'

import { useParams } from 'next/navigation'
import { KMNQuizScreen } from '@/features/exam-prep/kmn/KMNQuizScreen'

export default function KMNQuizPage() {
  const params = useParams()
  const topicId = typeof params.topicId === 'string' ? params.topicId : ''
  return <KMNQuizScreen topicId={topicId} />
}
