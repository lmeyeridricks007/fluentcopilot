/**
 * AI Conversation Engine — telemetry hooks for conversation events.
 */

export interface TurnTelemetryPayload {
  session_id: string
  event: string
  payload?: Record<string, unknown>
  timestamp?: string
}

const noop = (): void => {}

let recordTurnFn: (payload: TurnTelemetryPayload) => void = noop

export function setTelemetryRecorder(fn: (payload: TurnTelemetryPayload) => void): void {
  recordTurnFn = fn
}

export function recordTurn(payload: TurnTelemetryPayload): void {
  recordTurnFn({ ...payload, timestamp: payload.timestamp ?? new Date().toISOString() })
}

export function recordSessionStart(sessionId: string, meta: Record<string, unknown>): void {
  recordTurn({ session_id: sessionId, event: 'session_start', payload: meta })
}

export function recordSessionEnd(sessionId: string, meta: Record<string, unknown>): void {
  recordTurn({ session_id: sessionId, event: 'session_end', payload: meta })
}
