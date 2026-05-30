'use client'

import type { ReactNode } from 'react'
import { RequireOnboardingRoute } from '@/components/routing/RequireOnboardingRoute'

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return <RequireOnboardingRoute>{children}</RequireOnboardingRoute>
}
