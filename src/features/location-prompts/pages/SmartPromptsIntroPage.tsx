/**
 * FD-08 — Smart Prompts intro / entry (standalone or from Home).
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Coffee, Train, ShoppingCart } from 'lucide-react'
import { Card, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LocationPermissionCard } from '../components/LocationPermissionCard'
import { PremiumSmartPromptGate } from '../components/PremiumSmartPromptGate'
import { useLocationPermission } from '../hooks/useLocationPermission'
import { useLocationPromptPreferencesStore } from '../store/locationPromptPreferencesStore'
import { usePremiumStore } from '@/store/premiumStore'
import { track } from '@/lib/analytics'

export function SmartPromptsIntroPage() {
  const router = useRouter()
  const { status, checking, request } = useLocationPermission()
  const enabled = useLocationPromptPreferencesStore((s) => s.enabled)
  const setEnabled = useLocationPromptPreferencesStore((s) => s.setEnabled)
  const isPremium = usePremiumStore((s) => s.isPremium)

  useEffect(() => {
    track('smart_prompt_intro_viewed' as const)
  }, [])

  const handleEnable = async () => {
    track('smart_prompt_enable_clicked' as const)
    track('location_permission_requested' as const)
    const granted = await request()
    if (granted) {
      track('location_permission_granted' as const)
      setEnabled(true)
      router.push('/app/context-prompts')
    } else {
      track('location_permission_denied' as const)
    }
  }

  if (checking) {
    return (
      <div className="px-4 py-6">
        <div className="animate-pulse h-8 bg-slate-200 rounded w-2/3 mb-4" />
        <div className="animate-pulse h-4 bg-slate-100 rounded w-full mb-2" />
        <div className="animate-pulse h-4 bg-slate-100 rounded w-4/5" />
      </div>
    )
  }

  return (
    <div className="px-4 py-6 space-y-6">
      <h1 className="text-title font-bold text-ink-primary">Smart Prompts</h1>
      <p className="text-body text-ink-secondary">
        Your personal Dutch assistant for the real world. Get phrase suggestions when you’re near a café, station, or shop.
      </p>

      <section>
        <h2 className="text-body-lg font-semibold text-ink-primary mb-2">How it works</h2>
        <div className="grid grid-cols-1 gap-3">
          <Card variant="outlined" padding="sm" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
              <Coffee className="w-5 h-5 text-primary-600" aria-hidden />
            </div>
            <div>
              <p className="font-medium text-ink-primary">Near a café</p>
              <p className="text-caption text-ink-secondary">Ordering phrases in Dutch</p>
            </div>
          </Card>
          <Card variant="outlined" padding="sm" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
              <Train className="w-5 h-5 text-primary-600" aria-hidden />
            </div>
            <div>
              <p className="font-medium text-ink-primary">At the station</p>
              <p className="text-caption text-ink-secondary">Ticket and platform phrases</p>
            </div>
          </Card>
          <Card variant="outlined" padding="sm" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
              <ShoppingCart className="w-5 h-5 text-primary-600" aria-hidden />
            </div>
            <div>
              <p className="font-medium text-ink-primary">In the supermarket</p>
              <p className="text-caption text-ink-secondary">Shopping and checkout phrases</p>
            </div>
          </Card>
        </div>
      </section>

      {status !== 'granted' && (
        <LocationPermissionCard
          onEnable={handleEnable}
          onNotNow={() => router.push('/app/context-prompts')}
        />
      )}

      {status === 'granted' && !enabled && (
        <Card variant="outlined" padding="md">
          <CardTitle className="text-body">Turn on Smart Prompts</CardTitle>
          <CardDescription className="mt-1">You’ll see prompts when you’re near supported places.</CardDescription>
          <Button className="mt-4 w-full" onClick={() => { setEnabled(true); router.push('/app/context-prompts'); }}>
            Enable Smart Prompts
          </Button>
        </Card>
      )}

      {status === 'granted' && enabled && (
        <Button className="w-full" onClick={() => router.push('/app/context-prompts')}>
          Open Smart Prompts feed
        </Button>
      )}

      {!isPremium && (
        <PremiumSmartPromptGate
          onUpgrade={() => {
            track('smart_prompt_premium_cta_clicked' as const)
            router.push('/app/premium')
          }}
          message="Unlock live Smart Prompts and practice for every situation with Premium."
        />
      )}

      <Button variant="ghost" className="w-full" onClick={() => router.push('/app/talk')}>
        Not now
      </Button>
    </div>
  )
}
