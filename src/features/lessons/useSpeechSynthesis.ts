'use client'

import { useCallback, useEffect } from 'react'

const LANG = 'nl-NL'
const RATE = 0.92

function getSynth(): SpeechSynthesis | null {
  if (typeof window === 'undefined') return null
  return window.speechSynthesis ?? null
}

export function cancelSpeech(): void {
  getSynth()?.cancel()
}

export function useSpeechSynthesis() {
  const speak = useCallback((text: string) => {
    const synth = getSynth()
    if (!synth || !text.trim()) return
    synth.cancel()
    const u = new SpeechSynthesisUtterance(text.trim())
    u.lang = LANG
    u.rate = RATE
    synth.speak(u)
  }, [])

  const speakSequence = useCallback((texts: string[]) => {
    const synth = getSynth()
    if (!synth) return
    synth.cancel()
    const list = texts.map((t) => t.trim()).filter(Boolean)
    if (list.length === 0) return

    let i = 0
    const speakNext = () => {
      if (i >= list.length) return
      const u = new SpeechSynthesisUtterance(list[i])
      i += 1
      u.lang = LANG
      u.rate = RATE
      u.onend = () => speakNext()
      u.onerror = () => speakNext()
      synth.speak(u)
    }
    speakNext()
  }, [])

  useEffect(() => {
    return () => {
      cancelSpeech()
    }
  }, [])

  return { speak, speakSequence }
}
