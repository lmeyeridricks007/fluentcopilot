'use client'

let voicesReady = false

function pickDutchVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null
  const list = window.speechSynthesis.getVoices()
  const nl =
    list.find((v) => v.lang.toLowerCase().startsWith('nl-nl')) ||
    list.find((v) => v.lang.toLowerCase().startsWith('nl')) ||
    list.find((v) => v.lang.toLowerCase().includes('dutch')) ||
    null
  return nl ?? null
}

function ensureVoices(): Promise<void> {
  if (typeof window === 'undefined' || !window.speechSynthesis) return Promise.resolve()
  if (voicesReady && window.speechSynthesis.getVoices().length > 0) return Promise.resolve()
  return new Promise((resolve) => {
    const done = () => {
      voicesReady = true
      window.speechSynthesis.onvoiceschanged = null
      resolve()
    }
    window.speechSynthesis.onvoiceschanged = done
    window.setTimeout(done, 400)
  })
}

export function isBrowserSpeechSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.speechSynthesis !== 'undefined'
}

export function speakWithBrowserTts(
  text: string,
  handlers: { onend: () => void; onerror: () => void },
  opts?: { rate?: number }
): SpeechSynthesisUtterance | null {
  if (!isBrowserSpeechSupported()) {
    handlers.onerror()
    return null
  }
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  const v = pickDutchVoice()
  if (v) {
    u.voice = v
    u.lang = v.lang || 'nl-NL'
  } else {
    u.lang = 'nl-NL'
  }
  const r = opts?.rate
  u.rate = typeof r === 'number' && r > 0.2 && r < 2 ? r : 0.95
  u.onend = handlers.onend
  u.onerror = handlers.onerror
  window.speechSynthesis.speak(u)
  return u
}

export function pauseBrowserSpeech(): void {
  if (isBrowserSpeechSupported() && window.speechSynthesis.speaking) {
    try {
      window.speechSynthesis.pause()
    } catch {
      /* some engines throw if not pausable */
    }
  }
}

export function resumeBrowserSpeech(): void {
  if (isBrowserSpeechSupported()) {
    try {
      window.speechSynthesis.resume()
    } catch {
      /* ignore */
    }
  }
}

export function stopBrowserSpeech(): void {
  if (isBrowserSpeechSupported()) {
    window.speechSynthesis.cancel()
  }
}

export { ensureVoices }
