'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'
import { BottomNav } from './BottomNav'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { OfflineBanner } from '@/components/ui/OfflineBanner'
import { EntitlementProvider, TrialBanner } from '@/features/entitlements'
import { MotionPreferenceSync } from '@/components/interaction/MotionPreferenceSync'
import { QuickCaptureProvider } from '@/components/capture/QuickCaptureContext'

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const speakLiveImmersive = pathname?.startsWith('/app/talk/live/run') ?? false

  return (
    <EntitlementProvider>
      <QuickCaptureProvider>
        <MotionPreferenceSync />
        <div
          className={clsx(
            'flex min-h-screen bg-surface text-ink-primary',
            !speakLiveImmersive && 'pb-safe-bottom'
          )}
        >
          {!speakLiveImmersive ? <Sidebar /> : null}
          <div className={clsx('flex min-w-0 flex-1 flex-col', !speakLiveImmersive && 'lg:bg-surface-subtle')}>
            <OfflineBanner />
            {!speakLiveImmersive ? <Header /> : null}
            {!speakLiveImmersive ? <TrialBanner /> : null}
            <main className={clsx('flex-1 overflow-auto', speakLiveImmersive ? 'pb-0' : 'pb-28 lg:pb-12')}>
              {children}
            </main>
            {!speakLiveImmersive ? <BottomNav /> : null}
          </div>
        </div>
      </QuickCaptureProvider>
    </EntitlementProvider>
  )
}
