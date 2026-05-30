import { isConversationPerfLogsEnabled } from './apiConfig'

/** Logs structured timing in local development, or whenever `NEXT_PUBLIC_CONVERSATION_PERF=1`. */
export function logConversationPerf(event: string, payload: Record<string, unknown>): void {
  const dev = process.env.NODE_ENV === 'development'
  if (!dev && !isConversationPerfLogsEnabled()) return
  console.info('[fc-conv]', event, payload)
}
