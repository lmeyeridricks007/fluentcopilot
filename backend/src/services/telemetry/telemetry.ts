import type { InvocationContext } from '@azure/functions'

/**
 * Application Insights wiring: set APPLICATIONINSIGHTS_CONNECTION_STRING in Azure.
 * For local dev, logs flow to Functions host + optional AI if configured.
 */
export function trackDependency(
  ctx: InvocationContext,
  name: string,
  durationMs: number,
  success: boolean,
  data?: Record<string, string>
): void {
  ctx.log(
    `[telemetry] dependency name=${name} durationMs=${durationMs} success=${success} ${JSON.stringify(data ?? {})}`
  )
}

export function trackEvent(ctx: InvocationContext, name: string, props?: Record<string, string>): void {
  ctx.log(`[telemetry] event name=${name} ${JSON.stringify(props ?? {})}`)
}
