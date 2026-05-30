/**
 * Usage counts factory — for cap enforcement (lessons/scenarios per period).
 */

import type { DemoUsageCounts } from '../types'

function todayPeriodKey(): string {
  return new Date().toISOString().slice(0, 10)
}

export function buildUsageCounts(opts: {
  lessonsCompletedCount?: number
  scenariosCompletedCount?: number
  periodKey?: string
}): DemoUsageCounts {
  return {
    lessonsCompletedCount: opts.lessonsCompletedCount ?? 0,
    scenariosCompletedCount: opts.scenariosCompletedCount ?? 0,
    periodKey: opts.periodKey ?? todayPeriodKey(),
  }
}
