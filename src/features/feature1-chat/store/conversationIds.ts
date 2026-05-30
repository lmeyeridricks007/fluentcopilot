export function newMessageId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `msg-${crypto.randomUUID()}`
  return `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function newThreadId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `th-${crypto.randomUUID()}`
  return `th-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function newFeedbackId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `fb-${crypto.randomUUID()}`
  return `fb-${Date.now()}-${Math.random().toString(16).slice(2)}`
}
