import type { InvocationContext } from '@azure/functions'

/** Structured phase timings for conversation endpoints (ms since epoch + deltas). */
export class ConversationPerf {
  private readonly t0 = Date.now()
  private readonly marks = new Map<string, number>()

  mark(label: string): void {
    this.marks.set(label, Date.now())
  }

  /** Milliseconds between two marks (chronological order of labels does not matter). */
  deltaBetween(fromLabel: string, toLabel: string): number | undefined {
    const a = this.marks.get(fromLabel)
    const b = this.marks.get(toLabel)
    if (a === undefined || b === undefined) return undefined
    return Math.max(0, b - a)
  }

  /** Durations in ms from t0 and between consecutive marks (best-effort). */
  snapshot(): Record<string, number> {
    const out: Record<string, number> = {}
    out.tTotalMs = Date.now() - this.t0
    const ordered = [...this.marks.entries()].sort((a, b) => a[1] - b[1])
    let prev = this.t0
    for (const [k, t] of ordered) {
      out[`d_${k}_ms`] = t - prev
      prev = t
    }
    return out
  }

  logDev(ctx: InvocationContext | undefined, event: string, extra?: Record<string, unknown>): void {
    const profile = process.env.APP_PROFILE ?? ''
    if (profile !== 'LocalMock' && profile !== 'LocalAzure' && process.env.CONVERSATION_PERF_LOG !== '1') {
      return
    }
    const snap = this.snapshot()
    const payload = { event, ...snap, ...extra }
    const line = JSON.stringify({ msg: 'conversation_perf', ...payload })
    if (ctx) {
      ctx.log(`[INFO] ${line}`)
    } else {
      // eslint-disable-next-line no-console
      console.log(line)
    }
  }
}
