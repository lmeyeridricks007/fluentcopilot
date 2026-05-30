import type { QuickCaptureItem } from '@/lib/api/quickCaptureClient'
import {
  buildPersonalizedDayPracticePack,
  type DayPracticePackContent,
  type DayPracticeStep,
  type PracticePackMode,
} from './personalizedPracticePackBuilder.client'

export type { DayPracticePackContent, DayPracticeStep, PracticePackMode }
export { buildPersonalizedDayPracticePack }

function toCaptureForPack(c: QuickCaptureItem) {
  return {
    id: c.id,
    captureType: c.captureType,
    bodyPrimary: c.bodyPrimary,
    bodySecondary: c.bodySecondary,
    enrichedJson: c.enrichedJson,
    transcript: c.transcript,
  }
}

/** Offline / local preview — mirrors API pack shape (no daily bundle clusters). */
export function buildDayPracticePackFromCaptures(params: {
  localDate: string
  captures: QuickCaptureItem[]
  mode?: PracticePackMode
}): DayPracticePackContent {
  return buildPersonalizedDayPracticePack({
    localDate: params.localDate,
    captures: params.captures.map(toCaptureForPack),
    themeClusters: [],
    bundleCaptureIds: null,
    mode: params.mode ?? 'standard',
  })
}
