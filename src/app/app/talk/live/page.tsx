'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { SpeakLiveSelector } from '@/features/speak-live'
import { APP_TALK_HUB } from '@/lib/routing/appRoutes'
import { LoadingScreen } from '@/components/ui/LoadingScreen'

function SpeakLiveLandingContent() {
  return (
    <div className="min-h-screen bg-[#fafaf7]">
      <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-6 pb-28 sm:space-y-7">
        <Link
          href={APP_TALK_HUB}
          className="inline-flex min-h-touch items-center rounded-full border border-[#E5E7EB] bg-white px-3.5 py-2 text-caption font-medium text-[#475569] shadow-sm transition-colors hover:bg-slate-50"
        >
          ← Back to Talk
        </Link>

        <SpeakLiveSelector />
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <SpeakLiveLandingContent />
    </Suspense>
  )
}
