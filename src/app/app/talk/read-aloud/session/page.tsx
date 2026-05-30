'use client'

import { ReadAloudSessionScreen } from '@/features/read-aloud/ReadAloudSessionScreen'

export default function ReadAloudSessionPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-violet-50/30">
      <div className="px-4 py-6 max-w-lg mx-auto w-full">
        <ReadAloudSessionScreen />
      </div>
    </div>
  )
}
