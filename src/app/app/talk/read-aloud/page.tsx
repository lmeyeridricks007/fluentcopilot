'use client'

import { ReadAloudEntryScreen } from '@/features/read-aloud/ReadAloudEntryScreen'

export default function ReadAloudPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-violet-50/30">
      <div className="px-4 py-6 pb-28 max-w-lg mx-auto w-full">
        <ReadAloudEntryScreen />
      </div>
    </div>
  )
}
