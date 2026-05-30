/**
 * FD-09 — settings panel: enable, location, photo, voice, manual-only, auto-generate, delete history.
 */

import { Card, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { DailyLessonPrivacyNotice } from './DailyLessonPrivacyNotice'
import type { DailyLessonPreferences } from '../types'

interface DailyLessonSettingsPanelProps {
  preferences: DailyLessonPreferences
  onToggleEnabled: (v: boolean) => void
  onToggleUseLocation: (v: boolean) => void
  onToggleUsePhotoAnalysis: (v: boolean) => void
  onToggleUseVoiceNotes: (v: boolean) => void
  onToggleManualOnlyMode: (v: boolean) => void
  onToggleAutoGenerate: (v: boolean) => void
  onDeleteHistory: () => void
  permissionStatus?: string
}

export function DailyLessonSettingsPanel({
  preferences,
  onToggleEnabled,
  onToggleUseLocation,
  onToggleUsePhotoAnalysis,
  onToggleUseVoiceNotes,
  onToggleManualOnlyMode,
  onToggleAutoGenerate,
  onDeleteHistory,
}: DailyLessonSettingsPanelProps) {
  return (
    <div className="space-y-6">
      <Card variant="outlined" padding="md">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-body">Daily Life Lessons</CardTitle>
            <CardDescription className="mt-0.5">Turn your day into Dutch practice</CardDescription>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.enabled}
              onChange={(e) => onToggleEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600" />
          </label>
        </div>
      </Card>

      {preferences.enabled && (
        <>
          <Card variant="outlined" padding="md">
            <CardTitle className="text-body">Manual-only mode</CardTitle>
            <CardDescription className="mt-0.5">Only use moments you capture manually. No location or automatic capture.</CardDescription>
            <label className="mt-3 flex items-center justify-between cursor-pointer">
              <span className="text-body text-ink-primary">Use manual-only mode</span>
              <input
                type="checkbox"
                checked={preferences.manualOnlyMode}
                onChange={(e) => onToggleManualOnlyMode(e.target.checked)}
                className="rounded border-slate-300 text-primary-600"
              />
            </label>
          </Card>

          {!preferences.manualOnlyMode && (
            <>
              <Card variant="outlined" padding="md">
                <CardTitle className="text-body">Location</CardTitle>
                <CardDescription className="mt-0.5">Use location to suggest moments (e.g. café, station).</CardDescription>
                <label className="mt-3 flex items-center justify-between cursor-pointer">
                  <span className="text-body text-ink-primary">Use location</span>
                  <input
                    type="checkbox"
                    checked={preferences.useLocation}
                    onChange={(e) => onToggleUseLocation(e.target.checked)}
                    className="rounded border-slate-300 text-primary-600"
                  />
                </label>
              </Card>
              <Card variant="outlined" padding="md">
                <CardTitle className="text-body">Photo analysis</CardTitle>
                <CardDescription className="mt-0.5">Optionally use photos to add context (e.g. menu, product).</CardDescription>
                <label className="mt-3 flex items-center justify-between cursor-pointer">
                  <span className="text-body text-ink-primary">Allow photo analysis</span>
                  <input
                    type="checkbox"
                    checked={preferences.usePhotoAnalysis}
                    onChange={(e) => onToggleUsePhotoAnalysis(e.target.checked)}
                    className="rounded border-slate-300 text-primary-600"
                  />
                </label>
              </Card>
              <Card variant="outlined" padding="md">
                <CardTitle className="text-body">Voice notes</CardTitle>
                <CardDescription className="mt-0.5">Capture voice notes to include in your lesson.</CardDescription>
                <label className="mt-3 flex items-center justify-between cursor-pointer">
                  <span className="text-body text-ink-primary">Allow voice notes</span>
                  <input
                    type="checkbox"
                    checked={preferences.useVoiceNotes}
                    onChange={(e) => onToggleUseVoiceNotes(e.target.checked)}
                    className="rounded border-slate-300 text-primary-600"
                  />
                </label>
              </Card>
            </>
          )}

          <Card variant="outlined" padding="md">
            <CardTitle className="text-body">Automatic generation</CardTitle>
            <CardDescription className="mt-0.5">Generate a lesson automatically at the end of the day (e.g. 8 PM).</CardDescription>
            <label className="mt-3 flex items-center justify-between cursor-pointer">
              <span className="text-body text-ink-primary">Generate at end of day</span>
              <input
                type="checkbox"
                checked={preferences.autoGenerateAtEndOfDay}
                onChange={(e) => onToggleAutoGenerate(e.target.checked)}
                className="rounded border-slate-300 text-primary-600"
              />
            </label>
          </Card>

          <Card variant="outlined" padding="md">
            <CardTitle className="text-body">History</CardTitle>
            <CardDescription className="mt-0.5">Delete all your generated daily lessons from history.</CardDescription>
            <Button variant="danger" size="sm" className="mt-3" onClick={onDeleteHistory}>
              Delete history
            </Button>
          </Card>
        </>
      )}

      <DailyLessonPrivacyNotice />
    </div>
  )
}
