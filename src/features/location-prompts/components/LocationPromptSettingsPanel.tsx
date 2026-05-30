/**
 * FD-08 — settings panel (enable, only when open, notifications, venues, frequency).
 */

import { Card, CardTitle, CardDescription } from '@/components/ui/Card'
import { LocationPermissionStatus } from './LocationPermissionStatus'
import { VenueCategorySelector } from './VenueCategorySelector'
import { PromptFrequencySelector } from './PromptFrequencySelector'
import type { LocationPermissionStatus as Status } from '../types'
import type { PromptPreferences, VenueType } from '../types'

interface LocationPromptSettingsPanelProps {
  preferences: PromptPreferences
  permissionStatus: Status
  onToggleEnabled: (v: boolean) => void
  onToggleOnlyWhenAppOpen: (v: boolean) => void
  onToggleNotifications: (v: boolean) => void
  onVenueCategoryChange: (venue: VenueType, enabled: boolean) => void
  onFrequencyChange: (v: PromptPreferences['frequency']) => void
  onRequestPermission?: () => void
}

export function LocationPromptSettingsPanel({
  preferences,
  permissionStatus,
  onToggleEnabled,
  onToggleOnlyWhenAppOpen,
  onToggleNotifications,
  onVenueCategoryChange,
  onFrequencyChange,
  onRequestPermission,
}: LocationPromptSettingsPanelProps) {
  return (
    <div className="space-y-6">
      <Card variant="outlined" padding="md">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-body">Smart Prompts</CardTitle>
            <CardDescription className="mt-0.5">Context-aware phrase suggestions</CardDescription>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.enabled}
              onChange={(e) => onToggleEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600" />
          </label>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-200">
          <LocationPermissionStatus status={permissionStatus} />
          {permissionStatus !== 'granted' && onRequestPermission && (
            <button
              type="button"
              onClick={onRequestPermission}
              className="ml-3 text-body-sm font-medium text-primary-600 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 rounded"
            >
              Enable location
            </button>
          )}
        </div>
      </Card>

      {preferences.enabled && (
        <>
          <Card variant="outlined" padding="md">
            <CardTitle className="text-body">When to show prompts</CardTitle>
            <CardDescription className="mt-0.5">Only when app is open: fewer prompts, more control</CardDescription>
            <label className="mt-3 flex items-center justify-between cursor-pointer">
              <span className="text-body text-ink-primary">Only when app is open</span>
              <input
                type="checkbox"
                checked={preferences.onlyWhenAppOpen}
                onChange={(e) => onToggleOnlyWhenAppOpen(e.target.checked)}
                className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              />
            </label>
          </Card>

          <Card variant="outlined" padding="md">
            <CardTitle className="text-body">Push notifications</CardTitle>
            <CardDescription className="mt-0.5">Notify when you’re near a relevant place (optional)</CardDescription>
            <label className="mt-3 flex items-center justify-between cursor-pointer">
              <span className="text-body text-ink-primary">Allow push for Smart Prompts</span>
              <input
                type="checkbox"
                checked={preferences.allowPushNotifications}
                onChange={(e) => onToggleNotifications(e.target.checked)}
                className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              />
            </label>
          </Card>

          <Card variant="outlined" padding="md">
            <CardTitle className="text-body">Frequency</CardTitle>
            <CardDescription className="mt-0.5">How often to show a prompt for the same type of place</CardDescription>
            <div className="mt-3">
              <PromptFrequencySelector
                value={preferences.frequency}
                onChange={onFrequencyChange}
              />
            </div>
          </Card>

          <Card variant="outlined" padding="md">
            <CardTitle className="text-body">Places</CardTitle>
            <CardDescription className="mt-0.5">Choose which types of places can trigger prompts</CardDescription>
            <div className="mt-3">
              <VenueCategorySelector
                selected={preferences.venueCategories}
                onChange={onVenueCategoryChange}
              />
            </div>
          </Card>
        </>
      )}

      <p className="text-caption text-ink-tertiary">
        We use location only to suggest phrases. We don’t store your location history. You can turn Smart Prompts off anytime.
      </p>
    </div>
  )
}
