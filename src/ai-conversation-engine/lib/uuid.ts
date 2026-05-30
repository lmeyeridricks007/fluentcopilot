/**
 * Cross-environment session ID generation (Node + browser).
 */
export function createSessionId(): string {
  const g = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined
  const c = g && (g as { crypto?: { randomUUID?: () => string } }).crypto
  if (c?.randomUUID) return c.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0
    const v = ch === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
