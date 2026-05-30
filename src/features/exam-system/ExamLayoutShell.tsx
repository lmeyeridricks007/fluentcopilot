'use client'

import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { collectExamDebugQueryParam } from '@/lib/exam-system/examDevDebug'

export function ExamLayoutShell({ children }: { children: ReactNode }) {
  useEffect(() => {
    collectExamDebugQueryParam()
  }, [])
  return <>{children}</>
}
