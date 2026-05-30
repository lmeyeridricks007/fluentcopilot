'use client'

export function cancelAiSpeech(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
}

/**
 * Speak with browser TTS. When `muted`, skips audio and calls `onEnd` after a short beat.
 * Returns `false` if `onError` was invoked (caller may set `audio_failed`).
 */
export function speakAiLine(params: {
  text: string
  lang?: string
  muted: boolean
  onEnd: () => void
  onError: () => void
}): void {
  const { text, muted, onEnd, onError } = params
  const lang = params.lang ?? 'nl-NL'

  if (typeof window === 'undefined') {
    onEnd()
    return
  }

  if (muted) {
    window.setTimeout(onEnd, 520)
    return
  }

  if (!('speechSynthesis' in window)) {
    onError()
    return
  }

  try {
    cancelAiSpeech()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang
    u.rate = 0.9
    u.volume = 0.85
    u.pitch = 0.96
    u.onend = onEnd
    u.onerror = () => onError()
    window.speechSynthesis.speak(u)
  } catch {
    onError()
  }
}

export async function ensureMicStream(streamRef: { current: MediaStream | null }): Promise<MediaStream> {
  if (streamRef.current) return streamRef.current
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('NO_MEDIA')
  }
  /** Same constraints as chat dictation (`mediaRecorderCapture`) for consistent WebM/Opus quality. */
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      channelCount: 1,
    },
  })
  streamRef.current = stream
  return stream
}

export function stopMediaStream(streamRef: { current: MediaStream | null }): void {
  streamRef.current?.getTracks().forEach((t) => t.stop())
  streamRef.current = null
}

export function micErrorKind(e: unknown): 'mic_denied' | 'audio_failed' {
  if (e && typeof e === 'object' && 'name' in e && (e as DOMException).name === 'NotAllowedError') {
    return 'mic_denied'
  }
  return 'audio_failed'
}
