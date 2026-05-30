import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildDayPracticePackFromCaptures } from '@/features/quick-capture/dayPackFromCaptures'
import type { DayPracticeStep } from '@/features/quick-capture/dayPackFromCaptures'
import type { QuickCaptureItem } from '@/lib/api/quickCaptureClient'
import {
  appendPersonalizedPracticeSession,
  buildPersonalizedPracticeReport,
  getPersonalizedPracticeHistoryEntry,
  listPersonalizedPracticeHistory,
  progressionSessionIdForFromYourDayPack,
} from '@/lib/quick-capture/personalizedPracticeHistory'
import { personalizedPracticeReportHref } from '@/lib/routing/appRoutes'

describe('personalized practice history + report (browser APIs mocked)', () => {
  const ls = new Map<string, string>()

  beforeEach(() => {
    ls.clear()
    globalThis.window = {
      localStorage: {
        getItem: (k: string) => ls.get(k) ?? null,
        setItem: (k: string, v: string) => {
          ls.set(k, v)
        },
        removeItem: (k: string) => {
          ls.delete(k)
        },
        clear: () => ls.clear(),
        key: (i: number) => Array.from(ls.keys())[i] ?? null,
        get length() {
          return ls.size
        },
      },
    } as unknown as Window & typeof globalThis
  })

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'window')
  })

  it('progression id and report href are stable per pack', () => {
    const packId = 'pack-abc'
    expect(progressionSessionIdForFromYourDayPack(packId)).toBe('from-your-day:pack-abc')
    expect(personalizedPracticeReportHref(packId)).toContain(encodeURIComponent(packId))
  })

  it('append + get round-trip history entry', () => {
    const userId = 'test-user'
    const packId = 'pack-1'
    const report = buildPersonalizedPracticeReport({
      pack: {
        id: packId,
        userId,
        localDate: '2026-04-22',
        title: 'From your day',
        stepsJson: '[]',
        captureIdsJson: JSON.stringify(['c1']),
        status: 'completed',
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      },
      steps: [{ id: 's1', kind: 'short_recap', captureId: 'c1', headline: 'Hi', bullets: ['a'], prompt: 'p' }] as DayPracticeStep[],
      captureById: new Map<string, QuickCaptureItem>([
        [
          'c1',
          {
            id: 'c1',
            captureType: 'save_word',
            status: 'practiced',
            title: null,
            bodyPrimary: 'fiets',
            bodySecondary: null,
            enrichedJson: null,
            rawJson: null,
            localCaptureDate: '2026-04-22',
            placeKind: null,
            imageMime: null,
            transcript: null,
            dayPackId: packId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      ]),
      packCaptureIds: ['c1'],
      themeSummary: 'Words · travel',
      practicePackMode: 'standard',
      weaknessTags: [],
      stepsCompleted: 4,
      stepsTotal: 5,
      completedAt: new Date().toISOString(),
      flowKind: 'checklist',
    })

    appendPersonalizedPracticeSession({
      packId,
      progressionSessionId: report.progressionSessionId,
      userId,
      title: report.title,
      localDateYmd: report.localDateYmd,
      endedAt: report.completedAt,
      themeSummary: report.themeSummary,
      sourceThemes: report.sourceThemes,
      xpAwarded: 12,
      completed: true,
      practicePackMode: 'standard',
      report,
    })

    const back = getPersonalizedPracticeHistoryEntry(userId, packId)
    expect(back?.report.packId).toBe(packId)
    expect(listPersonalizedPracticeHistory(userId).length).toBeGreaterThanOrEqual(1)
  })

  it('builds report from offline pack steps + captures', () => {
    const caps: QuickCaptureItem[] = [
      {
        id: 'w1',
        captureType: 'save_word',
        status: 'ready_for_practice',
        title: null,
        bodyPrimary: 'straat',
        bodySecondary: null,
        enrichedJson: null,
        rawJson: null,
        localCaptureDate: '2026-04-22',
        placeKind: null,
        imageMime: null,
        transcript: null,
        dayPackId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]
    const content = buildDayPracticePackFromCaptures({ localDate: '2026-04-22', captures: caps, mode: 'quick_rep' })
    const captureById = new Map(caps.map((c) => [c.id, c]))
    const report = buildPersonalizedPracticeReport({
      pack: {
        id: 'local-pack',
        userId: 'u',
        localDate: '2026-04-22',
        title: content.title,
        stepsJson: JSON.stringify(content.steps),
        captureIdsJson: JSON.stringify(content.captureIds),
        status: 'completed',
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      },
      steps: content.steps as DayPracticeStep[],
      captureById,
      packCaptureIds: content.captureIds,
      themeSummary: 'Test',
      practicePackMode: 'quick_rep',
      weaknessTags: [],
      stepsCompleted: content.steps.filter((s) => s.kind !== 'pack_meta').length,
      stepsTotal: content.steps.filter((s) => s.kind !== 'pack_meta').length,
      completedAt: new Date().toISOString(),
      flowKind: 'checklist',
    })
    expect(report.stats.captureCount).toBeGreaterThanOrEqual(1)
    expect(report.fromToday.bullets.length).toBeGreaterThanOrEqual(1)
  })
})
