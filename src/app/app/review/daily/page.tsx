'use client'

import { useRouter } from 'next/navigation'
import { DailyReviewScreen } from '@/features/review/DailyReviewScreen'

export default function Page() {
  const router = useRouter()
  return <DailyReviewScreen onBack={() => router.push('/app/learn?tab=review')} />
}
