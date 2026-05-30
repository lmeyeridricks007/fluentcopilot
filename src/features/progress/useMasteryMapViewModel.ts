'use client'

import { useMemo } from 'react'
import { buildMasteryMapViewModel, type MasteryMapViewModel } from '@/lib/mastery/masteryPresenterModel'
import { useMasteryBuildInput } from '@/features/progress/useMasteryBuildInput'

export function useMasteryMapViewModel(): MasteryMapViewModel {
  const input = useMasteryBuildInput()
  return useMemo(() => buildMasteryMapViewModel(input), [input])
}
