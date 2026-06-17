/**
 * Mobile-safe HTMLAudioElement helpers (iOS Safari needs playsInline + a user-gesture unlock).
 */

/** Tiny silent WAV — used once per page to unlock media playback on iOS. */
const SILENT_WAV =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA'

let iosUnlockAttempted = false

export function configureHtmlAudioElement(el: HTMLAudioElement): void {
  el.setAttribute('playsinline', 'true')
  el.setAttribute('webkit-playsinline', 'true')
  if (!el.preload) el.preload = 'auto'
}

export function createHtmlAudio(src?: string): HTMLAudioElement {
  const el = src ? new Audio(src) : new Audio()
  configureHtmlAudioElement(el)
  return el
}

/**
 * Call on the first user tap (e.g. mic press, play button) so later async TTS can play.
 * Safe to call multiple times.
 */
export async function unlockHtmlAudioPlayback(): Promise<void> {
  if (typeof window === 'undefined' || iosUnlockAttempted) return
  iosUnlockAttempted = true
  try {
    const el = createHtmlAudio(SILENT_WAV)
    el.volume = 0.001
    await el.play()
    el.pause()
    el.removeAttribute('src')
    void el.load()
  } catch {
    /* Gesture may still allow the next play() in the same chain. */
  }
}

/**
 * iOS Safari is more reliable with blob: URLs than very large data: URLs for MP3.
 * Caller should revoke the returned URL when done if it differs from `url`.
 */
export function toPlayableAudioSrc(url: string): { src: string; revoke?: () => void } {
  const trimmed = url.trim()
  if (!trimmed.startsWith('data:')) return { src: trimmed }
  try {
    const comma = trimmed.indexOf(',')
    if (comma < 0) return { src: trimmed }
    const meta = trimmed.slice(0, comma)
    const b64 = trimmed.slice(comma + 1)
    const mime = /data:([^;,]+)/.exec(meta)?.[1]?.trim() || 'audio/mpeg'
    const binary = atob(b64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    const blob = new Blob([bytes], { type: mime })
    const objectUrl = URL.createObjectURL(blob)
    return {
      src: objectUrl,
      revoke: () => {
        try {
          URL.revokeObjectURL(objectUrl)
        } catch {
          /* ignore */
        }
      },
    }
  } catch {
    return { src: trimmed }
  }
}

export async function playHtmlAudio(
  url: string,
  opts?: { volume?: number; playbackRate?: number; onEnded?: () => void },
): Promise<{ stop: () => void }> {
  await unlockHtmlAudioPlayback()
  const { src, revoke } = toPlayableAudioSrc(url)
  const el = createHtmlAudio(src)
  if (typeof opts?.volume === 'number') el.volume = opts.volume
  if (typeof opts?.playbackRate === 'number') el.playbackRate = opts.playbackRate
  const stop = () => {
    el.onended = null
    el.onerror = null
    el.pause()
    el.removeAttribute('src')
    void el.load()
    revoke?.()
  }
  const finish = () => {
    stop()
    opts?.onEnded?.()
  }
  try {
    await el.play()
  } catch (err) {
    finish()
    throw err
  }
  el.onended = finish
  el.onerror = finish
  return { stop: finish }
}
