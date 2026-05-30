'use client'

import { useRouter } from 'next/navigation'
import { MistakeFixScreen } from '@/features/review/MistakeFixScreen'

export default function Page() {
  const router = useRouter()
  return <MistakeFixScreen onBack={() => router.push('/app/learn?tab=review')} />
}
