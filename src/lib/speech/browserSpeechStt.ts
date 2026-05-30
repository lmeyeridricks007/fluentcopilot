'use client'

type RecognitionCtor = new () => SpeechRecognition

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor
    webkitSpeechRecognition?: RecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function isBrowserSttSupported(): boolean {
  return getRecognitionCtor() !== null
}

/**
 * Live Dutch dictation using the Web Speech API (network-dependent in Chrome).
 */
export class BrowserSpeechSttSession {
  private recognition: SpeechRecognition | null = null
  private latest = ''
  private onInterim: ((t: string) => void) | null = null

  start(onInterim: (text: string) => void, onError: (message: string) => void): void {
    this.abort()
    const Ctor = getRecognitionCtor()
    if (!Ctor) {
      onError('Speech recognition is not supported in this browser.')
      return
    }
    this.onInterim = onInterim
    this.latest = ''
    const r = new Ctor()
    r.lang = 'nl-NL'
    r.continuous = true
    r.interimResults = true
    r.maxAlternatives = 1

    r.onresult = (ev: SpeechRecognitionEvent) => {
      let line = ''
      for (let i = 0; i < ev.results.length; i++) {
        line += ev.results[i][0]?.transcript ?? ''
      }
      this.latest = line.trim()
      this.onInterim?.(this.latest)
    }

    r.onerror = (ev: SpeechRecognitionErrorEvent) => {
      if (ev.error === 'aborted') return
      if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') {
        onError('Microphone or speech permission was denied.')
        return
      }
      if (ev.error === 'no-speech') {
        return
      }
      onError(ev.message || ev.error || 'Speech recognition error')
    }

    try {
      r.start()
      this.recognition = r
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Could not start speech recognition')
    }
  }

  /** Stop recognition; `onend` provides the latest accumulated transcript. */
  stop(onEnd: (finalText: string) => void): void {
    const r = this.recognition
    if (!r) {
      onEnd('')
      return
    }
    r.onend = () => {
      this.recognition = null
      onEnd(this.latest.trim())
    }
    try {
      r.stop()
    } catch {
      this.recognition = null
      onEnd(this.latest.trim())
    }
  }

  abort(): void {
    const r = this.recognition
    if (!r) return
    r.onend = null
    try {
      r.abort()
    } catch {
      /* ignore */
    }
    this.recognition = null
    this.latest = ''
    this.onInterim = null
  }
}
