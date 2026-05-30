'use client'

import { useCallback, useRef, useState } from 'react'
import {
  startMediaRecordingSession,
  type ActiveMediaRecording,
  type StartMediaRecordingSessionOptions,
} from '@/lib/speech/mediaRecorderCapture'

export type RecorderPhase = 'idle' | 'recording'

/**
 * Thin MediaRecorder wrapper for short Dutch clips — same capture path as chat voice.
 * Prefer server transcription (`transcribeSpeechAudio`) after {@link ActiveMediaRecording.stop}.
 */
export function useRecorder() {
  const [phase, setPhase] = useState<RecorderPhase>('idle')
  const sessionRef = useRef<ActiveMediaRecording | null>(null)

  const cancel = useCallback(() => {
    sessionRef.current?.cancel()
    sessionRef.current = null
    setPhase('idle')
  }, [])

  const start = useCallback(async (opts?: Pick<StartMediaRecordingSessionOptions, 'maxDurationMs' | 'requestDataBeforeStop'>) => {
    cancel()
    setPhase('recording')
    const s = await startMediaRecordingSession(opts)
    sessionRef.current = s
    return s
  }, [cancel])

  const stop = useCallback(async () => {
    const s = sessionRef.current
    sessionRef.current = null
    if (!s) {
      setPhase('idle')
      throw new Error('Recorder was not active')
    }
    const out = await s.stop()
    setPhase('idle')
    return out
  }, [])

  return {
    phase,
    start,
    stop,
    cancel,
    getState: () => phase,
  }
}
