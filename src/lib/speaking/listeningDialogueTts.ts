/** Default Azure Neural voices for A/B dialogue (listening scenario clips). */
export const LISTENING_DIALOGUE_VOICE_A_NL = 'nl-NL-MaartenNeural'
export const LISTENING_DIALOGUE_VOICE_B_NL = 'nl-NL-FennaNeural'

export type ListeningDialogueTurnRole = 'A' | 'B' | 'narrator'

export type ListeningDialogueTurn = { role: ListeningDialogueTurnRole; text: string }

/**
 * Split a script into turns for TTS. Speaker lines use `A:` / `B:` (case-insensitive); those
 * prefixes are omitted from `text` so the voice change carries the “who is speaking” cue.
 * Leading text without a speaker prefix is one narrator segment (e.g. weerbericht).
 */
export function splitListeningDialogueForTts(scriptNl: string): ListeningDialogueTurn[] {
  const t = scriptNl.trim()
  if (!t) return []
  const segments = t.split(/\b([AB]):\s+/i)
  if (segments.length <= 1) return [{ role: 'narrator', text: t }]
  const out: ListeningDialogueTurn[] = []
  const head = segments[0]?.trim()
  if (head) out.push({ role: 'narrator', text: head })
  for (let i = 1; i < segments.length; i += 2) {
    const raw = segments[i]?.toUpperCase()
    const body = segments[i + 1]?.trim()
    if (body && (raw === 'A' || raw === 'B')) {
      out.push({ role: raw, text: body })
    }
  }
  if (out.length === 0) return [{ role: 'narrator', text: t }]
  return out
}
