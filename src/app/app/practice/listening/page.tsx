'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { APP_LISTENING_MODE } from '@/lib/routing/appRoutes'

/** Legacy catalog URL — Talk Listening mode is canonical. */
export default function PracticeListeningRedirectPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace(APP_LISTENING_MODE)
  }, [router])
  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <p className="text-body-sm text-slate-600">Opening Listening…</p>
    </div>
  )
}
