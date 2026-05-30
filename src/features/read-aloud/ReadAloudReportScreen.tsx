'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import {
  AlertCircle,
  BarChart3,
  BookmarkPlus,
  ChevronDown,
  Check,
  FileAudio2,
  Headphones,
  Lightbulb,
  ListOrdered,
  Mic,
  Navigation,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import { playAppSound } from '@/lib/interaction/appSounds'
import { clsx } from 'clsx'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { conversationClient } from '@/lib/api/conversationClient'
import {
  APP_READ_ALOUD,
  APP_READ_ALOUD_SESSION,
  APP_SPEAK_LIVE,
} from '@/lib/routing/appRoutes'
import { requestGenerateSpeech } from '@/lib/audio/audioClient'
import { blobToBase64 } from '@/lib/speech/speechClient'
import { usePersonalLibraryStore } from '@/store/personalLibraryStore'
import {
  addSavedDrill,
  loadReadAloudReport,
  READ_ALOUD_PREFILL_GENERATE_KEY,
  saveReadAloudReport,
  saveReadAloudSession,
  type ReadAloudReportPayload,
  type ReadAloudSessionPayload,
} from './readAloudStorage'
import { readAloudEvaluate, readAloudEvaluateErrorMessage } from './readAloudApi'
import { getReadAloudLearnerClip } from './readAloudLearnerAudioIdb'
import { LearningMemoryRibbon, learningMemoryRibbonHasContent } from '@/components/report/LearningMemoryRibbon'
import { ReportQuickCapturePrompt } from '@/components/capture/ReportQuickCapturePrompt'
import { ReadAloudLearnerClipPlayer } from './ReadAloudLearnerClipPlayer'
import { ReadAloudEvaluatingProgress } from './ReadAloudEvaluatingProgress'

function parseLearnerDataUrl(dataUrl: string): { mimeType: string; audioBase64: string } | null {
  const m = dataUrl.match(/^data:(.+);base64,(.*)$/is)
  if (!m?.[1] || m[2] == null) return null
  const mimeType = m[1].trim()
  const audioBase64 = m[2].replace(/\s/g, '')
  if (!mimeType || !audioBase64) return null
  return { mimeType, audioBase64 }
}

function fmtClockSec(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

const LEVEL_ORDER = ['A1', 'A2', 'B1', 'B2'] as const
const READ_ALOUD_WORD_GLOSS_STORAGE_KEY = 'fc.read-aloud.word-glosses.v1'

function normalizeGlossToken(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/^['"“”„‚«»(]+/u, '')
    .replace(/['"“”„‚«»).,?!;:…]+$/u, '')
    .trim()
}

function buildReadAloudGlossKey(word: string, phraseContext: string): string {
  return `${word}::${phraseContext.trim().slice(0, 160)}`
}

function normalizeLibraryKey(text: string): string {
  return text.trim().toLowerCase()
}

function readStoredReadAloudGlosses(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(READ_ALOUD_WORD_GLOSS_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, string>) : {}
  } catch {
    return {}
  }
}

function writeStoredReadAloudGloss(key: string, gloss: string) {
  if (typeof window === 'undefined') return
  try {
    const current = readStoredReadAloudGlosses()
    window.localStorage.setItem(
      READ_ALOUD_WORD_GLOSS_STORAGE_KEY,
      JSON.stringify({
        ...current,
        [key]: gloss.trim(),
      })
    )
  } catch {
    /* ignore storage failures */
  }
}

function splitGlossableText(text: string): Array<{ raw: string; core: string | null; isWhitespace: boolean }> {
  return text.split(/(\s+)/).map((part) => {
    const isWhitespace = /^\s+$/.test(part)
    const core = isWhitespace ? null : normalizeGlossToken(part)
    return { raw: part, core: core || null, isWhitespace }
  })
}

/** 0–100 score → green / yellow / amber / red visuals (read-aloud dimension cards + hero). */
function readAloudScoreBand(supported: boolean, score: number | null): {
  pct: number
  scoreClass: string
  trackClass: string
  fillClass: string
  cardClass: string
} {
  if (!supported || score == null || !Number.isFinite(score)) {
    return {
      pct: 0,
      scoreClass: 'text-slate-400',
      trackClass: 'bg-slate-100',
      fillClass: 'bg-slate-300',
      cardClass: '!border-slate-200/90 !bg-gradient-to-br from-slate-50/90 via-white to-white',
    }
  }
  const s = Math.max(0, Math.min(100, Math.round(score)))
  const pct = s
  if (s >= 78) {
    return {
      pct,
      scoreClass: 'text-emerald-700',
      trackClass: 'bg-emerald-100/90 ring-1 ring-emerald-200/60',
      fillClass: 'bg-gradient-to-r from-emerald-500 via-green-500 to-lime-500',
      cardClass: '!border-emerald-200/90 !bg-gradient-to-br from-emerald-50/70 via-white to-white',
    }
  }
  if (s >= 68) {
    return {
      pct,
      scoreClass: 'text-yellow-800',
      trackClass: 'bg-yellow-100/90 ring-1 ring-yellow-200/70',
      fillClass: 'bg-gradient-to-r from-yellow-400 via-amber-400 to-amber-500',
      cardClass: '!border-yellow-200/90 !bg-gradient-to-br from-yellow-50/65 via-white to-amber-50/35',
    }
  }
  if (s >= 55) {
    return {
      pct,
      scoreClass: 'text-amber-900',
      trackClass: 'bg-amber-100/90 ring-1 ring-amber-200/70',
      fillClass: 'bg-gradient-to-r from-amber-500 via-orange-500 to-orange-600',
      cardClass: '!border-amber-200/90 !bg-gradient-to-br from-amber-50/65 via-white to-orange-50/35',
    }
  }
  return {
    pct,
    scoreClass: 'text-red-700',
    trackClass: 'bg-red-100/90 ring-1 ring-red-200/70',
    fillClass: 'bg-gradient-to-r from-red-500 via-rose-600 to-red-600',
    cardClass: '!border-red-200/90 !bg-gradient-to-br from-red-50/55 via-white to-rose-50/35',
  }
}

function trimFeedbackExample(text: string): string {
  return text.replace(/\s+/g, ' ').replace(/[.!\s]+$/g, '').trim()
}

function uniquePhrases(values: Array<string | null | undefined>, limit = 3): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of values) {
    const cleaned = trimFeedbackExample(value ?? '')
    if (!cleaned) continue
    const key = cleaned.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(cleaned)
    if (out.length >= limit) break
  }
  return out
}

function quotedList(values: string[]): string {
  if (!values.length) return ''
  if (values.length === 1) return `“${values[0]}”`
  if (values.length === 2) return `“${values[0]}” and “${values[1]}”`
  return `${values.slice(0, -1).map((value) => `“${value}”`).join(', ')}, and “${values[values.length - 1]}”`
}

function joinPlainList(values: string[]): string {
  if (!values.length) return ''
  if (values.length === 1) return values[0]!
  if (values.length === 2) return `${values[0]} and ${values[1]}`
  return `${values.slice(0, -1).join(', ')}, and ${values[values.length - 1]}`
}

function friendlyDimensionCopy(
  row: {
    key: string
    title: string
    supported: boolean
    score: number | null
    label: string
    detail: string | null
    evidence: string
  },
  payload: ReadAloudReportPayload
) {
  const { result, session } = payload
  const weakSegments = result.weakSegments ?? []
  const issueExamples = uniquePhrases(weakSegments.map((segment) => segment.issue), 2)
  const pauseExamples = uniquePhrases(
    weakSegments.map((segment) => segment.pauseGuidance || segment.whyItStoodOut || segment.issue),
    2
  )
  const naturalnessExamples = uniquePhrases(
    weakSegments.map((segment) => segment.naturalnessNote || segment.whyItStoodOut || segment.issue),
    2
  )
  const clarityExamples = uniquePhrases(weakSegments.map((segment) => segment.whyItStoodOut || segment.issue), 2)
  const pronunciationWords = uniquePhrases(
    weakSegments.flatMap((segment) => [
      ...(segment.pronunciationTargets?.map((target) => target.word) ?? []),
      ...segment.wordHints,
    ]),
    3
  )

  const score = row.score ?? null
  const weakestScoredAreas = Object.entries(result.dimensions)
    .filter(([key, block]) => key !== 'levelFit' && key !== row.key && block.supported && block.score != null)
    .sort((a, b) => (a[1].score ?? 0) - (b[1].score ?? 0))
    .slice(0, 2)
    .map(([key]) => {
      switch (key) {
        case 'pronunciation':
          return 'clear pronunciation'
        case 'fluency':
          return 'smooth delivery'
        case 'pacing':
          return 'rhythm'
        case 'clarity':
          return 'overall clarity'
        case 'expression':
          return 'natural-sounding Dutch'
        case 'readingAccuracy':
          return 'overall speaking quality'
        default:
          return key
      }
    })

  switch (row.key) {
    case 'readingAccuracy':
      return {
        ...row,
        label: !row.supported || score == null ? 'Not enough evidence' : score >= 80 ? 'Strong overall' : score >= 64 ? 'Quite solid overall' : 'Needs more consistency',
        detail: 'A simple overall view of how solid the whole read sounded.',
        evidence:
          issueExamples.length
            ? `This score drops when whole phrases sound rushed, unfinished, or hard to interpret. In this take, it was pulled down most by sections like ${quotedList(issueExamples)}.`
            : 'This score drops when several short sections become unclear, rushed, or hard to interpret in one take.',
      }
    case 'pronunciation':
      return {
        ...row,
        label: !row.supported || score == null ? 'Not enough evidence' : score >= 78 ? 'Clear pronunciation' : score >= 62 ? 'Mostly clear pronunciation' : 'Some words were unclear',
        detail: 'This looks at how clearly individual words and sounds came out.',
        evidence:
          pronunciationWords.length
            ? `This score is usually brought down by blurred vowels, soft consonants, or clipped word endings. In this take, words like ${quotedList(pronunciationWords)} stood out most.`
            : 'This score is usually brought down when vowels blur together, consonants are too soft, or word endings get clipped.',
      }
    case 'fluency':
      return {
        ...row,
        label: !row.supported || score == null ? 'Not enough evidence' : score >= 78 ? 'Smooth enough' : score >= 62 ? 'Mostly steady' : 'A bit choppy',
        detail: 'This looks at how smoothly you kept moving within each short spoken section.',
        evidence:
          issueExamples.length
            ? `It usually drops when you restart mid-phrase, rush the ending, or lose flow inside a sentence. Here, the score was lowered most by sections like ${quotedList(issueExamples)}.`
            : 'It usually drops when speech becomes choppy, rushed, or uneven inside a phrase.',
      }
    case 'pacing':
      return {
        ...row,
        label: !row.supported || score == null ? 'Not enough evidence' : score >= 78 ? 'Good rhythm' : score >= 62 ? 'Mostly steady rhythm' : 'Rhythm needs work',
        detail: 'This is about where you paused and whether phrases connected naturally.',
        evidence:
          pauseExamples.length
            ? `This score comes down when pauses land in awkward places or one phrase runs into the next too quickly. In your report, examples included ${joinPlainList(pauseExamples)}.`
            : 'This score comes down when pauses land in awkward places or when one phrase runs too fast into the next.',
      }
    case 'expression':
      return {
        ...row,
        label: !row.supported || score == null ? 'Not enough evidence' : score >= 78 ? 'Sounds quite natural' : score >= 62 ? 'Starting to sound natural' : 'Still sounds careful',
        detail: 'This is about whether the Dutch sounded natural, not just correct.',
        evidence:
          naturalnessExamples.length
            ? `This score is lowered when the delivery sounds flat, over-careful, or rushed instead of naturally Dutch. In this take, examples included ${joinPlainList(naturalnessExamples)}.`
            : 'This score is lowered when the delivery sounds flat, over-careful, or rushed instead of naturally Dutch.',
      }
    case 'clarity':
      return {
        ...row,
        label: !row.supported || score == null ? 'Not enough evidence' : score >= 78 ? 'Easy to understand' : score >= 64 ? 'Mostly understandable' : 'Sometimes hard to catch',
        detail: 'This reflects how easy it would be for a listener to follow you.',
        evidence:
          clarityExamples.length
            ? `This score drops when the listener can still guess the meaning but has to work for it. In this recording, it was lowered by moments like ${joinPlainList(clarityExamples)}.`
            : 'This score drops when the listener can still guess the meaning but has to work harder than they should.',
      }
    case 'levelFit':
      return {
        ...row,
        label: score == null ? 'Level fit unclear' : score >= 78 ? 'Good fit for level' : score >= 62 ? 'A healthy stretch' : 'Quite challenging right now',
        detail: `This compares your take with what we would usually expect around ${session.cefrLevel}.`,
        evidence:
          weakestScoredAreas.length
            ? `This was brought down more by ${joinPlainList(weakestScoredAreas)} than by strict text matching. In other words, the challenge was how it sounded, not whether every printed word matched perfectly.`
            : `This mainly reflects how the recording sounded at ${session.cefrLevel}, not whether you matched the passage word for word.`,
      }
    default:
      return row
  }
}

function buildHeroOverallCopy(payload: ReadAloudReportPayload): { title: string; detail: string } {
  const { result, session } = payload
  const weakSegments = result.weakSegments ?? []
  const clarity = result.dimensions.clarity?.score ?? null
  const naturalness = result.dimensions.expression?.score ?? null
  const pronunciation = result.dimensions.pronunciation?.score ?? null
  const pacing = result.dimensions.pacing?.score ?? null
  const hasIncompletePhrase = weakSegments.some((segment) => {
    const text = `${segment.issue} ${segment.whyItStoodOut ?? ''}`.toLowerCase()
    return text.includes('incomplete') || text.includes('finish') || text.includes('clipped')
  })
  const hasUnclearWords = weakSegments.some((segment) => (segment.pronunciationTargets?.length ?? 0) > 0)
  const hasPauseIssues = weakSegments.some((segment) => {
    const text = `${segment.pauseGuidance ?? ''} ${segment.issue}`.toLowerCase()
    return text.includes('pause') || text.includes('rhythm') || text.includes('rushed')
  })
  const hasNaturalnessIssues = weakSegments.some((segment) => {
    const text = `${segment.naturalnessNote ?? ''} ${segment.whyItStoodOut ?? ''}`.toLowerCase()
    return text.includes('natural') || text.includes('dutch-like') || text.includes('careful') || text.includes('flat')
  })

  const focusAreas: string[] = []
  if (hasUnclearWords || (pronunciation != null && pronunciation < 68)) {
    focusAreas.push('cleaner pronunciation on a few words')
  }
  if (hasIncompletePhrase) {
    focusAreas.push('finishing phrases more clearly')
  }
  if (hasPauseIssues || (pacing != null && pacing < 68)) {
    focusAreas.push('smoother pauses and steadier rhythm')
  }
  if (hasNaturalnessIssues || (naturalness != null && naturalness < 68)) {
    focusAreas.push('more natural-sounding phrasing')
  }

  const title =
    clarity != null && clarity >= 78 && naturalness != null && naturalness >= 75
      ? `You sounded natural and easy to understand for ${session.cefrLevel}.`
      : clarity != null && clarity >= 64
        ? `Someone listening at about ${session.cefrLevel} level could likely follow you, even though a few parts still needed work.`
        : `The main ideas came through, but some parts were still hard to follow at ${session.cefrLevel}.`

  const detailParts: string[] = []

  if (naturalness != null && naturalness >= 72) {
    detailParts.push('Parts of your Dutch already sounded fairly natural.')
  } else if (naturalness != null) {
    detailParts.push('Your Dutch was understandable, but it still sounded a bit careful rather than fully natural.')
  }

  if (pronunciation != null && pronunciation < 68) {
    detailParts.push('Some words needed cleaner pronunciation.')
  }

  if (pacing != null && pacing < 68) {
    detailParts.push('A few phrases were rushed or paused awkwardly.')
  }

  if (focusAreas.length) {
    detailParts.push(`What will help most next is ${joinPlainList(focusAreas)}.`)
  } else {
    detailParts.push('The main next step is making the weaker phrases clearer and steadier.')
  }

  return {
    title,
    detail: detailParts.join(' '),
  }
}

function GlossableText({
  text,
  activeGlossKey,
  onWordClick,
  className = '',
}: {
  text: string
  activeGlossKey?: string | null
  onWordClick: (rawWord: string, phraseContext: string) => void
  className?: string
}) {
  return (
    <p className={className}>
      {splitGlossableText(text).map((part, index) => {
        if (part.isWhitespace) return <span key={`space-${index}`}>{part.raw}</span>
        if (!part.core || part.core.length < 2) return <span key={`text-${index}`}>{part.raw}</span>
        const glossKey = buildReadAloudGlossKey(part.core, text)
        const active = activeGlossKey === glossKey
        return (
          <button
            key={`word-${index}-${part.raw}`}
            type="button"
            onClick={() => onWordClick(part.raw, text)}
            className={clsx(
              'rounded px-0.5 py-0.5 text-left underline decoration-dotted underline-offset-4 transition-colors hover:text-violet-700 hover:decoration-violet-400',
              active && 'bg-violet-100/80 text-violet-900 decoration-violet-500'
            )}
          >
            {part.raw}
          </button>
        )
      })}
    </p>
  )
}

function collectGlossPrefetchItems(
  weakSegments: NonNullable<ReadAloudReportPayload['result']['weakSegments']>
): Array<{ word: string; phraseContext: string; key: string }> {
  const seen = new Set<string>()
  const out: Array<{ word: string; phraseContext: string; key: string }> = []

  for (const segment of weakSegments) {
    for (const text of [segment.transcript, segment.likelyIntendedPhrase]) {
      for (const part of splitGlossableText(text)) {
        if (part.isWhitespace || !part.core || part.core.length < 2) continue
        const key = buildReadAloudGlossKey(part.core, text)
        if (seen.has(key)) continue
        seen.add(key)
        out.push({ word: part.core, phraseContext: text, key })
      }
    }
  }

  return out
}

function ReportSection({
  title,
  subtitle,
  icon: Icon,
  iconBgClass,
  children,
  bodyClassName,
}: {
  title: string
  subtitle?: string
  icon: LucideIcon
  iconBgClass: string
  children: ReactNode
  bodyClassName?: string
}) {
  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-slate-200/95 bg-white shadow-[0_16px_48px_-28px_rgba(15,23,42,0.22)]">
      <div className="flex items-start gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50/95 via-white to-violet-50/20 px-4 py-3.5 sm:px-5 sm:py-4">
        <div
          className={clsx(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-md ring-1 ring-black/5',
            iconBgClass
          )}
          aria-hidden
        >
          <Icon className="h-5 w-5" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <h2 className="text-body font-bold tracking-tight text-ink-primary">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-caption leading-snug text-ink-tertiary">{subtitle}</p> : null}
        </div>
      </div>
      <div className={clsx('p-4 sm:p-5', bodyClassName)}>{children}</div>
    </section>
  )
}

export function ReadAloudReportScreen() {
  const router = useRouter()
  const libraryWords = usePersonalLibraryStore((s) => s.words)
  const libraryPhrases = usePersonalLibraryStore((s) => s.phrases)
  const glossRequestsRef = useRef(new Map<string, Promise<string>>())
  const [payload, setPayload] = useState<ReturnType<typeof loadReadAloudReport>>(null)
  const [ttsBusy, setTtsBusy] = useState<string | null>(null)
  const [reprocessBusy, setReprocessBusy] = useState(false)
  const [reprocessErr, setReprocessErr] = useState<string | null>(null)
  const [activeGloss, setActiveGloss] = useState<{
    key: string
    word: string
    phraseContext: string
    gloss: string
    segmentId: string
  } | null>(null)
  const [glossLoadingKey, setGlossLoadingKey] = useState<string | null>(null)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)
  /** Resolved URL for `<audio>`: inline data URL or a temporary blob URL from IndexedDB. */
  const [learnerPlaybackSrc, setLearnerPlaybackSrc] = useState<string | null>(null)
  const [learnerPlaybackLoading, setLearnerPlaybackLoading] = useState(false)
  const [learnerPlaybackErr, setLearnerPlaybackErr] = useState<string | null>(null)

  useEffect(() => {
    const p = loadReadAloudReport()
    if (!p) {
      router.replace(APP_READ_ALOUD)
      return
    }
    setPayload(p)
  }, [router])

  useEffect(() => {
    if (!payload) return
    let objectUrl: string | null = null
    let cancelled = false
    const revoke = () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
        objectUrl = null
      }
    }
    setLearnerPlaybackErr(null)
    const du = payload.learnerAudio?.dataUrl?.trim()
    if (du) {
      setLearnerPlaybackLoading(false)
      setLearnerPlaybackSrc(du)
      return () => {
        cancelled = true
        revoke()
      }
    }
    const k = payload.learnerAudioIdbKey?.trim()
    if (!k) {
      setLearnerPlaybackLoading(false)
      setLearnerPlaybackSrc(null)
      return () => {
        cancelled = true
        revoke()
      }
    }
    setLearnerPlaybackLoading(true)
    setLearnerPlaybackSrc(null)
    void (async () => {
      try {
        const clip = await getReadAloudLearnerClip(k)
        if (cancelled) return
        if (!clip?.blob) {
          setLearnerPlaybackErr('Saved recording is no longer in this browser.')
          setLearnerPlaybackSrc(null)
          return
        }
        const url = URL.createObjectURL(clip.blob)
        if (cancelled) {
          URL.revokeObjectURL(url)
          return
        }
        objectUrl = url
        setLearnerPlaybackSrc(url)
      } catch {
        if (!cancelled) {
          setLearnerPlaybackErr('Could not load your saved recording from this browser.')
          setLearnerPlaybackSrc(null)
        }
      } finally {
        if (!cancelled) setLearnerPlaybackLoading(false)
      }
    })()
    return () => {
      cancelled = true
      revoke()
    }
  }, [payload?.savedAt, payload?.learnerAudio?.dataUrl, payload?.learnerAudioIdbKey])

  const canReprocessRecording = useMemo(() => {
    if (!payload) return false
    return Boolean(payload.learnerAudio?.dataUrl?.trim() || payload.learnerAudioIdbKey?.trim())
  }, [payload])

  const dims = useMemo(() => {
    if (!payload) return []
    const d = payload.result.dimensions
    const order = [
      ['readingAccuracy', 'Speaking quality'],
      ['pronunciation', 'Pronunciation'],
      ['fluency', 'Smooth reading'],
      ['pacing', 'Rhythm & tone'],
      ['expression', 'How Dutch it sounded'],
      ['clarity', 'Easy to follow'],
      ['levelFit', 'Fit for your level'],
    ] as const
    return order
      .map(([k, title]) => {
        const block = d[k]
        if (!block) return null
        return friendlyDimensionCopy({ key: k, title, ...block }, payload)
      })
      .filter(Boolean) as Array<{
      key: string
      title: string
      supported: boolean
      score: number | null
      label: string
      detail: string | null
      evidence: string
    }>
  }, [payload])

  const savedWordKeys = useMemo(() => new Set(libraryWords.map((item) => normalizeLibraryKey(item.nl))), [libraryWords])
  const savedPhraseKeys = useMemo(() => new Set(libraryPhrases.map((item) => normalizeLibraryKey(item.nl))), [libraryPhrases])

  const playReferenceAudioText = useCallback(async (text: string, busyKey: string) => {
    const t = text.trim()
    if (!t) return
    setTtsBusy(busyKey)
    try {
      const res = await requestGenerateSpeech({ text: t, language: 'nl-NL', speed: 0.95 }, {})
      const a = new Audio(res.audioUrl)
      void a.play().catch(() => {})
    } catch {
      /* ignore */
    } finally {
      setTtsBusy(null)
    }
  }, [])

  const showSavedMessage = useCallback((message: string) => {
    setSavedMessage(message)
    window.setTimeout(() => {
      setSavedMessage((current) => (current === message ? null : current))
    }, 2200)
  }, [])

  const reprocessFromStoredAudio = useCallback(async () => {
    if (!payload) return
    let audioBase64: string
    let mimeType: string
    const du = payload.learnerAudio?.dataUrl
    if (du) {
      const parsed = parseLearnerDataUrl(du)
      if (!parsed) {
        setReprocessErr('Stored audio could not be read. Try a new recording.')
        return
      }
      audioBase64 = parsed.audioBase64
      mimeType = parsed.mimeType
    } else if (payload.learnerAudioIdbKey?.trim()) {
      const clip = await getReadAloudLearnerClip(payload.learnerAudioIdbKey.trim())
      if (!clip?.blob) {
        setReprocessErr('Saved recording is missing from this browser. Use Retry full passage to record again.')
        return
      }
      audioBase64 = await blobToBase64(clip.blob)
      mimeType = clip.mimeType
    } else {
      setReprocessErr('No saved recording is available to re-run scoring. Use Retry full passage to record again.')
      return
    }
    setReprocessBusy(true)
    setReprocessErr(null)
    playAppSound('tap')
    try {
      const result = await readAloudEvaluate({
        targetText: payload.session.targetText,
        audioBase64,
        mimeType,
        cefrLevel: payload.session.cefrLevel,
        genre: payload.session.genre ?? null,
      })
      const next: ReadAloudReportPayload = {
        session: payload.session,
        result,
        savedAt: new Date().toISOString(),
        learnerAudio: payload.learnerAudio ?? null,
        learnerAudioIdbKey: payload.learnerAudioIdbKey ?? null,
      }
      saveReadAloudReport(next)
      setPayload(next)
    } catch (e) {
      setReprocessErr(readAloudEvaluateErrorMessage(e))
    } finally {
      setReprocessBusy(false)
    }
  }, [payload])

  const goSession = (next: ReadAloudSessionPayload) => {
    playAppSound('tap')
    saveReadAloudSession(next)
    router.push(APP_READ_ALOUD_SESSION)
  }

  const retryPassage = () => {
    if (!payload) return
    goSession({
      ...payload.session,
      createdAt: new Date().toISOString(),
    })
  }

  const shiftLevel = (dir: -1 | 1) => {
    if (!payload) return
    const i = LEVEL_ORDER.indexOf(payload.session.cefrLevel)
    const j = Math.max(0, Math.min(LEVEL_ORDER.length - 1, i + dir))
    if (j === i) return
    goSession({
      ...payload.session,
      cefrLevel: LEVEL_ORDER[j]!,
      createdAt: new Date().toISOString(),
    })
  }

  const prefillGenerate = (genre?: string | null) => {
    sessionStorage.setItem(
      READ_ALOUD_PREFILL_GENERATE_KEY,
      JSON.stringify({
        level: payload?.session.cefrLevel,
        ...(genre ? { genre } : {}),
      })
    )
    router.push(APP_READ_ALOUD)
  }

  const saveWeakWords = () => {
    if (!payload?.result.weakWords.length) return
    playAppSound('tap')
    addSavedDrill({
      kind: 'word',
      title: 'Read aloud — weak words',
      content: payload.result.weakWords.join(' · '),
    })
    showSavedMessage('Saved weak words for later.')
  }

  const savePassage = () => {
    if (!payload) return
    playAppSound('tap')
    addSavedDrill({
      kind: 'passage',
      title: payload.session.title?.trim() || 'Saved read-aloud passage',
      content: payload.session.targetText,
    })
    showSavedMessage('Saved passage for later.')
  }

  const saveWordForLater = useCallback((word: string, gloss: string | null) => {
    const cleanedWord = word.trim()
    if (!cleanedWord) return
    if (savedWordKeys.has(normalizeLibraryKey(cleanedWord))) {
      showSavedMessage(`"${cleanedWord}" is already in your library.`)
      return
    }
    playAppSound('library_save')
    usePersonalLibraryStore.getState().addWord(cleanedWord, gloss?.trim() || undefined)
    addSavedDrill({
      kind: 'word',
      title: `Read aloud word — ${cleanedWord}`,
      content: gloss?.trim() ? `${cleanedWord} — ${gloss.trim()}` : cleanedWord,
    })
    showSavedMessage(`Saved "${cleanedWord}" to your library.`)
  }, [savedWordKeys, showSavedMessage])

  const savePhraseForLater = useCallback((phrase: string, label?: string | null) => {
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
      title: label?.trim() || 'Read aloud phrase',
      content: cleaned,
    })
    showSavedMessage('Saved phrase to your library.')
  }, [savedPhraseKeys, showSavedMessage])

  const resolveGloss = useCallback(async (word: string, phraseContext: string): Promise<{ key: string; gloss: string }> => {
    const core = normalizeGlossToken(word)
    const trimmedContext = phraseContext.trim()
    const key = buildReadAloudGlossKey(core, trimmedContext)
    if (!core) return { key, gloss: '' }

    const stored = readStoredReadAloudGlosses()[key]
    if (stored?.trim()) return { key, gloss: stored.trim() }

    const inFlight = glossRequestsRef.current.get(key)
    if (inFlight) {
      const gloss = await inFlight
      return { key, gloss }
    }

    const req = conversationClient
      .speakLiveWordGloss({
        word: core,
        phraseContext: trimmedContext || undefined,
      })
      .then((res) => {
        const gloss = (res.gloss ?? '').trim() || `English meaning for “${core}” is not available yet.`
        writeStoredReadAloudGloss(key, gloss)
        return gloss
      })
      .catch(() => `We could not load the English meaning for “${core}” right now.`)
      .finally(() => {
        glossRequestsRef.current.delete(key)
      })

    glossRequestsRef.current.set(key, req)
    const gloss = await req
    return { key, gloss }
  }, [])

  const onGlossWordClick = useCallback(async (rawWord: string, phraseContext: string, segmentId: string) => {
    const core = normalizeGlossToken(rawWord)
    if (!core) return
    const glossKey = buildReadAloudGlossKey(core, phraseContext)
    const stored = readStoredReadAloudGlosses()[glossKey]
    if (stored?.trim()) {
      setActiveGloss({
        key: glossKey,
        word: rawWord.trim(),
        phraseContext,
        gloss: stored.trim(),
        segmentId,
      })
      return
    }
    setGlossLoadingKey(glossKey)
    try {
      const { gloss } = await resolveGloss(rawWord, phraseContext)
      setActiveGloss({
        key: glossKey,
        word: rawWord.trim(),
        phraseContext,
        gloss,
        segmentId,
      })
    } catch {
      setActiveGloss({
        key: glossKey,
        word: rawWord.trim(),
        phraseContext,
        gloss: `We could not load the English meaning for “${core}” right now.`,
        segmentId,
      })
    } finally {
      setGlossLoadingKey(null)
    }
  }, [resolveGloss])

  useEffect(() => {
    if (!payload?.result.weakSegments?.length) return
    const items = collectGlossPrefetchItems(payload.result.weakSegments)
    if (!items.length) return

    let cancelled = false
    const concurrency = 4

    const worker = async (workerIndex: number) => {
      for (let i = workerIndex; i < items.length; i += concurrency) {
        if (cancelled) return
        const item = items[i]
        if (!item) continue
        try {
          await resolveGloss(item.word, item.phraseContext)
        } catch {
          /* ignore prefetch failures */
        }
      }
    }

    void Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, (_, index) => worker(index)))

    return () => {
      cancelled = true
    }
  }, [payload, resolveGloss])

  const onNextAction = (id: string, _sentenceIndex?: number) => {
    if (!payload) return
    switch (id) {
      case 'practice_weak_words':
        saveWeakWords()
        break
      case 'retry_passage':
        retryPassage()
        break
      case 'retry_sentence':
        break
      case 'new_passage_same_level':
        prefillGenerate(null)
        break
      case 'lower_level':
        shiftLevel(-1)
        break
      case 'raise_level':
        shiftLevel(1)
        break
      case 'generate_same_genre':
        prefillGenerate(payload.session.genre ?? null)
        break
      default:
        break
    }
  }

  if (!payload) {
    return <div className="px-4 py-10 text-center text-body-sm text-ink-secondary">Loading…</div>
  }

  const { result, session } = payload
  const weakSegments = result.weakSegments ?? []
  const pacingBlock = result.dimensions.pacing
  const readingBlock = result.dimensions.readingAccuracy
  const readingPctDisplay =
    readingBlock?.supported && readingBlock.score01 != null
      ? (Math.round(readingBlock.score01 * 1000) / 10).toFixed(1)
      : readingBlock?.supported && readingBlock.score != null
        ? String(readingBlock.score)
        : null
  const readingPctBar =
    readingBlock?.supported && readingBlock.score01 != null
      ? Math.min(100, Math.max(0, readingBlock.score01 * 100))
      : readingBlock?.supported && readingBlock.score != null
        ? Math.min(100, Math.max(0, readingBlock.score))
        : null
  const readingScoreForBand =
    readingBlock?.supported && readingBlock.score != null
      ? readingBlock.score
      : readingPctBar != null
        ? Math.round(readingPctBar)
        : null
  const readingHeroBand =
    readingScoreForBand != null && readingBlock?.supported ? readAloudScoreBand(true, readingScoreForBand) : null
  const readingHeroCopy = buildHeroOverallCopy(payload)

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 pb-32 pt-2 sm:px-5">
      {savedMessage ? (
        <div className="sticky top-3 z-30 mx-auto max-w-md rounded-2xl border border-emerald-200/90 bg-emerald-50/95 px-4 py-3 text-body-sm font-medium text-emerald-950 shadow-lg ring-1 ring-emerald-200/70 backdrop-blur">
          {savedMessage}
        </div>
      ) : null}
      <Link
        href={APP_SPEAK_LIVE}
        className="inline-flex min-h-touch items-center rounded-full border border-slate-200/80 bg-white px-3 py-2 text-caption font-semibold text-primary-700 shadow-sm ring-1 ring-slate-900/5 hover:bg-slate-50"
      >
        ← Speak home
      </Link>

      <header className="space-y-5">
        <div className="overflow-hidden rounded-[1.75rem] border border-slate-200/90 bg-gradient-to-br from-white via-violet-50/30 to-slate-50/40 p-5 shadow-[0_20px_50px_-32px_rgba(15,23,42,0.2)] sm:p-6">
          <div className="inline-flex rounded-full border border-violet-200/90 bg-violet-100/80 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-violet-900">
            Read aloud · session report
          </div>
          <h1 className="mt-3 text-title font-bold tracking-tight text-ink-primary">Your reading report</h1>
          <p className="mt-1 text-caption text-ink-tertiary">
            {session.title?.trim() ? (
              <>
                <span className="font-semibold text-ink-secondary">{session.title.trim()}</span>
                <span className="text-ink-tertiary"> · </span>
              </>
            ) : null}
            Level {session.cefrLevel}
          </p>
          {canReprocessRecording ? (
            <p className="mt-2 max-w-xl text-caption leading-relaxed text-violet-900/90">
              <span className="font-semibold">Re-run scoring:</span> use <span className="font-semibold">Re-run scoring (same recording)</span> in{' '}
              <span className="font-semibold">More actions</span> at the bottom, or the same button under <span className="font-semibold">Your recording</span>{' '}
              higher on this page — same audio, new report.
            </p>
          ) : null}

          {readingPctDisplay != null && readingPctBar != null && readingHeroBand ? (
            <div
              className={clsx(
                'mt-5 rounded-2xl border px-4 py-5 shadow-inner sm:px-6 sm:py-6',
                readingHeroBand.cardClass
              )}
              role="region"
              aria-label="Overall score summary"
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
                <div className="min-w-0 space-y-1 lg:max-w-xl">
                  <p className="text-caption font-bold uppercase tracking-wider text-ink-secondary">Overall score</p>
                  <p className="text-body-sm font-medium text-ink-primary">{readingHeroCopy.title}</p>
                  <p className="text-caption text-ink-tertiary leading-relaxed lg:max-w-md">{readingHeroCopy.detail}</p>
                </div>
                <div className="flex flex-col gap-3 lg:shrink-0 lg:items-end">
                  <p
                    className={clsx(
                      'inline-flex items-baseline gap-1 whitespace-nowrap text-[clamp(2.75rem,12vw,4.25rem)] font-black leading-none tracking-tight tabular-nums',
                      readingHeroBand.scoreClass
                    )}
                  >
                    {readingPctDisplay}
                    <span className="translate-y-[-0.04em] text-[clamp(0.95rem,2.8vw,1.35rem)] font-semibold opacity-85">%</span>
                  </p>
                  <div
                    className={clsx(
                      'h-3.5 w-full overflow-hidden rounded-full lg:w-56 lg:min-w-56',
                      readingHeroBand.trackClass
                    )}
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(readingPctBar)}
                    aria-label={`Overall score ${readingPctDisplay} percent`}
                  >
                    <div
                      className={clsx(
                        'h-full rounded-full motion-safe:transition-[width] motion-safe:duration-500',
                        readingHeroBand.fillClass
                      )}
                      style={{ width: `${readingPctBar}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {result.learningMemoryRibbon && learningMemoryRibbonHasContent(result.learningMemoryRibbon) ? (
          <LearningMemoryRibbon ribbon={result.learningMemoryRibbon} />
        ) : null}

        <div className="rounded-2xl border border-slate-200/90 bg-slate-50/50 p-4 shadow-sm ring-1 ring-slate-900/[0.03] sm:p-5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-violet-800/90">Coach summary</p>
          <p className="mt-2 text-body-sm leading-relaxed text-ink-primary">{result.coaching.summary}</p>
        </div>

        {result.fairness?.message ? (
          <div
            className={clsx(
              'rounded-2xl p-4 shadow-md ring-1',
              result.fairness.mode === 'failure'
                ? 'border border-red-300/80 bg-gradient-to-br from-red-50 to-rose-50/70 ring-red-200/50'
                : 'border border-amber-300/80 bg-gradient-to-br from-amber-50 to-yellow-50/70 ring-amber-200/50'
            )}
          >
            <p
              className={clsx(
                'text-[11px] font-bold uppercase tracking-wide',
                result.fairness.mode === 'failure' ? 'text-red-900' : 'text-amber-950'
              )}
            >
              {result.fairness.mode === 'failure' ? 'Scoring confidence' : 'Approximate report'}
            </p>
            <p
              className={clsx(
                'mt-2 text-body-sm font-medium leading-relaxed',
                result.fairness.mode === 'failure' ? 'text-red-950' : 'text-amber-950'
              )}
            >
              {result.fairness.message}
            </p>
            {result.fairness.reasons?.length ? (
              <ul
                className={clsx(
                  'mt-3 list-disc space-y-1.5 pl-4 text-caption leading-relaxed',
                  result.fairness.mode === 'failure' ? 'text-red-950/90' : 'text-amber-950/90'
                )}
              >
                {result.fairness.reasons.map((reason, i) => (
                  <li key={i}>{reason}</li>
                ))}
              </ul>
            ) : null}
            <p
              className={clsx(
                'mt-3 text-caption',
                result.fairness.mode === 'failure' ? 'text-red-950/80' : 'text-amber-950/80'
              )}
            >
              {result.fairness.mode === 'failure'
                ? 'You can replay your clip below, regenerate the report, or retry the reading with one steady take.'
                : 'Use the sentence-level feedback below as guidance, especially on the lines that aligned most clearly.'}
            </p>
          </div>
        ) : null}

        {result.pronunciationApi.caveats?.length ? (
          <div
            className="flex gap-3 rounded-2xl border border-amber-300/70 bg-gradient-to-br from-amber-50 to-amber-100/40 px-4 py-3.5 text-amber-950 shadow-md ring-1 ring-amber-200/50"
            role="region"
            aria-label="Report quality notes"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden />
            <div className="min-w-0">
              <p className="text-caption font-bold uppercase tracking-wide text-amber-950">Report notes</p>
              <ul className="mt-2 list-disc space-y-1.5 pl-4 text-body-sm leading-relaxed text-amber-950/95">
                {result.pronunciationApi.caveats.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </header>

      <div className="space-y-3 rounded-[1.75rem] border border-emerald-200/90 bg-gradient-to-br from-emerald-50/60 via-white to-teal-50/25 p-5 shadow-[0_12px_36px_-20px_rgba(5,95,70,0.25)] ring-1 ring-emerald-900/5">
        <div className="flex items-center gap-2 border-b border-emerald-200/50 pb-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
            <Sparkles className="h-4 w-4" aria-hidden />
          </span>
          <p className="text-body-sm font-bold text-emerald-950">Focus for next time</p>
        </div>
        <p className="text-body font-semibold text-ink-primary">{result.coaching.focusArea}</p>
        {result.pronunciationApi.summaryFeedback ? (
          <p className="text-body-sm leading-relaxed text-ink-secondary">{result.pronunciationApi.summaryFeedback}</p>
        ) : null}
      </div>

      {canReprocessRecording ? (
        <ReportSection
          title="Your recording"
          subtitle="Full clip you submitted — replay or re-run scoring on the same audio without reading the passage again."
          icon={FileAudio2}
          iconBgClass="bg-gradient-to-br from-violet-500 to-indigo-600"
        >
          {learnerPlaybackLoading ? (
            <p className="text-caption font-medium text-ink-secondary">Loading your recording…</p>
          ) : null}
          {learnerPlaybackErr ? (
            <div className="rounded-xl border border-amber-200/90 bg-amber-50/95 px-3 py-2.5">
              <p className="text-caption leading-relaxed text-amber-950">{learnerPlaybackErr}</p>
            </div>
          ) : null}
          {learnerPlaybackSrc ? (
            <ReadAloudLearnerClipPlayer src={learnerPlaybackSrc} scrubIdSuffix="full-passage" />
          ) : !learnerPlaybackLoading && !learnerPlaybackErr ? (
            <p className="text-caption text-ink-tertiary">Playback will appear here when the clip is ready.</p>
          ) : null}
          <div className="mt-5 border-t border-slate-200/80 pt-4 space-y-2">
            <Button
              type="button"
              variant="secondary"
              className="w-full gap-2 sm:w-auto"
              disabled={reprocessBusy}
              onClick={() => void reprocessFromStoredAudio()}
            >
              <RefreshCw className={clsx('h-4 w-4', reprocessBusy && 'motion-safe:animate-spin')} aria-hidden />
              Re-run scoring on this recording
            </Button>
            <p className="text-[11px] leading-relaxed text-ink-tertiary">
              Calls the read-aloud evaluator again on the same clip — useful after a glitch, a pipeline update, or if
              you want another scoring pass without re-recording. The same control appears under <span className="font-semibold">More actions</span>{' '}
              at the bottom of this page.
            </p>
            {reprocessBusy ? (
              <div className="rounded-xl border border-violet-200 bg-violet-50/80 px-3 py-4 shadow-inner">
                <p className="text-caption font-semibold text-sky-950">Regenerating your report…</p>
                <ReadAloudEvaluatingProgress />
              </div>
            ) : null}
          </div>
        </ReportSection>
      ) : (
        <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50/80 p-5 text-center shadow-inner">
          <p className="text-caption font-bold text-ink-primary">Your recording</p>
          <p className="mt-2 text-body-sm leading-relaxed text-ink-secondary">
            No recording was kept for this session (for example the clip could not be stored in this browser). Use{' '}
            <span className="font-semibold text-ink-primary">Retry full passage</span> below to record again — new takes
            save audio when possible so you can replay and re-run scoring later.
          </p>
        </div>
      )}

      <ReportSection
        title="How you scored"
        subtitle="Each bar is out of 100 — colour shows how strong that area looks for this take."
        icon={BarChart3}
        iconBgClass="bg-gradient-to-br from-violet-600 to-fuchsia-600"
        bodyClassName="!pt-4"
      >
        <div className="grid gap-3 sm:grid-cols-2">
        {dims.map((row) => {
          const band = readAloudScoreBand(row.supported, row.score)
          const barPct = row.supported && row.score != null ? band.pct : 0
          return (
            <Card
              key={row.key}
              variant="outlined"
              padding="none"
              className={clsx('rounded-2xl border p-4', band.cardClass)}
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-caption font-semibold text-ink-primary">{row.title}</p>
                <p className={clsx('text-lg font-bold tabular-nums', band.scoreClass)}>
                  {row.supported && row.score != null ? row.score : '—'}
                </p>
              </div>
              <div
                className={clsx('mt-3 h-2 w-full overflow-hidden rounded-full', band.trackClass)}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={row.supported && row.score != null ? Math.round(row.score) : 0}
                aria-label={`${row.title} score`}
              >
                <div
                  className={clsx('h-full rounded-full motion-safe:transition-[width] motion-safe:duration-500', band.fillClass)}
                  style={{ width: row.supported && row.score != null ? `${barPct}%` : '0%' }}
                />
              </div>
              <p className="mt-2 text-body-sm text-ink-secondary">{row.label}</p>
              {row.detail ? <p className="mt-1 text-caption text-ink-tertiary">{row.detail}</p> : null}
              <p className="mt-2 text-caption leading-snug text-ink-secondary border-t border-slate-100/80 pt-2">{row.evidence}</p>
            </Card>
          )
        })}
        </div>
      </ReportSection>

      {pacingBlock.evidence ? (
        <div className="rounded-2xl border border-amber-200/90 bg-gradient-to-r from-amber-50 to-orange-50/30 p-4 shadow-md ring-1 ring-amber-900/[0.06]">
          <p className="text-caption font-bold uppercase tracking-wide text-amber-950">Pacing notes</p>
          <p className="mt-2 text-body-sm leading-relaxed text-amber-950/90">{pacingBlock.evidence}</p>
        </div>
      ) : null}

      <ReportSection
        title="Key areas to improve"
        subtitle={`${weakSegments.length} short sections where speech quality dropped most. Open a section for your clip, clearer pronunciation targets, pause guidance, and a corrected model phrase.`}
        icon={ListOrdered}
        iconBgClass="bg-gradient-to-br from-indigo-600 to-violet-700"
      >
        <div className="space-y-2">
          {weakSegments.length ? weakSegments.map((segment, index) => (
            <details
              key={segment.id}
              className="group rounded-2xl border border-slate-200/95 bg-slate-50/60 shadow-sm open:border-violet-300/80 open:bg-white open:shadow-[0_12px_40px_-24px_rgba(91,33,182,0.18)] motion-safe:transition-shadow"
            >
              <summary className="flex cursor-pointer list-none items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-white/80 sm:px-4 [&::-webkit-details-marker]:hidden">
                <span className="flex h-8 min-w-[2rem] shrink-0 items-center justify-center rounded-xl bg-violet-100 text-caption font-bold text-violet-900 ring-1 ring-violet-200/80">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 text-left text-body-sm text-ink-primary">
                  <span className="line-clamp-2 font-medium sm:line-clamp-1">{segment.issue}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-ink-tertiary">
                      {fmtClockSec(segment.startSec)} → {fmtClockSec(segment.endSec)}
                    </span>
                  </span>
                </span>
                <ChevronDown
                  className="h-5 w-5 shrink-0 text-violet-600/80 transition-transform group-open:rotate-180"
                  aria-hidden
                />
              </summary>
              <div className="space-y-3 border-t border-violet-100/80 bg-gradient-to-b from-violet-50/15 to-white px-3 pb-3 pt-3 sm:px-4">
                <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 px-3 py-2.5 text-caption">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex rounded-full border border-violet-300/90 bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-900">
                      Confidence {Math.round(segment.confidence * 100)}%
                    </span>
                    <span className="text-[11px] leading-snug text-ink-tertiary">
                      Tap any Dutch word below for meaning and save it for later.
                    </span>
                  </div>
                  {segment.wordHints.length ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {segment.wordHints.map((word, i) => (
                        <span
                          key={`${word}-${i}`}
                          className="rounded-full border border-red-100 bg-red-50/80 px-2 py-0.5 text-[11px] font-medium text-red-950"
                        >
                          {word}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="grid items-start gap-2.5 xl:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
                  <div className="rounded-xl border border-slate-200/90 bg-slate-50/90 p-2.5 shadow-sm ring-1 ring-slate-900/[0.03] space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-600">Reference (model voice)</p>
                    <p className="text-[11px] leading-snug text-ink-tertiary">
                      Listen to the corrected phrase, then compare it with your clip.
                    </p>
                    <p className="rounded-lg border border-slate-200/80 bg-white/85 px-2.5 py-2 text-body-sm leading-relaxed text-ink-primary">
                      {segment.referenceAudioText || segment.likelyIntendedPhrase}
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="w-full gap-2 justify-center text-caption"
                      disabled={ttsBusy === `segment-${segment.id}`}
                      onClick={() => void playReferenceAudioText(segment.referenceAudioText, `segment-${segment.id}`)}
                    >
                      <Headphones className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      Play how it should sound
                    </Button>
                  </div>
                  <div className="rounded-xl border border-violet-300/70 bg-gradient-to-br from-violet-50 to-white p-2.5 shadow-sm ring-1 ring-violet-300/25 space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-violet-900">Your recording</p>
                    <p className="text-[11px] leading-snug text-ink-tertiary">
                      Replay just this short part of your take.
                    </p>
                    {learnerPlaybackSrc ? (
                      <ReadAloudLearnerClipPlayer
                        src={learnerPlaybackSrc}
                        clipStartSec={segment.startSec}
                        clipEndSec={segment.endSec}
                        className="pt-0.5"
                        scrubIdSuffix={`weak-segment-${segment.id}`}
                        aria-label={`Your recording for weak segment ${index + 1}`}
                      />
                    ) : (
                      <p className="text-[11px] text-ink-tertiary">No stored clip — use Retry full passage to record again.</p>
                    )}
                  </div>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">What we heard</p>
                    {segment.transcript ? (
                      <GlossableText
                        text={segment.transcript}
                        activeGlossKey={activeGloss?.segmentId === segment.id ? activeGloss.key : null}
                        onWordClick={(rawWord, phraseContext) => void onGlossWordClick(rawWord, phraseContext, segment.id)}
                        className="mt-1.5 text-body-sm font-medium leading-relaxed text-ink-primary"
                      />
                    ) : (
                      <p className="mt-1.5 text-body-sm font-medium leading-relaxed text-ink-primary">—</p>
                    )}
                  </div>
                  <div className="rounded-xl border border-violet-200/90 bg-violet-50/40 p-2.5 shadow-sm ring-1 ring-violet-200/30">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-violet-800">Likely intended phrase</p>
                    <GlossableText
                      text={segment.likelyIntendedPhrase}
                      activeGlossKey={activeGloss?.segmentId === segment.id ? activeGloss.key : null}
                      onWordClick={(rawWord, phraseContext) => void onGlossWordClick(rawWord, phraseContext, segment.id)}
                      className="mt-1.5 text-body-sm leading-relaxed text-ink-primary"
                    />
                  </div>
                </div>
                {activeGloss?.segmentId === segment.id ? (
                  <div className="rounded-xl border border-violet-200/80 bg-violet-50/50 p-2.5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-violet-900">English meaning</p>
                        <p className="mt-1 text-body-sm font-semibold text-sky-950">“{activeGloss.word}”</p>
                        <p className="mt-1 text-body-sm leading-relaxed text-ink-primary">
                          {glossLoadingKey === activeGloss.key ? 'Looking up the meaning…' : activeGloss.gloss}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="gap-2 text-caption"
                        disabled={savedWordKeys.has(normalizeLibraryKey(activeGloss.word))}
                        onClick={() => saveWordForLater(activeGloss.word, activeGloss.gloss)}
                      >
                        {savedWordKeys.has(normalizeLibraryKey(activeGloss.word)) ? (
                          <Check className="h-3.5 w-3.5" aria-hidden />
                        ) : (
                          <BookmarkPlus className="h-3.5 w-3.5" aria-hidden />
                        )}
                        {savedWordKeys.has(normalizeLibraryKey(activeGloss.word)) ? 'Saved' : 'Save word'}
                      </Button>
                    </div>
                  </div>
                ) : null}
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-2.5">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-ink-primary">Issue</p>
                    <p className="mt-1.5 text-body-sm leading-relaxed text-ink-primary">{segment.issue}</p>
                  </div>
                  {segment.whyItStoodOut ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Why this stood out</p>
                      <p className="mt-1.5 text-body-sm leading-relaxed text-ink-primary">{segment.whyItStoodOut}</p>
                    </div>
                  ) : null}
                </div>
                {segment.suggestion ? (
                  <div className="rounded-xl border-2 border-amber-300/70 bg-gradient-to-br from-amber-50 to-amber-100/30 px-2.5 py-2.5 shadow-md ring-1 ring-amber-200/40">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-amber-950">Coaching tip</p>
                    <p className="mt-1.5 text-body-sm font-medium leading-relaxed text-amber-950">{segment.suggestion}</p>
                  </div>
                ) : null}
                {(segment.pauseGuidance || segment.naturalnessNote) ? (
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {segment.pauseGuidance ? (
                      <div className="rounded-xl border border-emerald-200/90 bg-emerald-50/40 p-2.5 ring-1 ring-emerald-900/[0.04]">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-900">Pause & rhythm</p>
                        <p className="mt-1.5 text-body-sm leading-relaxed text-emerald-950/90">{segment.pauseGuidance}</p>
                      </div>
                    ) : null}
                    {segment.naturalnessNote ? (
                      <div className="rounded-xl border border-violet-200/90 bg-violet-50/40 p-2.5 shadow-sm ring-1 ring-violet-200/30">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-violet-800">How Dutch it sounded</p>
                        <p className="mt-1.5 text-body-sm leading-relaxed text-ink-primary">{segment.naturalnessNote}</p>
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {segment.pronunciationTargets?.length ? (
                  <div className="rounded-xl border border-red-100 bg-red-50/30 p-2.5">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-red-950">Words to pronounce more clearly</p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {segment.pronunciationTargets.map((target, i) => (
                        <div key={`${target.word}-${i}`} className="rounded-lg border border-red-100 bg-white/80 px-3 py-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-body-sm font-semibold text-red-950">
                              {target.word} <span className="text-caption font-medium text-red-900/80">{target.accuracyScore}/100</span>
                            </p>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="gap-1.5 px-2 text-[11px]"
                              disabled={savedWordKeys.has(normalizeLibraryKey(target.word))}
                              onClick={() => saveWordForLater(target.word, null)}
                            >
                              {savedWordKeys.has(normalizeLibraryKey(target.word)) ? (
                                <Check className="h-3.5 w-3.5" aria-hidden />
                              ) : (
                                <BookmarkPlus className="h-3.5 w-3.5" aria-hidden />
                              )}
                              {savedWordKeys.has(normalizeLibraryKey(target.word)) ? 'Saved' : 'Save'}
                            </Button>
                          </div>
                          <p className="mt-1 text-caption leading-relaxed text-red-950/85">{target.tip}</p>
                          <div className="mt-2 grid gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="w-full justify-center gap-2 text-caption"
                              disabled={ttsBusy === `word-${segment.id}-${i}`}
                              onClick={() => void playReferenceAudioText(target.referenceAudioText || target.word, `word-${segment.id}-${i}`)}
                            >
                              <Headphones className="h-3.5 w-3.5 shrink-0" aria-hidden />
                              Play word model
                            </Button>
                            {learnerPlaybackSrc &&
                            target.clipStartSec != null &&
                            target.clipEndSec != null &&
                            target.clipEndSec > target.clipStartSec + 0.03 ? (
                              <div className="rounded-lg border border-red-100/90 bg-red-50/35 p-2">
                                <p className="text-[11px] font-medium text-red-950/90">Your pronunciation of this word</p>
                                <ReadAloudLearnerClipPlayer
                                  src={learnerPlaybackSrc}
                                  clipStartSec={target.clipStartSec}
                                  clipEndSec={target.clipEndSec}
                                  compact
                                  className="mt-1"
                                  scrubIdSuffix={`weak-segment-${segment.id}-word-${i}`}
                                  aria-label={`Your recording for the word ${target.word}`}
                                />
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200/80 bg-slate-50/80 p-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="gap-2 text-caption"
                    disabled={savedPhraseKeys.has(normalizeLibraryKey(segment.referenceAudioText || segment.likelyIntendedPhrase))}
                    onClick={() => savePhraseForLater(segment.referenceAudioText || segment.likelyIntendedPhrase, 'Read aloud phrase')}
                  >
                    {savedPhraseKeys.has(normalizeLibraryKey(segment.referenceAudioText || segment.likelyIntendedPhrase)) ? (
                      <Check className="h-3.5 w-3.5" aria-hidden />
                    ) : (
                      <BookmarkPlus className="h-3.5 w-3.5" aria-hidden />
                    )}
                    {savedPhraseKeys.has(normalizeLibraryKey(segment.referenceAudioText || segment.likelyIntendedPhrase)) ? 'Saved' : 'Save phrase'}
                  </Button>
                  {activeGloss?.segmentId === segment.id ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="gap-2 text-caption"
                      disabled={savedWordKeys.has(normalizeLibraryKey(activeGloss.word))}
                      onClick={() => saveWordForLater(activeGloss.word, activeGloss.gloss)}
                    >
                      {savedWordKeys.has(normalizeLibraryKey(activeGloss.word)) ? (
                        <Check className="h-3.5 w-3.5" aria-hidden />
                      ) : (
                        <BookmarkPlus className="h-3.5 w-3.5" aria-hidden />
                      )}
                      {savedWordKeys.has(normalizeLibraryKey(activeGloss.word)) ? `Saved “${activeGloss.word}”` : `Save “${activeGloss.word}”`}
                    </Button>
                  ) : null}
                </div>
              </div>
            </details>
          )) : (
            <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-4 text-body-sm leading-relaxed text-ink-secondary">
              We did not isolate distinct weak segments this time, which usually means the recording was fairly even overall. Use the overall scores, per-word evidence, and full recording replay to decide what to polish next.
            </div>
          )}
        </div>
      </ReportSection>

      <ReportSection
        title="Coaching & drills"
        subtitle="Concrete observations plus short drills you can do next."
        icon={Lightbulb}
        iconBgClass="bg-gradient-to-br from-amber-500 to-orange-600"
      >
        <ul className="space-y-2.5">
          {result.coaching.feedbackLines.map((line, i) => (
            <li
              key={i}
              className="flex gap-3 rounded-xl border border-slate-200/90 bg-slate-50/60 px-3 py-2.5 text-body-sm leading-relaxed text-ink-primary shadow-sm"
            >
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[11px] font-bold text-violet-800">
                {i + 1}
              </span>
              <span className="min-w-0 pt-0.5">{line}</span>
            </li>
          ))}
        </ul>
        <p className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-wide text-violet-900">Next-step drills</p>
        <ol className="space-y-2">
          {result.coaching.nextStepDrills.map((line, i) => (
            <li
              key={i}
              className="flex gap-3 rounded-xl border border-violet-200/80 bg-violet-50/35 px-3 py-2.5 text-body-sm leading-relaxed text-ink-primary ring-1 ring-violet-200/30"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-[11px] font-bold text-white shadow-sm">
                {i + 1}
              </span>
              <span className="min-w-0 pt-0.5">{line}</span>
            </li>
          ))}
        </ol>
      </ReportSection>

      {result.nextActions?.length ? (
        <ReportSection
          title="Smart next steps"
          subtitle="One tap each — pick what fits how you feel about this read."
          icon={Navigation}
          iconBgClass="bg-gradient-to-br from-fuchsia-600 to-violet-700"
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {result.nextActions.map((a) => (
              <Button
                key={`${a.id}-${a.sentenceIndex ?? ''}`}
                type="button"
                variant="secondary"
                className={clsx(
                  'min-h-touch rounded-2xl border-violet-200/90 bg-white px-4 py-3 text-left justify-start whitespace-normal leading-snug shadow-sm ring-1 ring-violet-100 hover:bg-violet-50/50',
                  a.label.length > 26 && 'sm:col-span-2'
                )}
                onClick={() => onNextAction(a.id, a.sentenceIndex)}
              >
                {a.label}
              </Button>
            ))}
          </div>
        </ReportSection>
      ) : null}

      <div className="rounded-[1.75rem] border border-slate-200/95 bg-gradient-to-b from-slate-50/90 to-white p-4 shadow-[0_-8px_32px_-16px_rgba(15,23,42,0.12)] ring-1 ring-slate-900/[0.04] sm:p-5">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-slate-600">More actions</p>
        <div className="mb-3">
          <ReportQuickCapturePrompt variant="onLight" initial="word" />
        </div>
        {canReprocessRecording ? (
          <div className="mb-3 space-y-1.5">
            <Button
              type="button"
              variant="secondary"
              className="min-h-touch w-full gap-2 rounded-2xl border-violet-200/90 bg-violet-50/90 px-4 py-3 text-left justify-start font-semibold whitespace-normal leading-snug text-violet-950 shadow-sm ring-1 ring-violet-200/70 hover:bg-violet-50"
              disabled={reprocessBusy}
              onClick={() => void reprocessFromStoredAudio()}
            >
              <RefreshCw className={clsx('h-4 w-4 shrink-0', reprocessBusy && 'motion-safe:animate-spin')} aria-hidden />
              Re-run scoring (same recording)
            </Button>
            <p className="text-[11px] leading-relaxed text-ink-tertiary">
              Same clip as this report — no need to read the passage again.
            </p>
          </div>
        ) : null}
        {reprocessErr ? (
          <div className="mb-3 rounded-xl border border-red-200/90 bg-red-50/95 px-3 py-2.5 shadow-sm">
            <p className="text-caption leading-relaxed text-red-900">{reprocessErr}</p>
          </div>
        ) : null}
        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            type="button"
            variant="primary"
            className="min-h-touch gap-2 rounded-2xl px-4 py-3 text-left justify-start whitespace-normal leading-snug shadow-md"
            onClick={retryPassage}
          >
            <Mic className="h-4 w-4" aria-hidden />
            Retry full passage
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="min-h-touch gap-2 rounded-2xl px-4 py-3 text-left justify-start whitespace-normal leading-snug shadow-sm"
            onClick={() => router.push(APP_READ_ALOUD)}
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            New passage
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="min-h-touch gap-2 rounded-2xl px-4 py-3 text-left justify-start whitespace-normal leading-snug shadow-sm"
            onClick={saveWeakWords}
            disabled={!result.weakWords.length}
          >
            Save weak words
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="min-h-touch gap-2 rounded-2xl px-4 py-3 text-left justify-start whitespace-normal leading-snug shadow-sm"
            onClick={savePassage}
          >
            Save passage
          </Button>
        </div>
        {result.weakWords.length ? (
          <p className="mt-4 rounded-xl border border-amber-100 bg-amber-50/50 px-3 py-2 text-caption text-amber-950/90">
            <span className="font-bold text-amber-950">Weak spots: </span>
            <span className="font-medium">{result.weakWords.join(', ')}</span>
          </p>
        ) : null}
      </div>
    </div>
  )
}
