'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { APP_READ_ALOUD } from '@/lib/routing/appRoutes'

/** Legacy route — canonical Read Aloud lives under Speak (`/app/talk/read-aloud`). */
export default function ReadingAloudRedirectPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace(APP_READ_ALOUD)
  }, [router])
  return (
    <div className="px-4 py-10 text-center text-body-sm text-ink-secondary">
      Opening Read Aloud…
    </div>
  )
}
