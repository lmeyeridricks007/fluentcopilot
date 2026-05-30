'use client'

import { ReadAloudReportScreen } from '@/features/read-aloud/ReadAloudReportScreen'

export default function ReadAloudReportPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-emerald-50/25">
      <div className="px-4 py-6 max-w-lg mx-auto w-full">
        <ReadAloudReportScreen />
      </div>
    </div>
  )
}
