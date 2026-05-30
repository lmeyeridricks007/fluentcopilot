'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, BookOpen, Sparkles } from 'lucide-react'
import { Card, CardDescription, CardTitle } from '@/components/ui/Card'
import { useStudyContextStore } from '@/store/studyContextStore'

export default function B1EntryPage() {
  const setStudyLevel = useStudyContextStore((s) => s.setActiveStudyLevel)

  useEffect(() => {
    setStudyLevel('B1')
  }, [setStudyLevel])

  return (
    <div className="px-4 py-6 pb-28 max-w-lg mx-auto w-full space-y-6">
      <Link
        href="/app/learn"
        className="inline-flex items-center gap-1 text-body-sm font-medium text-primary-600 min-h-touch hover:underline"
      >
        <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden />
        Back to Learn
      </Link>

      <header className="rounded-2xl border border-primary-200/70 bg-gradient-to-br from-slate-900 via-primary-900 to-primary-800 px-5 py-6 text-white shadow-lg space-y-2">
        <p className="text-caption font-semibold uppercase tracking-wider text-primary-100/90 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" aria-hidden />
          B1 — next level
        </p>
        <h1 className="text-2xl font-bold leading-tight">Welcome to your B1 chapter</h1>
        <p className="text-body-sm text-primary-50/95 leading-relaxed">
          You’ve moved your study focus to B1. The full B1 curriculum is rolling out — for now, browse lessons, keep
          Practice and Exam Prep in your routine, and we’ll surface new B1 units here as they ship.
        </p>
      </header>

      <Card variant="outlined" padding="md" className="border-slate-200">
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5 text-primary-800" aria-hidden />
          </div>
          <div>
            <CardTitle className="text-body font-bold text-ink-primary">What you can do now</CardTitle>
            <CardDescription className="mt-2 text-body-sm text-ink-secondary leading-relaxed">
              Open the lesson library with B1 selected, continue A2 Mastery in Practice if you want more confidence, or
              stay on Exam preparation — your pathway choice is saved and you can change it from Progress.
            </CardDescription>
          </div>
        </div>
      </Card>

      <div className="flex flex-col gap-2">
        <Link
          href="/app/learn"
          className="inline-flex w-full min-h-touch items-center justify-center rounded-lg bg-primary-600 px-4 py-3 text-body font-semibold text-white hover:bg-primary-700"
        >
          Browse lessons (B1)
        </Link>
        <Link
          href="/app/practice"
          className="inline-flex w-full min-h-touch items-center justify-center rounded-lg border border-slate-200 bg-surface-muted px-4 py-3 text-body font-semibold text-ink-primary hover:bg-slate-200"
        >
          Practice hub
        </Link>
        <Link
          href="/app/exam-prep"
          className="inline-flex w-full min-h-touch items-center justify-center rounded-lg border border-slate-200 bg-surface-muted px-4 py-3 text-body font-semibold text-ink-primary hover:bg-slate-200"
        >
          Exam preparation
        </Link>
        <Link
          href="/app/progress"
          className="text-center text-body-sm font-medium text-primary-700 py-2 hover:underline"
        >
          Progress — change your post-A2 path
        </Link>
      </div>
    </div>
  )
}
