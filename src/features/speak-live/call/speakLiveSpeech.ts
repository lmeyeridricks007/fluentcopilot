'use client'

import { clearMicConsent, recordMicConsentGranted } from '@/lib/speech/microphoneConsentStorage'

export type MicrophonePermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported'

export async function queryMicrophonePermission(): Promise<MicrophonePermissionState> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return 'unsupported'
  }
  try {
    const result = await navigator.permissions?.query({ name: 'microphone' as PermissionName })
    if (!result) return 'prompt'
    if (result.state === 'granted') return 'granted'
    if (result.state === 'denied') return 'denied'
    return 'prompt'
  } catch {
    return 'prompt'
  }
}

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
  if (streamRef.current?.getAudioTracks().some((track) => track.readyState === 'live')) {
    resumeMicStream(streamRef)
    return streamRef.current
  }
  streamRef.current = null
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('NO_MEDIA')
  }
  /** Same constraints as chat dictation (`mediaRecorderCapture`) for consistent WebM/Opus quality. */
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        channelCount: 1,
      },
    })
    streamRef.current = stream
    recordMicConsentGranted()
    return stream
  } catch (e) {
    if (e && typeof e === 'object' && 'name' in e && (e as DOMException).name === 'NotAllowedError') {
      clearMicConsent()
    }
    throw e
  }
}

/** Pause capture without releasing browser permission (avoids re-prompting on resume). */
export function suspendMicStream(streamRef: { current: MediaStream | null }): void {
  streamRef.current?.getAudioTracks().forEach((track) => {
    track.enabled = false
  })
}

export function resumeMicStream(streamRef: { current: MediaStream | null }): void {
  streamRef.current?.getAudioTracks().forEach((track) => {
    track.enabled = true
  })
}

export function stopMediaStream(streamRef: { current: MediaStream | null }): void {
  streamRef.current?.getTracks().forEach((t) => t.stop())
  streamRef.current = null
}

export async function refreshMicStream(streamRef: { current: MediaStream | null }): Promise<MediaStream> {
  stopMediaStream(streamRef)
  return ensureMicStream(streamRef)
}

export function micErrorKind(e: unknown): 'mic_denied' | 'audio_failed' {
  if (e && typeof e === 'object' && 'name' in e && (e as DOMException).name === 'NotAllowedError') {
    return 'mic_denied'
  }
  return 'audio_failed'
}
