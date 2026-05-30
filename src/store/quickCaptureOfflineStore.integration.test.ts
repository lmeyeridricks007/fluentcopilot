import { beforeEach, describe, expect, it } from 'vitest'
import { offlineSummaryForDate, useQuickCaptureOfflineStore } from '@/store/quickCaptureOfflineStore'

describe('quickCaptureOfflineStore', () => {
  beforeEach(() => {
    useQuickCaptureOfflineStore.setState({ captures: [], packs: [] })
  })

  it('addCapture creates rows for every capture type with ready or enriched status', () => {
    const types = [
      'save_word',
      'save_phrase',
      'photo_text',
      'add_place',
      'paste_text',
      'log_struggle',
      'voice_note',
    ] as const
    for (const captureType of types) {
      const row = useQuickCaptureOfflineStore.getState().addCapture({
        captureType,
        bodyPrimary: `text-${captureType}`,
        localCaptureDate: '2026-04-22',
      })
      expect(row.captureType).toBe(captureType)
      expect(['ready_for_practice', 'enriched']).toContain(row.status)
    }
    expect(useQuickCaptureOfflineStore.getState().captures).toHaveLength(types.length)
  })

  it('offlineSummaryForDate counts ready and new', () => {
    const add = useQuickCaptureOfflineStore.getState().addCapture
    add({ captureType: 'save_word', bodyPrimary: 'a', localCaptureDate: '2026-04-22', initialStatus: 'ready_for_practice' })
    add({ captureType: 'save_phrase', bodyPrimary: 'b', localCaptureDate: '2026-04-22', initialStatus: 'new' })
    add({ captureType: 'voice_note', bodyPrimary: '', transcript: '', localCaptureDate: '2026-04-21', initialStatus: 'new' })
    expect(offlineSummaryForDate('2026-04-22')).toEqual({ readyCount: 1, newCount: 1 })
  })

  it('setCaptureStatus + pack completion updates capture statuses', () => {
    const row = useQuickCaptureOfflineStore.getState().addCapture({
      captureType: 'save_word',
      bodyPrimary: 'x',
      localCaptureDate: '2026-04-22',
      initialStatus: 'ready_for_practice',
    })
    const packId = 'p-offline'
    useQuickCaptureOfflineStore.getState().addPack({
      id: packId,
      userId: 'local',
      localDate: '2026-04-22',
      title: 'Pack',
      stepsJson: '[]',
      captureIdsJson: JSON.stringify([row.id]),
      status: 'active',
      createdAt: new Date().toISOString(),
      completedAt: null,
      steps: [],
    })
    useQuickCaptureOfflineStore.setState((s) => ({
      captures: s.captures.map((c) =>
        c.id === row.id ? { ...c, dayPackId: packId, status: 'included_in_practice' as const } : c,
      ),
    }))
    const patched = useQuickCaptureOfflineStore.getState().captures.find((c) => c.id === row.id)
    expect(patched?.status).toBe('included_in_practice')
    useQuickCaptureOfflineStore.getState().completePack(packId)
    const after = useQuickCaptureOfflineStore.getState().captures.find((c) => c.id === row.id)
    expect(after?.status).toBe('practiced')
  })
})
