'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { appTalkThreadRecap } from '@/lib/routing/appRoutes'

export default function LegacyChatRecapRedirectPage() {
  const params = useParams()
  const router = useRouter()
  const threadId = typeof params.threadId === 'string' ? params.threadId : params.threadId?.[0] ?? ''

  useEffect(() => {
    if (threadId) router.replace(appTalkThreadRecap(threadId))
    else router.replace('/app/talk')
  }, [threadId, router])

  return (
    <div className="px-4 py-12 text-center text-body-sm text-ink-secondary max-w-lg mx-auto">
      Redirecting…
    </div>
  )
}
