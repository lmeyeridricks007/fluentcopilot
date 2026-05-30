'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { useCallback, useRef, useState } from 'react'
import { clsx } from 'clsx'

export function normText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[""'`´]/g, "'")
    .replace(/[^\p{L}\p{N}\s'-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function speakNl(text: string): void {
  speakNlWithRate(text, 0.9)
}

/** Browser Dutch TTS — used when server reference audio is unavailable. */
export function speakNlWithRate(text: string, rate: number): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'nl-NL'
  u.rate = rate
  const voices = window.speechSynthesis.getVoices()
  const v =
    voices.find((x) => x.lang?.toLowerCase().startsWith('nl-nl')) ||
    voices.find((x) => x.lang?.toLowerCase().startsWith('nl')) ||
    null
  if (v) u.voice = v
  window.speechSynthesis.speak(u)
}

export function useMicRecorder(maxMs = 22000) {
  const [recState, setRecState] = useState<'idle' | 'recording' | 'stopped'>('idle')
  const [url, setUrl] = useState<string | null>(null)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])

  const stop = useCallback(() => {
    mediaRef.current?.stop()
    setRecState('stopped')
  }, [])

  const start = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    chunksRef.current = []
    const mr = new MediaRecorder(stream)
    mediaRef.current = mr
    mr.ondataavailable = (e) => {
      if (e.data.size) chunksRef.current.push(e.data)
    }
    mr.onstop = () => {
      stream.getTracks().forEach((t) => t.stop())
      const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' })
      setUrl((u) => {
        if (u) URL.revokeObjectURL(u)
        return URL.createObjectURL(blob)
      })
    }
    mr.start()
    setRecState('recording')
    window.setTimeout(() => {
      if (mediaRef.current?.state === 'recording') stop()
    }, maxMs)
  }, [maxMs, stop])

  const reset = useCallback(() => {
    stop()
    setUrl((u) => {
      if (u) URL.revokeObjectURL(u)
      return null
    })
    setRecState('idle')
  }, [stop])

  return { recState, url, start, stop, reset }
}

export type BlockSurfaceProps = ComponentPropsWithoutRef<'div'> & {
  compact?: boolean
}

export function BlockSurface({ compact, className, children, ...rest }: BlockSurfaceProps) {
  return (
    <div className={clsx(compact ? 'space-y-2' : 'space-y-3', className)} {...rest}>
      {children}
    </div>
  )
}
