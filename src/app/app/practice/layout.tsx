'use client'

import { usePathname } from 'next/navigation'
import { getPracticeLockFeature } from '@/lib/entitlements'
import { useProductEntitlements } from '@/features/entitlements/useProductEntitlements'
import { PremiumLockedScreen } from '@/features/entitlements/PremiumLockedScreen'

export default function PracticeLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { canAccess } = useProductEntitlements()
  const feature = getPracticeLockFeature(pathname)

  if (!feature || canAccess(feature)) {
    return <>{children}</>
  }

  return (
    <PremiumLockedScreen
      featureKey={feature}
      backHref="/app/talk"
      backLabel="Back to Talk"
      surface={`practice_layout:${pathname}`}
    />
  )
}
