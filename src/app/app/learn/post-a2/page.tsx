'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MOCK_LESSON_PROGRESS } from '@/mocks/lessonProgress'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { useRetentionProfile } from '@/features/retention/useRetentionProfile'
import { PostA2TransitionScreen } from '@/features/post-a2/PostA2TransitionScreen'
import { usePostA2TransitionViewModel } from '@/features/post-a2/usePostA2TransitionViewModel'
import { isA2PathCompleteMerged } from '@/lib/post-a2'

export default function PostA2ContinuationPage() {
  const router = useRouter()
  const { completedLessonIds } = useRetentionProfile()
  const vm = usePostA2TransitionViewModel()
  const eligible = isA2PathCompleteMerged(completedLessonIds, MOCK_LESSON_PROGRESS)

  useEffect(() => {
    if (!eligible) router.replace('/app/learn')
  }, [eligible, router])

  if (!eligible) return <LoadingScreen />

  return <PostA2TransitionScreen vm={vm} />
}
