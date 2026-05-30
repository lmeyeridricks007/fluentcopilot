/**
 * Structured AI telemetry — avoid logging full user text in production-style logs.
 */

export type AiRunFields = Record<string, string | number | boolean | undefined>

const verbose = () => process.env.AI_LOG_VERBOSE === '1' || process.env.AI_LOG_VERBOSE === 'true'

export function aiLogInfo(operation: string, fields: AiRunFields): void {
  console.log(
    JSON.stringify({
      level: 'ai_info',
      operation,
      ...fields,
      t: new Date().toISOString(),
    })
  )
}

export function aiLogWarn(operation: string, fields: AiRunFields): void {
  console.warn(
    JSON.stringify({
      level: 'ai_warn',
      operation,
      ...fields,
      t: new Date().toISOString(),
    })
  )
}

export function aiLogError(operation: string, err: unknown, fields: AiRunFields): void {
  const e = err instanceof Error ? { message: err.message, name: err.name } : { message: String(err) }
  console.error(
    JSON.stringify({
      level: 'ai_error',
      operation,
      ...e,
      ...fields,
      t: new Date().toISOString(),
    })
  )
}

/** Length-only hint for prompts (safe default). Full text only when AI_LOG_VERBOSE. */
export function safeUserTextHint(userText: string): { userTextChars: number; userText?: string } {
  if (verbose()) {
    return { userTextChars: userText.length, userText }
  }
  return { userTextChars: userText.length }
}
