'use client'

import { useParams } from 'next/navigation'
import { KMNTopicScreen } from '@/features/exam-prep/kmn/KMNTopicScreen'

export default function KMNTopicPage() {
  const params = useParams()
  const topicId = typeof params.topicId === 'string' ? params.topicId : ''
  return <KMNTopicScreen topicId={topicId} />
}
