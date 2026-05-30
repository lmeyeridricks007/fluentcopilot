import type { QuickCaptureRow } from '../../repositories/quickCaptureRepository'
import {
  buildPersonalizedDayPracticePack,
  type DayPracticePackContent,
  type DayPracticeStep,
  type PracticePackMode,
} from './personalizedPracticePackBuilder'

export type { DayPracticePackContent, DayPracticeStep, PracticePackMode }
export { buildPersonalizedDayPracticePack }

/**
 * Back-compat entry: standard mode, no clustering (offline / tests without bundle).
 * Prefer {@link buildPersonalizedDayPracticePack} with theme clusters + bundle order.
 */
export function buildDayPracticePackFromCaptures(params: {
  localDate: string
  captures: QuickCaptureRow[]
}): DayPracticePackContent {
  return buildPersonalizedDayPracticePack({
    localDate: params.localDate,
    captures: params.captures,
    themeClusters: [],
    bundleCaptureIds: null,
    mode: 'standard',
  })
}
