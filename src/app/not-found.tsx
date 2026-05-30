'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function NotFound() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/')
  }, [router])
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface text-ink-secondary">
      Redirecting…
    </div>
  )
}
