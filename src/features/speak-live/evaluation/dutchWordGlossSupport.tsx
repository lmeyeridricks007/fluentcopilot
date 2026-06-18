'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BookmarkPlus, Check, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { addSavedDrill } from '@/features/read-aloud/readAloudStorage'
import { getApiBaseUrl } from '@/lib/api/apiConfig'
import { conversationClient } from '@/lib/api/conversationClient'
import { playAppSound } from '@/lib/interaction/appSounds'
import { usePersonalLibraryStore } from '@/store/personalLibraryStore'
import type { WrongWordDetection } from './reportTypes'

function normalizeLibraryKey(text: string): string {
  return text.trim().toLowerCase()
}

export type WordCorrection = {
  wrong: string
  correction: string
  explanation: string
}

/** Strip leading/trailing quotes and punctuation for token matching (Dutch + Latin). */
export function tokenKeyForMatch(tok: string): string {
  return tok
    .replace(/^['"„‚«»(]+/u, '')
    .replace(/['"»).,?!;:…]+$/u, '')
    .toLowerCase()
}

/** Small station-travel glosses for tokens not covered by model explanations. */
const DUTCH_STATION_WORD_GLOSS: Record<string, string> = {
  trein: 'Train.',
  station: 'Station (the building / stop).',
  perron: 'Platform (where a train leaves from).',
  spoor: 'Track (often used like “platform/track” on departure boards).',
  vertrek: 'Departure / “leaves”.',
  vertrekt: 'Leaves (departs).',
  aankomst: 'Arrival.',
  aankomt: 'Arrives.',
  'op tijd': 'On time.',
  vertraging: 'Delay.',
  overstap: 'Transfer (changing trains).',
  kaartje: 'Ticket (informal).',
  ticket: 'Ticket.',
  conducteur: 'Conductor / train staff on board.',
  naar: 'To / toward (direction).',
  vanaf: 'From / departing from.',
  van: 'From / of.',
  welk: 'Which.',
  waar: 'Where.',
  wanneer: 'When.',
  hoe: 'How (also starts many “how …” questions).',
  laat: 'Late; in *hoe laat* it is part of “what time”.',
  'hoe laat': 'What time (literally “how late”, idiomatic for clock time).',
  goedemiddag: 'Good afternoon.',
  goedemorgen: 'Good morning.',
  goedenavond: 'Good evening.',
  alstublieft: 'Please / here you go (formal).',
  'dank je': 'Thank you (informal).',
  'dank u': 'Thank you (formal).',
  bedankt: 'Thanks / thank you.',
  graag: 'Please / gladly (often “graag gedaan” = you’re welcome).',
  ns: 'Dutch Railways (Nederlandse Spoorwegen).',
  reis: 'Trip / journey.',
  reizen: 'To travel.',
  overstappen: 'To transfer (change trains).',
}

export function englishGlossForDutchWord(token: string): string | null {
  const core = tokenKeyForMatch(token)
  if (!core) return null
  if (core === 'welke') return 'which'
  const g = DUTCH_STATION_WORD_GLOSS[core]
  return g ? g.replace(/\.$/, '').trim() : null
}

export function resolveDutchWordGloss(
  rawToken: string,
  opts: {
    phraseContext: string
    corrections: WordCorrection[]
    detections?: WrongWordDetection[]
  },
): string {
  const core = tokenKeyForMatch(rawToken)
  if (!core) return 'Pick a Dutch word from the recommended line to see a short English gloss.'

  const det = opts.detections?.find((d) => tokenKeyForMatch(d.suggestedCorrection) === core)
  if (det?.whyItMatters?.trim()) return det.whyItMatters.trim()

  const corr = opts.corrections.find((c) => tokenKeyForMatch(c.correction) === core)
  if (corr?.explanation?.trim()) {
    const ex = corr.explanation.trim()
    if (/[a-z]{4,}/i.test(ex) && (ex.length > 28 || /(\bthe\b|\band\b|\bfor\b|\bthis\b|\byour\b)/i.test(ex))) {
      return ex
    }
    return `Why this word fits here: ${ex}`
  }

  const gloss = DUTCH_STATION_WORD_GLOSS[core]
  if (gloss) return gloss

  return 'Tap a word to see a short Dutch and English explanation for this sentence.'
}

export type WordGlossPair = { glossEn: string; glossNl: string | null }

/** Immediate gloss (dictionary + coaching text) — never empty for a valid token. */
export function getInstantWordGlossPair(
  rawToken: string,
  opts: {
    phraseContext: string
    corrections: WordCorrection[]
    detections?: WrongWordDetection[]
  },
): WordGlossPair {
  const core = tokenKeyForMatch(rawToken)
  if (!core) {
    return { glossEn: 'Select a word to see Dutch and English meanings.', glossNl: null }
  }
  const glossEn =
    englishGlossForDutchWord(rawToken) ??
    resolveDutchWordGloss(rawToken, {
      phraseContext: opts.phraseContext,
      corrections: opts.corrections,
      detections: opts.detections,
    })
  return { glossEn: glossEn.trim() || 'Meaning will load shortly.', glossNl: null }
}

function canFetchWordGlossFromApi(): boolean {
  return Boolean(getApiBaseUrl())
}

/** Build prefetch jobs for one or more Dutch phrases (exam sample answers, coach lines, etc.). */
export function buildGlossPrefetchSourcesFromPhrases(
  phrases: string[],
  corrections: WordCorrection[] = [],
  detections?: WrongWordDetection[],
): DutchWordGlossPrefetchSource[] {
  const out: DutchWordGlossPrefetchSource[] = []
  const seen = new Set<string>()
  for (const phrase of phrases) {
    const t = phrase.trim()
    if (!t || seen.has(t)) continue
    seen.add(t)
    out.push({ phrase: t, corrections, detections })
  }
  return out
}

const SPEAK_LIVE_WORD_GLOSS_STORAGE_KEY = 'fc.speak-live.word-glosses.v1'
const SPEAK_LIVE_WORD_GLOSS_STORAGE_LIMIT = 480
const SPEAK_LIVE_WORD_GLOSS_PREFETCH_CONCURRENCY = 4

type StoredWordGlossEntry = {
  /** English gloss (legacy field name). */
  gloss: string
  glossNl?: string
  updatedAt: string
}

export type DutchWordGlossPrefetchSource = {
  phrase: string
  corrections: WordCorrection[]
  detections?: WrongWordDetection[]
}

let storedWordGlossCache: Record<string, StoredWordGlossEntry> | null = null
const pendingWordGlossRequests = new Map<string, Promise<WordGlossPair>>()

export function buildWordGlossCacheKey(core: string, phraseContext: string): string {
  return `${core}::${phraseContext.trim().slice(0, 160)}`
}

function readStoredWordGlossMap(): Record<string, StoredWordGlossEntry> {
  if (storedWordGlossCache) return storedWordGlossCache
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(SPEAK_LIVE_WORD_GLOSS_STORAGE_KEY)
    if (!raw) {
      storedWordGlossCache = {}
      return storedWordGlossCache
    }
    const parsed = JSON.parse(raw) as unknown
    storedWordGlossCache =
      parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, StoredWordGlossEntry>)
        : {}
    return storedWordGlossCache
  } catch {
    storedWordGlossCache = {}
    return storedWordGlossCache
  }
}

function persistStoredWordGlossMap(next: Record<string, StoredWordGlossEntry>) {
  storedWordGlossCache = next
  if (typeof window === 'undefined') return
  try {
    const entries = Object.entries(next)
      .sort((a, b) => Date.parse(b[1]?.updatedAt ?? '') - Date.parse(a[1]?.updatedAt ?? ''))
      .slice(0, SPEAK_LIVE_WORD_GLOSS_STORAGE_LIMIT)
    const trimmed = Object.fromEntries(entries)
    storedWordGlossCache = trimmed
    window.localStorage.setItem(SPEAK_LIVE_WORD_GLOSS_STORAGE_KEY, JSON.stringify(trimmed))
  } catch {
    // Ignore storage write failures; the in-memory cache still helps for this page load.
  }
}

function setStoredWordGloss(cacheKey: string, glossEn: string, glossNl?: string) {
  const cleanedEn = glossEn.trim()
  if (!cleanedEn) return
  const cleanedNl = glossNl?.trim()
  const next = {
    ...readStoredWordGlossMap(),
    [cacheKey]: {
      gloss: cleanedEn,
      ...(cleanedNl ? { glossNl: cleanedNl } : {}),
      updatedAt: new Date().toISOString(),
    },
  }
  persistStoredWordGlossMap(next)
}

function getStoredWordGlossPair(cacheKey: string): { glossEn: string; glossNl: string | null } | null {
  const record = readStoredWordGlossMap()[cacheKey]
  const glossEn = typeof record?.gloss === 'string' ? record.gloss.trim() : ''
  if (!glossEn) return null
  const glossNl = typeof record?.glossNl === 'string' ? record.glossNl.trim() : ''
  return { glossEn, glossNl: glossNl || null }
}

function extractGlossLookupTokens(phrase: string): string[] {
  return Array.from(
    new Set(
      phrase
        .split(/\s+/)
        .map((part) => tokenKeyForMatch(part))
        .filter(Boolean),
    ),
  )
}

function requestWordGlossLlm({
  word,
  phraseContext,
  cacheKey,
  localFallback,
}: {
  word: string
  phraseContext: string
  cacheKey: string
  localFallback: string
}): Promise<WordGlossPair> {
  const stored = getStoredWordGlossPair(cacheKey)
  if (stored) return Promise.resolve(stored)

  const pending = pendingWordGlossRequests.get(cacheKey)
  if (pending) return pending

  const promise = conversationClient
    .speakLiveWordGloss({
      word,
      phraseContext: phraseContext.trim() || undefined,
    })
    .then((res) => {
      const glossEn = (res.glossEn ?? res.gloss ?? '').trim() || localFallback.trim()
      const glossNl = (res.glossNl ?? '').trim() || null
      if (glossEn) setStoredWordGloss(cacheKey, glossEn, glossNl ?? undefined)
      return { glossEn, glossNl }
    })
    .catch(() => {
      const instant = getInstantWordGlossPair(word, {
        phraseContext,
        corrections: [],
      })
      const en = localFallback.trim() || instant.glossEn
      return { glossEn: en, glossNl: instant.glossNl }
    })
    .finally(() => {
      pendingWordGlossRequests.delete(cacheKey)
    })

  pendingWordGlossRequests.set(cacheKey, promise)
  return promise
}

export async function prefetchDutchWordGlosses(sources: DutchWordGlossPrefetchSource[]): Promise<void> {
  if (typeof window === 'undefined' || sources.length === 0) return

  const queue = new Map<string, { word: string; phraseContext: string; localFallback: string }>()

  for (const source of sources) {
    const phrase = source.phrase.trim()
    if (!phrase) continue
    const rawTokens = phrase.split(/\s+/).filter(Boolean)
    const lookupKeys = new Set(extractGlossLookupTokens(phrase))
    for (const rawToken of rawTokens) {
      const core = tokenKeyForMatch(rawToken)
      if (!core || !lookupKeys.has(core)) continue
      const cacheKey = buildWordGlossCacheKey(core, phrase)
      if (getStoredWordGlossPair(cacheKey)?.glossEn) continue
      const instant = getInstantWordGlossPair(rawToken, {
        phraseContext: phrase,
        corrections: source.corrections,
        detections: source.detections,
      })
      if (!canFetchWordGlossFromApi()) {
        setStoredWordGloss(cacheKey, instant.glossEn, instant.glossNl ?? undefined)
        continue
      }
      if (!queue.has(cacheKey)) {
        queue.set(cacheKey, {
          word: core,
          phraseContext: phrase,
          localFallback: instant.glossEn,
        })
      }
    }
  }

  if (queue.size === 0) return

  const items = [...queue.values()]
  let index = 0
  const workerCount = Math.min(SPEAK_LIVE_WORD_GLOSS_PREFETCH_CONCURRENCY, items.length)
  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (index < items.length) {
        const current = items[index++]
        await requestWordGlossLlm({
          word: current.word,
          phraseContext: current.phraseContext,
          cacheKey: buildWordGlossCacheKey(current.word, current.phraseContext),
          localFallback: current.localFallback,
        })
      }
    }),
  )
}

export type ServerWordGlossMap = Record<string, { glossEn: string; glossNl: string }>

export function DutchWordGlossPicker({
  phrase,
  corrections,
  detections,
  label = 'Tap a Dutch word',
  onPickedWordChange,
  /** Pre-generated at report time (exam). When set, no client prefetch or per-tap LLM. */
  serverGlosses,
  /** Show save-to-library actions when a word is selected. */
  enablePracticeSave = false,
  practiceSaveLabel = 'Saved from practice',
  onPlayPickedWord,
}: {
  phrase: string
  corrections: WordCorrection[]
  detections?: WrongWordDetection[]
  label?: string
  /** Fires when the learner picks or clears a word (for save flows). */
  onPickedWordChange?: (rawToken: string | null) => void
  serverGlosses?: ServerWordGlossMap
  enablePracticeSave?: boolean
  practiceSaveLabel?: string
  onPlayPickedWord?: (word: string) => void | Promise<void>
}) {
  const [pickedRaw, setPickedRaw] = useState<string | null>(null)
  const [displayGlossEn, setDisplayGlossEn] = useState<string | null>(null)
  const [displayGlossNl, setDisplayGlossNl] = useState<string | null>(null)
  const [glossLoading, setGlossLoading] = useState(false)
  const [savedToast, setSavedToast] = useState<string | null>(null)
  const [wordAudioLoading, setWordAudioLoading] = useState(false)
  const glossCacheRef = useRef<Map<string, WordGlossPair>>(new Map())

  const libraryWords = usePersonalLibraryStore((s) => s.words)
  const libraryPhrases = usePersonalLibraryStore((s) => s.phrases)
  const savedWordKeys = useMemo(
    () => new Set(libraryWords.map((w) => normalizeLibraryKey(w.nl))),
    [libraryWords],
  )
  const savedPhraseKeys = useMemo(
    () => new Set(libraryPhrases.map((p) => normalizeLibraryKey(p.nl))),
    [libraryPhrases],
  )

  const pickedKey = pickedRaw ? tokenKeyForMatch(pickedRaw) : null
  const glossOpts = { phraseContext: phrase, corrections, detections }

  const showSavedMessage = useCallback((message: string) => {
    setSavedToast(message)
    window.setTimeout(() => {
      setSavedToast((cur) => (cur === message ? null : cur))
    }, 2400)
  }, [])

  const saveWordForLater = useCallback(() => {
    if (!pickedKey) return
    const cleaned = pickedKey
    if (savedWordKeys.has(normalizeLibraryKey(cleaned))) {
      showSavedMessage(`“${cleaned}” is already in your library.`)
      return
    }
    const meaning = displayGlossEn?.trim() || displayGlossNl?.trim() || undefined
    playAppSound('library_save')
    usePersonalLibraryStore.getState().addWord(cleaned, meaning)
    addSavedDrill({
      kind: 'word',
      title: `${practiceSaveLabel} — ${cleaned}`,
      content: meaning ? `${cleaned} — ${meaning}` : cleaned,
    })
    showSavedMessage(`Saved “${cleaned}” for later practice.`)
  }, [pickedKey, savedWordKeys, displayGlossEn, displayGlossNl, practiceSaveLabel, showSavedMessage])

  const savePhraseForLater = useCallback(() => {
    const cleaned = phrase.trim()
    if (!cleaned) return
    if (savedPhraseKeys.has(normalizeLibraryKey(cleaned))) {
      showSavedMessage('This phrase is already in your library.')
      return
    }
    playAppSound('library_save')
    usePersonalLibraryStore.getState().addPhrase(cleaned)
    addSavedDrill({
      kind: 'sentence',
      title: practiceSaveLabel,
      content: cleaned,
    })
    showSavedMessage('Saved phrase for later practice.')
  }, [phrase, savedPhraseKeys, practiceSaveLabel, showSavedMessage])

  const playPickedWord = useCallback(() => {
    if (!pickedKey || !onPlayPickedWord) return
    setWordAudioLoading(true)
    void Promise.resolve(onPlayPickedWord(pickedKey)).finally(() => setWordAudioLoading(false))
  }, [onPlayPickedWord, pickedKey])

  useEffect(() => {
    onPickedWordChange?.(pickedRaw)
  }, [pickedRaw, onPickedWordChange])

  useEffect(() => {
    if (serverGlosses) return
    const t = phrase.trim()
    if (!t) return
    void prefetchDutchWordGlosses([{ phrase: t, corrections, detections }])
  }, [phrase, corrections, detections, serverGlosses])

  useEffect(() => {
    if (!pickedRaw) {
      setDisplayGlossEn(null)
      setDisplayGlossNl(null)
      setGlossLoading(false)
      return
    }
    const core = tokenKeyForMatch(pickedRaw)
    if (!core) {
      setDisplayGlossEn(null)
      setDisplayGlossNl(null)
      setGlossLoading(false)
      return
    }

    const cacheKey = buildWordGlossCacheKey(core, phrase)

    if (serverGlosses) {
      const row = serverGlosses[cacheKey]
      if (row?.glossEn?.trim()) {
        setDisplayGlossEn(row.glossEn.trim())
        setDisplayGlossNl(row.glossNl?.trim() ?? null)
        setGlossLoading(false)
        return
      }
      if (canFetchWordGlossFromApi()) {
        let cancelled = false
        setGlossLoading(true)
        void (async () => {
          try {
            const g = await requestWordGlossLlm({
              word: core,
              phraseContext: phrase,
              cacheKey,
              localFallback: '',
            })
            if (!cancelled && g.glossEn.trim()) {
              setDisplayGlossEn(g.glossEn.trim())
              setDisplayGlossNl(g.glossNl?.trim() ?? null)
            }
          } finally {
            if (!cancelled) setGlossLoading(false)
          }
        })()
        return () => {
          cancelled = true
        }
      }
      setDisplayGlossEn(null)
      setDisplayGlossNl(null)
      setGlossLoading(false)
      return
    }

    const instant = getInstantWordGlossPair(pickedRaw, glossOpts)

    const applyPair = (pair: WordGlossPair) => {
      const en = pair.glossEn.trim() || instant.glossEn
      const nl = pair.glossNl?.trim() || instant.glossNl
      setDisplayGlossEn(en)
      setDisplayGlossNl(nl)
    }

    applyPair(instant)

    const readCached = (): WordGlossPair | null => {
      const mem = glossCacheRef.current.get(cacheKey)
      if (mem?.glossEn.trim()) return mem
      const stored = getStoredWordGlossPair(cacheKey)
      if (stored?.glossEn.trim()) {
        glossCacheRef.current.set(cacheKey, stored)
        return stored
      }
      return null
    }

    const cached = readCached()
    if (cached) {
      applyPair(cached)
      setGlossLoading(false)
      return
    }

    if (!canFetchWordGlossFromApi()) {
      glossCacheRef.current.set(cacheKey, instant)
      setStoredWordGloss(cacheKey, instant.glossEn, instant.glossNl ?? undefined)
      setGlossLoading(false)
      return
    }

    let cancelled = false
    setGlossLoading(true)
    void (async () => {
      try {
        const g = await requestWordGlossLlm({
          word: core,
          phraseContext: phrase,
          cacheKey,
          localFallback: instant.glossEn,
        })
        if (!cancelled) {
          const merged: WordGlossPair = {
            glossEn: g.glossEn.trim() || instant.glossEn,
            glossNl: g.glossNl?.trim() || instant.glossNl,
          }
          glossCacheRef.current.set(cacheKey, merged)
          applyPair(merged)
        }
      } catch {
        if (!cancelled) {
          glossCacheRef.current.set(cacheKey, instant)
          setStoredWordGloss(cacheKey, instant.glossEn, instant.glossNl ?? undefined)
          applyPair(instant)
        }
      } finally {
        if (!cancelled) setGlossLoading(false)
      }
    })()

    const retry = window.setTimeout(() => {
      if (cancelled) return
      const later = readCached()
      if (later) {
        applyPair(later)
        setGlossLoading(false)
      }
    }, 400)

    return () => {
      cancelled = true
      window.clearTimeout(retry)
    }
  }, [pickedRaw, phrase, corrections, detections, serverGlosses])

  if (!phrase.trim()) return null

  return (
    <div className="mt-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">{label}</p>
      <p className="text-[13px] leading-relaxed text-ink-primary">
        {phrase.split(/(\s+)/).map((part, idx) => {
          if (/^\s+$/.test(part)) return <span key={idx}>{part}</span>
          const key = tokenKeyForMatch(part)
          if (!key) return <span key={idx}>{part}</span>
          const active = pickedKey === key
          return (
            <button
              key={idx}
              type="button"
              onClick={() => setPickedRaw(active ? null : part)}
              className={`inline rounded px-0.5 align-baseline transition-colors ${active ? 'bg-violet-200 text-violet-950 ring-1 ring-violet-400' : 'hover:bg-violet-100/80'}`}
            >
              {part}
            </button>
          )
        })}
      </p>
      {pickedKey ? (
        <div className="mt-3 rounded-xl border border-violet-200/80 bg-violet-50/40 px-3 py-3 space-y-3 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <span className="text-ink-primary normal-case">“{pickedRaw}”</span>
            </p>
            {glossLoading ? <span className="text-[10px] font-semibold text-violet-700">Refining…</span> : null}
          </div>
          {glossLoading ? (
            <p className="text-[12px] text-violet-800/90 leading-relaxed">Refining with AI…</p>
          ) : null}
          {displayGlossNl?.trim() ? (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800/90">In Dutch</p>
              <p className="text-[13px] text-ink-primary leading-relaxed mt-0.5">{displayGlossNl.trim()}</p>
            </div>
          ) : null}
          {displayGlossEn?.trim() ? (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">In English</p>
              <p className="text-[13px] text-ink-primary leading-relaxed mt-0.5">{displayGlossEn.trim()}</p>
            </div>
          ) : !glossLoading ? (
            <p className="text-[12px] text-ink-secondary leading-relaxed">
              {serverGlosses
                ? 'No gloss was generated for this word. Use “Recalculate report with latest scoring” on the report (backend must be running).'
                : 'Meaning could not be loaded. Check that the API is running and refresh the page.'}
            </p>
          ) : null}
          {(enablePracticeSave || onPlayPickedWord) ? (
            <div className="flex flex-wrap gap-2 pt-1 border-t border-violet-200/60">
              {onPlayPickedWord ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="gap-1.5 text-caption"
                  disabled={!pickedKey || wordAudioLoading}
                  onClick={playPickedWord}
                >
                  <Volume2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {wordAudioLoading ? 'Loading audio…' : 'Hear Dutch'}
                </Button>
              ) : null}
              {enablePracticeSave ? (
                <>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="gap-1.5 text-caption"
                disabled={!pickedKey || savedWordKeys.has(normalizeLibraryKey(pickedKey))}
                onClick={saveWordForLater}
              >
                {pickedKey && savedWordKeys.has(normalizeLibraryKey(pickedKey)) ? (
                  <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
                ) : (
                  <BookmarkPlus className="h-3.5 w-3.5 shrink-0" aria-hidden />
                )}
                {pickedKey && savedWordKeys.has(normalizeLibraryKey(pickedKey)) ? 'Word saved' : 'Save word'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1.5 text-caption"
                disabled={!phrase.trim() || savedPhraseKeys.has(normalizeLibraryKey(phrase.trim()))}
                onClick={savePhraseForLater}
              >
                {phrase.trim() && savedPhraseKeys.has(normalizeLibraryKey(phrase.trim())) ? (
                  <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
                ) : (
                  <BookmarkPlus className="h-3.5 w-3.5 shrink-0" aria-hidden />
                )}
                {phrase.trim() && savedPhraseKeys.has(normalizeLibraryKey(phrase.trim()))
                  ? 'Phrase saved'
                  : 'Save whole phrase'}
              </Button>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-[10px] text-slate-500 mt-1.5">Select a word to see Dutch and English meanings.</p>
      )}
      {savedToast ? (
        <p className="mt-2 text-[11px] font-semibold text-emerald-800 leading-snug" role="status">
          {savedToast}
        </p>
      ) : null}
    </div>
  )
}
