/**
 * FD-09 — Daily Lessons settings and privacy.
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { DailyLessonSettingsPanel } from '../components/DailyLessonSettingsPanel'
import { DeleteHistoryDialog } from '../components/DeleteHistoryDialog'
import { dailyLessonPreferencesService, dailyLessonHistoryService } from '../services/mockServices'
import { useDailyLessonPreferencesStore } from '../store/dailyLessonPreferencesStore'
import { track } from '@/lib/analytics'

export function DailyLessonsSettingsPage() {
  const router = useRouter()
  const store = useDailyLessonPreferencesStore()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const { data: prefs } = useQuery({
    queryKey: ['daily-lessons', 'preferences'],
    queryFn: () => dailyLessonPreferencesService.getPreferences(),
  })

  useEffect(() => {
    if (prefs) store.hydrate(prefs)
  }, [prefs])

  const handleDeleteHistory = async () => {
    track('daily_lesson_delete_history_clicked' as const)
    await dailyLessonHistoryService.deleteHistory()
    setDeleteDialogOpen(false)
    router.push('/app/daily-lessons')
  }

  return (
    <div className="px-4 py-6">
      <div className="flex items-center gap-2 mb-6">
        <button
          type="button"
          onClick={() => router.push('/app/daily-lessons')}
          className="p-2 rounded-lg hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 text-ink-secondary"
          aria-label="Back"
        >
          ←
        </button>
        <h1 className="text-title font-bold text-ink-primary">Daily Lessons settings</h1>
      </div>
      <DailyLessonSettingsPanel
        preferences={{
          enabled: store.enabled,
          useLocation: store.useLocation,
          usePhotoAnalysis: store.usePhotoAnalysis,
          useVoiceNotes: store.useVoiceNotes,
          manualOnlyMode: store.manualOnlyMode,
          autoGenerateAtEndOfDay: store.autoGenerateAtEndOfDay,
          historyRetentionDays: store.historyRetentionDays,
        }}
        onToggleEnabled={store.setEnabled}
        onToggleUseLocation={store.setUseLocation}
        onToggleUsePhotoAnalysis={store.setUsePhotoAnalysis}
        onToggleUseVoiceNotes={store.setUseVoiceNotes}
        onToggleManualOnlyMode={store.setManualOnlyMode}
        onToggleAutoGenerate={store.setAutoGenerateAtEndOfDay}
        onDeleteHistory={() => setDeleteDialogOpen(true)}
      />
      <DeleteHistoryDialog
        open={deleteDialogOpen}
        onConfirm={handleDeleteHistory}
        onCancel={() => setDeleteDialogOpen(false)}
      />
    </div>
  )
}
