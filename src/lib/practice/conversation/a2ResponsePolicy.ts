/** A2-safe assistant output — keep turns short and practical (not a generic chatbot). */

export const A2_ASSISTANT_MAX_CHARS = 240
export const A2_PREFERRED_MAX_SENTENCES = 2

export function clampAssistantReplyDutch(text: string, maxChars = A2_ASSISTANT_MAX_CHARS): string {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= maxChars) return t
  const cut = t.slice(0, maxChars - 1)
  const lastPeriod = cut.lastIndexOf('.')
  if (lastPeriod > 40) return cut.slice(0, lastPeriod + 1)
  return `${cut}…`
}
