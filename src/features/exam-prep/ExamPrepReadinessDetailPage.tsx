'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ExamReadinessCard } from '@/features/exam-prep/components/ExamReadinessCard'

export function ExamPrepReadinessDetailPage() {
  return (
    <div className="px-4 py-6 pb-28 space-y-6 max-w-lg mx-auto w-full">
      <div className="flex items-center gap-2 -mt-1">
        <Link
          href="/app/exam-prep"
          className="inline-flex items-center gap-1 text-body-sm font-medium text-primary-600 hover:underline min-h-touch py-1"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden />
          Examenvoorbereiding
        </Link>
      </div>
      <header className="space-y-1">
        <h1 className="text-title font-bold text-ink-primary tracking-tight">Gereedheid in detail</h1>
        <p className="text-body-sm text-ink-secondary leading-snug">
          Signalen per onderdeel, trends en aanbevolen vervolgstappen op basis van je examensessies in de app.
        </p>
      </header>
      <ExamReadinessCard surface="exam_prep_readiness_detail" />
    </div>
  )
}
