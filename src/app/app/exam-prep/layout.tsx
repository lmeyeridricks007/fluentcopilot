'use client'

import { usePathname } from 'next/navigation'
import { useProductEntitlements } from '@/features/entitlements/useProductEntitlements'
import { PremiumLockedScreen } from '@/features/entitlements/PremiumLockedScreen'

export default function ExamPrepLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { canAccess } = useProductEntitlements()
  const isLanding = pathname === '/app/exam-prep' || pathname === '/app/exam-prep/'

  if (isLanding) {
    return <>{children}</>
  }

  if (!canAccess('exam_prep_modules')) {
    return (
      <PremiumLockedScreen
        featureKey="exam_prep_modules"
        backHref="/app/exam-prep"
        backLabel="Back to exam prep"
        surface={`exam_prep_layout:${pathname}`}
      />
    )
  }

  return <>{children}</>
}
