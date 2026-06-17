'use client'

import { useSyncExternalStore } from 'react'
import { getAudioPlaybackMode, shouldAttemptOpenAiTts } from '@/lib/api/apiConfig'
import { requestGenerateSpeech } from '@/lib/audio/audioClient'
import { stripMarkdownForTts } from '@/lib/speech/stripMarkdownForTts'
import {
  ensureVoices,
  isBrowserSpeechSupported,
  pauseBrowserSpeech,
  resumeBrowserSpeech,
  speakWithBrowserTts,
  stopBrowserSpeech,
} from '@/lib/audio/browserSpeechPlayback'
import { createHtmlAudio, unlockHtmlAudioPlayback } from '@/lib/audio/htmlAudioPlayback'
import type { AudioPlaybackSource, ChatAudioUiState } from '@/lib/audio/audioTypes'

/** Must match Speak Live `/audio/tts` branch — Azure neural assistant or OpenAI at Speak Live speed. */
const ASSISTANT_LINE_TTS_PURPOSE = 'speak_live_assistant' as const

/** Bumps in-memory cache when server TTS contract changes (avoid stale generic `assistant_message` clips). */
const SERVER_TTS_CACHE_TAG = 'v2_speak_live_assistant'

const CACHE_MAX = 24
const cacheOrder: string[] = []
const dataUrlByMessageId = new Map<string, string>()
const preloadInflight = new Map<string, Promise<string | null>>()

function serverTtsCacheKey(messageId: string) {
  return `${messageId}\x1e${SERVER_TTS_CACHE_TAG}`
}

export type ChatAudioSnapshot = {
  activeMessageId: string | null
  uiState: ChatAudioUiState
  lastSource: AudioPlaybackSource | null
}

let activeMessageId: string | null = null
let uiState: ChatAudioUiState = 'idle'
let lastSource: AudioPlaybackSource | null = null

/** Stable snapshot for `useSyncExternalStore` — new object only when fields change. */
let snapshotCache: ChatAudioSnapshot = {
  activeMessageId: null,
  uiState: 'idle',
  lastSource: null,
}

let audioEl: HTMLAudioElement | null = null
let objectUrlToRevoke: string | null = null
let playAbort: AbortController | null = null

const listeners = new Set<() => void>()

function notify() {
  for (const l of listeners) l()
}

/** When `source` is omitted, `lastSource` is left unchanged (e.g. mid-transition). Pass `null` to clear. */
function publish(id: string | null, state: ChatAudioUiState, source?: AudioPlaybackSource | null) {
  activeMessageId = id
  uiState = state
  if (arguments.length >= 3) {
    lastSource = source ?? null
  }
  notify()
}

function cleanupMedia() {
  if (audioEl) {
    const el = audioEl
    audioEl = null
    el.onended = null
    el.onerror = null
    el.onplay = null
    el.onpause = null
    el.pause()
    el.removeAttribute('src')
    el.load()
  }
  if (objectUrlToRevoke) {
    try {
      URL.revokeObjectURL(objectUrlToRevoke)
    } catch {
      /* ignore */
    }
    objectUrlToRevoke = null
  }
}

function touchCache(messageId: string) {
  const i = cacheOrder.indexOf(messageId)
  if (i >= 0) cacheOrder.splice(i, 1)
  cacheOrder.push(messageId)
  while (cacheOrder.length > CACHE_MAX) {
    const evict = cacheOrder.shift()
    if (evict) dataUrlByMessageId.delete(evict)
  }
}

function rememberDataUrl(messageId: string, url: string) {
  dataUrlByMessageId.set(messageId, url)
  touchCache(messageId)
}

/** @deprecated Use `shouldAttemptOpenAiTts` from `@/lib/api/apiConfig`. */
export const shouldAttemptServerTts = shouldAttemptOpenAiTts

function allowBrowserTtsFallback(): boolean {
  return getAudioPlaybackMode() !== 'openai'
}

function getSnapshot(): ChatAudioSnapshot {
  if (
    snapshotCache.activeMessageId !== activeMessageId ||
    snapshotCache.uiState !== uiState ||
    snapshotCache.lastSource !== lastSource
  ) {
    snapshotCache = { activeMessageId, uiState, lastSource }
  }
  return snapshotCache
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useChatAudioPlaybackSnapshot(): ChatAudioSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function getAssistantMessageAudioState(messageId: string): ChatAudioUiState {
  if (messageId !== activeMessageId) return 'idle'
  return uiState
}

async function resolvePlayableUrl(
  messageId: string,
  text: string,
  audioUrl: string | undefined,
  signal: AbortSignal,
  threadId?: string
): Promise<{ url: string; source: AudioPlaybackSource } | null> {
  if (audioUrl?.trim()) {
    return { url: audioUrl.trim(), source: 'inline' }
  }
  const ttsText = stripMarkdownForTts(text)
  const cacheKey = serverTtsCacheKey(messageId)
  const cached = dataUrlByMessageId.get(cacheKey)
  if (cached) return { url: cached, source: 'server' }

  if (!shouldAttemptOpenAiTts()) return null

  try {
    const res = await requestGenerateSpeech(
      {
        text: ttsText,
        language: 'nl-NL',
        messageId,
        threadId,
        purpose: ASSISTANT_LINE_TTS_PURPOSE,
      },
      { signal }
    )
    rememberDataUrl(cacheKey, res.audioUrl)
    return { url: res.audioUrl, source: 'server' }
  } catch {
    return null
  }
}

function playMediaUrl(messageId: string, url: string, source: AudioPlaybackSource, playbackRate = 1) {
  cleanupMedia()
  stopBrowserSpeech()
  const el = createHtmlAudio(url)
  /** Align with Speak Live assistant `<audio>` — slightly softer than 1.0 so neural TTS is less harsh. */
  el.volume = 0.88
  el.playbackRate = playbackRate
  audioEl = el
  lastSource = source
  el.onplay = () => {
    if (activeMessageId === messageId) publish(messageId, 'playing')
  }
  el.onpause = () => {
    if (activeMessageId === messageId && !el.ended) {
      publish(messageId, 'paused')
    }
  }
  el.onended = () => {
    if (activeMessageId === messageId) {
      publish(null, 'idle', null)
      cleanupMedia()
    }
  }
  el.onerror = () => {
    if (activeMessageId === messageId) {
      publish(null, 'idle', null)
      cleanupMedia()
    }
  }
  void unlockHtmlAudioPlayback().finally(() => {
    void el.play().catch(() => {
      if (activeMessageId === messageId) {
        publish(null, 'idle', null)
        cleanupMedia()
      }
    })
  })
}

function playBrowserTts(messageId: string, text: string, slow?: boolean) {
  cleanupMedia()
  stopBrowserSpeech()
  void ensureVoices()
  lastSource = 'browser'
  speakWithBrowserTts(
    stripMarkdownForTts(text),
    {
      onend: () => {
        if (activeMessageId === messageId) publish(null, 'idle', null)
      },
      onerror: () => {
        if (activeMessageId === messageId) publish(null, 'idle', null)
      },
    },
    { rate: slow ? 0.78 : 0.95 }
  )
  publish(messageId, 'playing', 'browser')
}

export const chatAudioManager = {
  getSnapshot,

  stop() {
    playAbort?.abort()
    playAbort = null
    cleanupMedia()
    stopBrowserSpeech()
    publish(null, 'idle', null)
  },

  pause() {
    const id = activeMessageId
    if (!id) return
    if (audioEl) {
      audioEl.pause()
      publish(id, 'paused')
      return
    }
    if (isBrowserSpeechSupported() && window.speechSynthesis.speaking) {
      pauseBrowserSpeech()
      publish(id, 'paused')
    }
  },

  resume() {
    const id = activeMessageId
    if (!id) return
    if (audioEl) {
      void audioEl.play().catch(() => {})
      publish(id, 'playing')
      return
    }
    resumeBrowserSpeech()
    publish(id, 'playing')
  },

  /**
   * Toggle / start playback for one assistant message. Only one message may be active.
   * @param opts.slow Slightly slower delivery (HTMLAudio playbackRate or browser utterance rate).
   * @param opts.threadId Optional thread id forwarded to server TTS for logging / future policy.
   */
  async playOrToggle(
    messageId: string,
    text: string,
    audioUrl?: string,
    opts?: { slow?: boolean; threadId?: string }
  ) {
    const trimmed = stripMarkdownForTts(text.trim())
    if (!trimmed) return
    const slow = Boolean(opts?.slow)
    const threadId = opts?.threadId

    if (activeMessageId === messageId) {
      if (uiState === 'loading') {
        this.stop()
        return
      }
      if (uiState === 'playing') {
        this.pause()
        return
      }
      if (uiState === 'paused') {
        this.resume()
        return
      }
    }

    this.stop()
    publish(messageId, 'loading', null)

    playAbort = new AbortController()
    const signal = playAbort.signal

    const resolved = await resolvePlayableUrl(messageId, trimmed, audioUrl, signal, threadId)
    if (signal.aborted || activeMessageId !== messageId) return

    if (resolved) {
      playMediaUrl(messageId, resolved.url, resolved.source, slow ? 0.82 : 1)
      return
    }

    if (!allowBrowserTtsFallback() || !isBrowserSpeechSupported()) {
      publish(null, 'idle', null)
      return
    }

    playBrowserTts(messageId, trimmed, slow)
  },

  /**
   * Warm server TTS (or cache) without blocking UI. No-op when server mode off or text empty.
   */
  preload(messageId: string, text: string, audioUrl?: string | undefined, threadId?: string) {
    const t = stripMarkdownForTts(text.trim())
    if (!t || audioUrl?.trim()) return
    const cacheKey = serverTtsCacheKey(messageId)
    if (dataUrlByMessageId.has(cacheKey)) return
    if (preloadInflight.has(cacheKey)) return
    if (!shouldAttemptOpenAiTts()) return

    const p = (async () => {
      try {
        const res = await requestGenerateSpeech({
          text: t,
          language: 'nl-NL',
          messageId,
          threadId,
          purpose: ASSISTANT_LINE_TTS_PURPOSE,
        })
        rememberDataUrl(cacheKey, res.audioUrl)
        return res.audioUrl
      } catch {
        return null
      } finally {
        preloadInflight.delete(cacheKey)
      }
    })()
    preloadInflight.set(cacheKey, p)
  },

  isBrowserSpeechSupported,
}
