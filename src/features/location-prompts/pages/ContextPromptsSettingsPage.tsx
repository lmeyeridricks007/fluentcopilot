/**
 * FD-08 — Smart Prompts settings.
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { LocationPromptSettingsPanel } from '../components/LocationPromptSettingsPanel'
import { locationPromptPreferencesService } from '../services/mockServices'
import { useLocationPermission } from '../hooks/useLocationPermission'
import { useLocationPromptPreferencesStore } from '../store/locationPromptPreferencesStore'
import { track } from '@/lib/analytics'

export function ContextPromptsSettingsPage() {
  const router = useRouter()
  const { status, request, recheck } = useLocationPermission()
  const store = useLocationPromptPreferencesStore()

  const { data: prefs } = useQuery({
    queryKey: ['location-prompts', 'preferences'],
    queryFn: () => locationPromptPreferencesService.getPreferences(),
  })

  useEffect(() => {
    if (prefs) store.hydrate(prefs)
  }, [prefs])

  const handleRequestPermission = async () => {
    await request()
    recheck()
  }

  const trackSettingsUpdate = () => track('smart_prompt_settings_updated' as const)

  return (
    <div className="px-4 py-6">
      <div className="flex items-center gap-2 mb-6">
        <button
          type="button"
          onClick={() => router.push('/app/context-prompts')}
          className="p-2 rounded-lg hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 text-ink-secondary"
          aria-label="Back"
        >
          ←
        </button>
        <h1 className="text-title font-bold text-ink-primary">Smart Prompts settings</h1>
      </div>

      <LocationPromptSettingsPanel
        preferences={{
          enabled: store.enabled,
          onlyWhenAppOpen: store.onlyWhenAppOpen,
          allowPushNotifications: store.allowPushNotifications,
          venueCategories: store.venueCategories,
          frequency: store.frequency,
        }}
        permissionStatus={status}
        onToggleEnabled={(v) => { store.setEnabled(v); trackSettingsUpdate(); }}
        onToggleOnlyWhenAppOpen={(v) => { store.setOnlyWhenAppOpen(v); trackSettingsUpdate(); }}
        onToggleNotifications={(v) => { store.setAllowPushNotifications(v); trackSettingsUpdate(); }}
        onVenueCategoryChange={(venue, enabled) => { store.setVenueCategory(venue, enabled); trackSettingsUpdate(); }}
        onFrequencyChange={(v) => { store.setFrequency(v); trackSettingsUpdate(); }}
        onRequestPermission={handleRequestPermission}
      />
    </div>
  )
}
