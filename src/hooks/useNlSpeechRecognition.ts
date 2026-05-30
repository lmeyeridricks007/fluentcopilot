'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getSpeechRecognitionCtor } from '@/lib/speech/getSpeechRecognitionCtor'

export function useNlSpeechRecognition() {
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const confidencesRef = useRef<number[]>([])
  const recRef = useRef<SpeechRecognition | null>(null)

  useEffect(() => {
    setSupported(!!getSpeechRecognitionCtor())
  }, [])

  useEffect(() => {
    return () => {
      try {
        recRef.current?.stop()
      } catch {
        /* noop */
      }
    }
  }, [])

  const stop = useCallback(() => {
    try {
      recRef.current?.stop()
    } catch {
      /* noop */
    }
    recRef.current = null
    setListening(false)
    setInterim('')
  }, [])

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) return
    confidencesRef.current = []
    setInterim('')
    setError(null)
    const rec = new Ctor()
    recRef.current = rec
    rec.lang = 'nl-NL'
    rec.continuous = true
    rec.interimResults = true

    rec.onresult = (event: SpeechRecognitionEvent) => {
      let interimPiece = ''
      let finalPiece = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const res = event.results[i]
        const piece = res[0]?.transcript ?? ''
        const c = res[0] && 'confidence' in res[0] ? (res[0] as { confidence?: number }).confidence : undefined
        if (typeof c === 'number' && !Number.isNaN(c)) confidencesRef.current.push(c)
        if (res.isFinal) finalPiece += piece
        else interimPiece += piece
      }
      if (finalPiece) {
        const add = finalPiece.trim()
        setTranscript((prev) => (prev ? `${prev} ${add}` : add))
      }
      setInterim(interimPiece.trim())
    }

    rec.onerror = () => {
      setError('Spraakherkenning onderbroken. Probeer opnieuw of schakel over naar typen.')
      stop()
    }

    rec.onend = () => {
      setListening(false)
      setInterim('')
      recRef.current = null
    }

    try {
      rec.start()
      setListening(true)
    } catch {
      setError('Microfoon start niet. Controleer toestemming of gebruik typen.')
    }
  }, [stop])

  const avgConfidence = useCallback((): number | undefined => {
    const arr = confidencesRef.current
    if (arr.length === 0) return undefined
    return arr.reduce((a, b) => a + b, 0) / arr.length
  }, [])

  const reset = useCallback(() => {
    stop()
    setTranscript('')
    setError(null)
    confidencesRef.current = []
  }, [stop])

  return {
    supported,
    listening,
    interim,
    transcript,
    setTranscript,
    error,
    start,
    stop,
    reset,
    avgConfidence,
  }
}
