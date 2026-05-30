'use client'

import { useParams } from 'next/navigation'
import { KMNFlashcardScreen } from '@/features/exam-prep/kmn/KMNFlashcardScreen'

export default function KMNFlashcardsPage() {
  const params = useParams()
  const topicId = typeof params.topicId === 'string' ? params.topicId : ''
  return <KMNFlashcardScreen topicId={topicId} />
}
