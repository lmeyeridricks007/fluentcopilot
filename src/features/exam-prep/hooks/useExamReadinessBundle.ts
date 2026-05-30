'use client'

import { useCallback, useEffect, useState } from 'react'
import { loadWeakTags } from '@/features/curriculum/a2ReviewStore'
import { buildExamReadinessPresenterBundle } from '@/lib/exam-readiness/examReadinessCalculator'
import type { ExamReadinessPresenterBundle } from '@/lib/exam-readiness/types'
import { EXAM_READINESS_STORAGE_UPDATED_EVENT } from '@/lib/exam-readiness/examReadinessHistory'

function computeBundle(): ExamReadinessPresenterBundle {
  return buildExamReadinessPresenterBundle(loadWeakTags())
}

const emptyBundle = buildExamReadinessPresenterBundle([])

/** Recomputes when local exam attempts or weak-tag store change (same tab). */
export function useExamReadinessBundle(): ExamReadinessPresenterBundle {
  const [bundle, setBundle] = useState<ExamReadinessPresenterBundle>(emptyBundle)

  const refresh = useCallback(() => {
    setBundle(computeBundle())
  }, [])

  useEffect(() => {
    refresh()
    const onUpdate = () => refresh()
    window.addEventListener(EXAM_READINESS_STORAGE_UPDATED_EVENT, onUpdate)
    return () => window.removeEventListener(EXAM_READINESS_STORAGE_UPDATED_EVENT, onUpdate)
  }, [refresh])

  return bundle
}
