'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  BookMarked,
  Camera,
  Check,
  ClipboardPaste,
  LocateFixed,
  MapPin,
  MessageSquareWarning,
  Mic,
  Plus,
  RotateCcw,
  Square,
  Trash2,
  Type,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { usePersonalLibraryStore } from '@/store/personalLibraryStore'
import { APP_LIBRARY_FROM_YOUR_DAY, APP_LIBRARY_HUB } from '@/lib/routing/appRoutes'
import { playAppSound } from '@/lib/interaction/appSounds'
import { clsx } from 'clsx'
import { isFeature1ChatBackendEnabled } from '@/lib/api/apiConfig'
import { quickCaptureClient } from '@/lib/api/quickCaptureClient'
import { getRetentionUserId, recordQuickCaptureMeaningfulBonus } from '@/lib/retention/retentionService'
import { useQuickCaptureOfflineStore } from '@/store/quickCaptureOfflineStore'
import { blobToBase64, transcribeSpeechAudio } from '@/lib/speech/speechClient'
import type { SavedPlaceItem } from '@/mocks/personalLibrarySeed'
import {
  mapQuickCaptureActionToApiType,
  QUICK_CAPTURE_ACTIONS,
  type QuickCaptureActionId,
} from './quickCaptureTypes'
import { fetchPlaceFromDeviceLocation } from '@/lib/geolocation/placeFromDeviceLocation'

const ICONS = {
  word: Type,
  phrase: BookMarked,
  photo: Camera,
  place: MapPin,
  paste: ClipboardPaste,
  problem: MessageSquareWarning,
  voice: Mic,
} as const

const PLACE_CHIPS: { id: SavedPlaceItem['kind']; label: string }[] = [
  { id: 'train_station', label: 'Station' },
  { id: 'supermarket', label: 'Supermarket' },
  { id: 'doctor', label: 'Doctor' },
  { id: 'cafe', label: 'Café' },
  { id: 'work', label: 'Work' },
  { id: 'gemeente', label: 'Gemeente' },
  { id: 'housing', label: 'Housing' },
  { id: 'other', label: 'Other' },
]

const STRUGGLE_TAGS: { id: string; label: string }[] = [
  { id: 'froze', label: 'Froze' },
  { id: 'too_fast', label: 'Too fast' },
  { id: 'wrong_word', label: 'Wrong word' },
  { id: 'didnt_know_how', label: "Didn't know how to ask" },
  { id: 'didnt_understand', label: "Didn't understand reply" },
]

function buildWordMemoryHint(where: string, heardRead: '' | 'heard' | 'read'): string | undefined {
  const w = where.trim()
  const mode =
    heardRead === 'heard' ? 'Heard' : heardRead === 'read' ? 'Read' : ''
  if (!w && !mode) return undefined
  if (w && mode) return `${mode} · ${w}`
  return w || mode
}

export function QuickCaptureSheet({
  open,
  onClose,
  initialAction,
}: {
  open: boolean
  onClose: () => void
  initialAction: QuickCaptureActionId | null
}) {
  const router = useRouter()
  const addWord = usePersonalLibraryStore((s) => s.addWord)
  const addPhrase = usePersonalLibraryStore((s) => s.addPhrase)
  const addPlace = usePersonalLibraryStore((s) => s.addPlace)
  const addMoment = usePersonalLibraryStore((s) => s.addMoment)
  const addPhotoLabel = usePersonalLibraryStore((s) => s.addPhotoLabel)
  const offlineAdd = useQuickCaptureOfflineStore((s) => s.addCapture)

  const [step, setStep] = useState<'pick' | 'form' | 'success'>('pick')
  const [active, setActive] = useState<QuickCaptureActionId | null>(null)
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [wordWhere, setWordWhere] = useState('')
  const [wordHeardRead, setWordHeardRead] = useState<'' | 'heard' | 'read'>('')
  const [placeKind, setPlaceKind] = useState<SavedPlaceItem['kind']>('other')
  const [placeLocateBusy, setPlaceLocateBusy] = useState(false)
  const [placeLocateError, setPlaceLocateError] = useState<string | null>(null)
  const [struggleTags, setStruggleTags] = useState<string[]>([])
  const [voiceTitle, setVoiceTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [voiceFile, setVoiceFile] = useState<File | null>(null)
  const [voiceObjectUrl, setVoiceObjectUrl] = useState<string | null>(null)
  const [recState, setRecState] = useState<'idle' | 'recording' | 'stopped'>('idle')
  const [successDestTab, setSuccessDestTab] = useState<'saved' | 'places' | 'captured'>('saved')

  const photoInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const voicePickRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaChunksRef = useRef<BlobPart[]>([])
  const mediaStreamRef = useRef<MediaStream | null>(null)

  const reset = useCallback(() => {
    setStep('pick')
    setActive(null)
    setA('')
    setB('')
    setWordWhere('')
    setWordHeardRead('')
    setPlaceKind('other')
    setPlaceLocateBusy(false)
    setPlaceLocateError(null)
    setStruggleTags([])
    setVoiceTitle('')
    setPhotoFile(null)
    setVoiceFile(null)
    setRecState('idle')
    setBusy(false)
    mediaRecorderRef.current?.stop()
    mediaRecorderRef.current = null
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop())
    mediaStreamRef.current = null
    mediaChunksRef.current = []
  }, [])

  const fillPlaceFromDeviceLocation = useCallback(async () => {
    playAppSound('tap')
    setPlaceLocateError(null)
    setPlaceLocateBusy(true)
    try {
      const r = await fetchPlaceFromDeviceLocation()
      setA(r.label)
      setPlaceKind(r.suggestedKind)
    } catch (e) {
      setPlaceLocateError(e instanceof Error ? e.message : 'Could not resolve this location')
    } finally {
      setPlaceLocateBusy(false)
    }
  }, [])

  useEffect(() => {
    return () => {
      mediaRecorderRef.current?.stop()
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  useEffect(() => {
    if (!voiceFile) {
      setVoiceObjectUrl(null)
      return
    }
    const u = URL.createObjectURL(voiceFile)
    setVoiceObjectUrl(u)
    return () => {
      URL.revokeObjectURL(u)
    }
  }, [voiceFile])

  useEffect(() => {
    if (!open) return
    if (initialAction) {
      setActive(initialAction)
      setStep('form')
    } else {
      setStep('pick')
      setActive(null)
    }
  }, [open, initialAction])

  const handleClose = useCallback(() => {
    playAppSound('tap')
    reset()
    onClose()
  }, [onClose, reset])

  const toggleStruggleTag = useCallback((id: string) => {
    setStruggleTags((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }, [])

  const persistLocalLibrary = useCallback(() => {
    if (!active) return
    if (active === 'word' && a.trim()) {
      const hint = buildWordMemoryHint(wordWhere, wordHeardRead)
      addWord(a.trim(), undefined, hint)
    } else if (active === 'phrase' && a.trim()) {
      addPhrase(a.trim(), undefined, b.trim() || undefined)
    } else if (active === 'place' && a.trim()) {
      addPlace(a.trim(), placeKind)
    } else if (active === 'paste' && a.trim()) {
      const label = b.trim() || 'Pasted text'
      addPhotoLabel(label, a.slice(0, 200))
    } else if (active === 'problem' && a.trim()) {
      const tagLine =
        struggleTags.length > 0 ? `Tags: ${struggleTags.map((t) => t.replace(/_/g, ' ')).join(', ')}` : ''
      addMoment('Practice moment', [a.trim(), tagLine].filter(Boolean).join('\n\n'))
    } else if (active === 'photo' && (a.trim() || photoFile)) {
      addPhotoLabel(
        a.trim() || 'Photo',
        photoFile ? 'Photo saved — readable text fills in when you are online' : b.trim() || undefined,
      )
    }
  }, [
    active,
    a,
    b,
    addMoment,
    addPhrase,
    addPhotoLabel,
    addPlace,
    addWord,
    photoFile,
    placeKind,
    struggleTags,
    wordHeardRead,
    wordWhere,
  ])

  const saveCapture = useCallback(async () => {
    if (!active) return
    const backend = isFeature1ChatBackendEnabled()
    const localDate = quickCaptureClient.localDateYmd()
    const capType = mapQuickCaptureActionToApiType(active)

    let bodyPrimary: string | null = null
    let bodySecondary: string | null = null
    let title: string | null = null
    let placeKindApi: string | null = null
    let transcript: string | null = null
    let finalRaw:
      | { imageBase64: string; imageMimeType: string }
      | { voiceAudioBase64: string; voiceMimeType: string }
      | undefined

    if (active === 'word') {
      bodyPrimary = a.trim() || null
      bodySecondary = buildWordMemoryHint(wordWhere, wordHeardRead) ?? null
    } else if (active === 'phrase') {
      bodyPrimary = a.trim() || null
      bodySecondary = b.trim() || null
    } else if (active === 'place') {
      bodyPrimary = a.trim() || null
      placeKindApi = placeKind
    } else if (active === 'paste') {
      bodyPrimary = a.trim() || null
      title = b.trim() || null
    } else if (active === 'photo') {
      bodySecondary = null
      if (photoFile) {
        const b64 = await blobToBase64(photoFile)
        finalRaw = { imageBase64: b64, imageMimeType: photoFile.type || 'image/jpeg' }
        title = a.trim() || photoFile.name || 'Photo'
      } else {
        bodyPrimary = a.trim() || null
        title = a.trim() || null
      }
    } else if (active === 'problem') {
      title = 'Practice moment'
      bodyPrimary = a.trim() || null
      bodySecondary = struggleTags.length ? `tags:${struggleTags.join(',')}` : null
    } else if (active === 'voice') {
      title = voiceTitle.trim() || 'Voice note'
      const contextLine = b.trim() || null
      const typedBackup = a.trim() || null
      bodySecondary = [contextLine, typedBackup].filter(Boolean).join(' — ') || null
      bodyPrimary = null
      transcript = null
      if (voiceFile) {
        const b64 = await blobToBase64(voiceFile)
        finalRaw = { voiceAudioBase64: b64, voiceMimeType: voiceFile.type || 'audio/webm' }
        if (backend) {
          transcript = typedBackup || null
        } else {
          try {
            const tr = await transcribeSpeechAudio({
              audioBase64: b64,
              mimeType: voiceFile.type || 'audio/webm',
              language: 'nl',
              purpose: 'quick_capture_voice',
            })
            transcript = tr.text?.trim() || null
            if (transcript) bodyPrimary = transcript
          } catch {
            transcript = null
          }
          if (!bodyPrimary?.trim()) {
            bodyPrimary = typedBackup || 'Voice note — transcription unavailable offline.'
          }
        }
      } else if (typedBackup) {
        bodyPrimary = typedBackup
      }
    }

    if (backend) {
      const created = await quickCaptureClient.create({
        captureType: capType,
        title,
        bodyPrimary,
        bodySecondary,
        localCaptureDate: localDate,
        placeKind: placeKindApi,
        imageMime: photoFile?.type ?? null,
        raw: finalRaw,
        transcript: transcript ?? undefined,
      })
      recordQuickCaptureMeaningfulBonus({
        userId: getRetentionUserId(),
        captureId: created.id,
        captureType: capType,
        bodyPrimary,
        bodySecondary,
        transcript,
        rawJson: finalRaw ? JSON.stringify(finalRaw) : null,
      })
    } else {
      const row = offlineAdd({
        captureType: capType,
        title,
        bodyPrimary,
        bodySecondary,
        localCaptureDate: localDate,
        placeKind: placeKindApi,
        imageMime: photoFile?.type ?? null,
        rawJson: finalRaw ? JSON.stringify(finalRaw) : null,
        transcript,
      })
      recordQuickCaptureMeaningfulBonus({
        userId: getRetentionUserId(),
        captureId: row.id,
        captureType: capType,
        bodyPrimary: row.bodyPrimary,
        bodySecondary: row.bodySecondary,
        transcript: row.transcript,
        rawJson: row.rawJson,
      })
      persistLocalLibrary()
    }
  }, [
    a,
    active,
    b,
    offlineAdd,
    persistLocalLibrary,
    photoFile,
    placeKind,
    struggleTags,
    voiceFile,
    voiceTitle,
    wordHeardRead,
    wordWhere,
  ])

  const computeDestTab = useCallback((): 'saved' | 'places' | 'captured' => {
    if (!active) return 'saved'
    const backend = isFeature1ChatBackendEnabled()
    // Offline: words/phrases also go into the personal bank (Saved tab). Online: they only exist as Quick Captures (Collection).
    if (active === 'problem' || active === 'photo' || active === 'paste' || active === 'voice') return 'captured'
    if (active === 'place') return 'places'
    if ((active === 'word' || active === 'phrase') && backend) return 'captured'
    return 'saved'
  }, [active])

  const submitSave = useCallback(async () => {
    playAppSound('library_save')
    setBusy(true)
    try {
      await saveCapture()
      setSuccessDestTab(computeDestTab())
      setStep('success')
    } catch {
      /* stay on form; network or validation */
    } finally {
      setBusy(false)
    }
  }, [computeDestTab, saveCapture])

  const startRecording = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream
      mediaChunksRef.current = []
      const preferred =
        typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm'
      const mr = new MediaRecorder(stream, { mimeType: preferred })
      mediaRecorderRef.current = mr
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) mediaChunksRef.current.push(e.data)
      }
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(mediaChunksRef.current, { type: mr.mimeType || 'audio/webm' })
        setVoiceFile(new File([blob], `voice-${Date.now()}.webm`, { type: mr.mimeType || 'audio/webm' }))
        setRecState('stopped')
        mediaStreamRef.current = null
        mediaRecorderRef.current = null
      }
      mr.start(200)
      setRecState('recording')
      playAppSound('tap')
    } catch {
      playAppSound('tap')
    }
  }, [])

  const stopRecording = useCallback(() => {
    const mr = mediaRecorderRef.current
    if (mr && mr.state !== 'inactive') {
      mr.stop()
    }
    playAppSound('tap')
  }, [])

  if (!open) return null

  const canSubmit =
    Boolean(active) &&
    !busy &&
    (() => {
      if (!active) return false
      if (active === 'voice')
        return recState !== 'recording' && (Boolean(voiceFile) || Boolean(a.trim()))
      if (active === 'photo') return Boolean(photoFile) || Boolean(a.trim())
      if (active === 'paste' || active === 'problem') return Boolean(a.trim())
      return Boolean(a.trim())
    })()

  const fromYourDayHref = `${APP_LIBRARY_FROM_YOUR_DAY}?date=${encodeURIComponent(quickCaptureClient.localDateYmd())}`

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col justify-end bg-black/40 backdrop-blur-[2px]"
      role="dialog"
      aria-modal
      aria-label="Save a moment"
    >
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close" onClick={handleClose} />
      <div
        className={clsx(
          'relative max-w-lg mx-auto w-full rounded-t-2xl bg-surface-elevated shadow-2xl border-t border-x border-slate-200/90',
          'max-h-[min(88dvh,640px)] flex flex-col motion-safe:translate-y-0 motion-safe:opacity-100',
        )}
      >
        <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-100 text-primary-800 shrink-0">
              <Plus className="w-5 h-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-body-sm font-bold text-ink-primary">Save a moment</p>
              <p className="text-caption text-ink-secondary truncate">In Library — practice when you are ready</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="min-h-touch min-w-touch flex items-center justify-center rounded-xl hover:bg-surface-muted"
            aria-label="Close sheet"
          >
            <X className="w-5 h-5 text-ink-secondary" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {step === 'success' ? (
            <div className="flex flex-col items-center py-6 text-center space-y-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                <Check className="h-7 w-7" strokeWidth={2.5} aria-hidden />
              </span>
              <div>
                <p className="text-body font-semibold text-ink-primary">Saved from your life</p>
                <p className="mt-1 text-caption text-ink-secondary leading-relaxed max-w-xs mx-auto">
                  {successDestTab === 'captured'
                    ? 'Open the Collection tab in Library — that is where this save lives. The Saved list is for words you bookmark from chat.'
                    : 'It sits quietly in Library. When you are ready, turn today into a short practice.'}
                </p>
              </div>
              <div className="w-full max-w-sm space-y-3 pt-1">
                <Link
                  href={fromYourDayHref}
                  onClick={() => {
                    playAppSound('tap')
                    reset()
                    onClose()
                  }}
                  className="flex min-h-touch w-full items-center justify-center rounded-2xl bg-primary-600 px-4 py-3 text-body-sm font-semibold text-white shadow-sm hover:bg-primary-700 transition-colors"
                >
                  Practice what happened today
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    playAppSound('tap')
                    reset()
                    onClose()
                    router.push(`${APP_LIBRARY_HUB}?tab=${successDestTab}`)
                  }}
                  className="w-full py-2 text-caption font-semibold text-primary-800 min-h-touch underline-offset-2 hover:underline"
                >
                  {successDestTab === 'captured' ? 'Open Collection in Library' : 'Open Library'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playAppSound('tap')
                    reset()
                    setStep('pick')
                    setActive(null)
                  }}
                  className="w-full py-2 text-caption font-medium text-ink-tertiary min-h-touch"
                >
                  Save another
                </button>
              </div>
            </div>
          ) : null}

          {step === 'pick' ? (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 list-none p-0 m-0">
              {QUICK_CAPTURE_ACTIONS.map((item) => {
                const Icon = ICONS[item.id]
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => {
                        playAppSound('tap')
                        setActive(item.id)
                        setStep('form')
                      }}
                      className="w-full text-left rounded-2xl border border-slate-200/90 bg-surface-muted/30 p-3 min-h-touch transition-colors hover:border-primary-200 hover:bg-primary-50/20"
                    >
                      <div className="flex items-start gap-2">
                        <Icon className="w-5 h-5 text-primary-700 shrink-0 mt-0.5" aria-hidden />
                        <span>
                          <span className="block text-body-sm font-semibold text-ink-primary">{item.label}</span>
                          <span className="block text-caption text-ink-secondary mt-0.5">{item.desc}</span>
                        </span>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : null}

          {step === 'form' && active ? (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  playAppSound('tap')
                  setStep('pick')
                  setActive(null)
                  setA('')
                  setB('')
                  setWordWhere('')
                  setWordHeardRead('')
                  setPlaceKind('other')
                  setPlaceLocateBusy(false)
                  setPlaceLocateError(null)
                  setStruggleTags([])
                  setVoiceTitle('')
                  setPhotoFile(null)
                  setVoiceFile(null)
                  setRecState('idle')
                }}
                className="text-caption font-semibold text-primary-700 min-h-touch py-1"
              >
                ← Back
              </button>

              {active === 'word' ? (
                <>
                  <label className="block text-caption font-medium text-ink-secondary">Word</label>
                  <Input value={a} onChange={(e) => setA(e.target.value)} placeholder="Dutch word" autoFocus />
                  <label className="block text-caption font-medium text-ink-secondary mt-2">
                    Where did you see or hear it? <span className="font-normal text-ink-tertiary">(optional)</span>
                  </label>
                  <Input value={wordWhere} onChange={(e) => setWordWhere(e.target.value)} placeholder="e.g. NS app, checkout" />
                  <p className="text-caption font-medium text-ink-secondary mt-2">Heard or read?</p>
                  <div className="flex rounded-xl border border-slate-200 p-0.5 bg-surface-muted/40">
                    {(['', 'heard', 'read'] as const).map((key) => (
                      <button
                        key={key || 'any'}
                        type="button"
                        onClick={() => setWordHeardRead(key === '' ? '' : key)}
                        className={clsx(
                          'flex-1 rounded-lg py-2 text-caption font-semibold transition-colors min-h-touch',
                          wordHeardRead === key ? 'bg-white text-primary-800 shadow-sm' : 'text-ink-secondary',
                        )}
                      >
                        {key === '' ? 'Skip' : key === 'heard' ? 'Heard' : 'Read'}
                      </button>
                    ))}
                  </div>
                  <p className="text-caption text-ink-tertiary leading-relaxed">
                    Where you saw it and heard/read are optional, but they are saved with the word. After you save, the
                    server uses them together to suggest meaning, setting, and practice — especially when the word on
                    its own could mean several things.
                  </p>
                </>
              ) : null}

              {active === 'phrase' ? (
                <>
                  <label className="block text-caption font-medium text-ink-secondary">Phrase</label>
                  <textarea
                    value={a}
                    onChange={(e) => setA(e.target.value)}
                    className="w-full min-h-[96px] rounded-xl border border-slate-200 px-3 py-2 text-body-sm"
                    placeholder="Dutch phrase you want to keep"
                    autoFocus
                  />
                  <label className="block text-caption font-medium text-ink-secondary mt-1">
                    Context <span className="font-normal text-ink-tertiary">(optional)</span>
                  </label>
                  <Input value={b} onChange={(e) => setB(e.target.value)} placeholder="Where or how you’d use it" />
                  <p className="text-caption text-ink-tertiary leading-relaxed">
                    Optional context is stored with the phrase. After you save, the server uses it to shape likely
                    situation and practice suggestions.
                  </p>
                </>
              ) : null}

              {active === 'place' ? (
                <>
                  <label className="block text-caption font-medium text-ink-secondary">Place</label>
                  <Input value={a} onChange={(e) => setA(e.target.value)} placeholder="Name or area" autoFocus />
                  <Button
                    type="button"
                    variant="secondary"
                    fullWidth
                    className="mt-2"
                    disabled={placeLocateBusy || busy}
                    onClick={() => void fillPlaceFromDeviceLocation()}
                  >
                    <span className="inline-flex items-center justify-center gap-2">
                      <LocateFixed className="h-4 w-4 shrink-0" aria-hidden />
                      {placeLocateBusy ? 'Finding place…' : 'Use my location'}
                    </span>
                  </Button>
                  {placeLocateError ? (
                    <p className="text-caption text-red-600 leading-snug">{placeLocateError}</p>
                  ) : null}
                  <p className="text-caption text-ink-tertiary leading-snug">
                    Suggests a nearby name and category from OpenStreetMap. Allow location when prompted — you can
                    edit before saving.
                  </p>
                  <p className="text-caption font-medium text-ink-secondary mt-2">
                    Category <span className="font-normal text-ink-tertiary">(optional)</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {PLACE_CHIPS.map((chip) => (
                      <button
                        key={chip.id}
                        type="button"
                        onClick={() => setPlaceKind(chip.id)}
                        className={clsx(
                          'rounded-full border px-3 py-1.5 text-caption font-medium transition-colors min-h-touch',
                          placeKind === chip.id
                            ? 'border-primary-400 bg-primary-50 text-primary-900'
                            : 'border-slate-200 bg-white text-ink-secondary hover:border-slate-300',
                        )}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </>
              ) : null}

              {active === 'photo' ? (
                <>
                  <p className="text-caption text-ink-secondary leading-relaxed">
                    Snap or upload — readable text appears when you are online. A short label is optional; if the shot
                    is blurry or has almost no text, the label is saved with the image so the server can still infer
                    context and practice ideas after you save.
                  </p>
                  <label className="block text-caption font-medium text-ink-secondary">Label</label>
                  <Input value={a} onChange={(e) => setA(e.target.value)} placeholder="Menu, sign, letter…" />
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                  />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Button type="button" variant="secondary" fullWidth onClick={() => cameraInputRef.current?.click()}>
                      Camera
                    </Button>
                    <Button type="button" variant="secondary" fullWidth onClick={() => photoInputRef.current?.click()}>
                      Upload
                    </Button>
                  </div>
                  {photoFile ? (
                    <p className="text-caption text-ink-secondary">Attached: {photoFile.name}</p>
                  ) : null}
                </>
              ) : null}

              {active === 'paste' ? (
                <>
                  <label className="block text-caption font-medium text-ink-secondary">Text</label>
                  <textarea
                    value={a}
                    onChange={(e) => setA(e.target.value)}
                    className="w-full min-h-[100px] rounded-xl border border-slate-200 px-3 py-2 text-body-sm"
                    placeholder="Paste here"
                    autoFocus
                  />
                  <label className="block text-caption font-medium text-ink-secondary mt-1">
                    Source <span className="font-normal text-ink-tertiary">(optional)</span>
                  </label>
                  <Input value={b} onChange={(e) => setB(e.target.value)} placeholder="Email subject, app name…" />
                </>
              ) : null}

              {active === 'problem' ? (
                <>
                  <label className="block text-caption font-medium text-ink-secondary">What happened?</label>
                  <textarea
                    value={a}
                    onChange={(e) => setA(e.target.value)}
                    className="w-full min-h-[88px] rounded-xl border border-slate-200 px-3 py-2 text-body-sm"
                    placeholder="One or two sentences is enough"
                    autoFocus
                  />
                  <p className="text-caption font-medium text-ink-secondary mt-2">
                    Tags <span className="font-normal text-ink-tertiary">(optional)</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {STRUGGLE_TAGS.map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleStruggleTag(tag.id)}
                        className={clsx(
                          'rounded-full border px-3 py-1.5 text-caption font-medium transition-colors min-h-touch',
                          struggleTags.includes(tag.id)
                            ? 'border-amber-400 bg-amber-50 text-amber-950'
                            : 'border-slate-200 bg-white text-ink-secondary hover:border-slate-300',
                        )}
                      >
                        {tag.label}
                      </button>
                    ))}
                  </div>
                </>
              ) : null}

              {active === 'voice' ? (
                <>
                  <p className="text-caption text-ink-secondary leading-relaxed">
                    Say what happened in Dutch (or your mix). Listen back before you save — delete and try again anytime.
                    Typed lines are optional hints if the mic was noisy. After you save, the server turns the audio into text
                    and adds a short read of context, useful words, and grammar — speaker guesses come from that text only, not
                    from separating voices on the recording.
                  </p>
                  <div className="flex flex-col gap-2">
                    {recState === 'recording' ? (
                      <Button type="button" variant="primary" fullWidth onClick={stopRecording} className="gap-2">
                        <Square className="h-4 w-4 shrink-0" aria-hidden />
                        Stop recording
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="secondary"
                        fullWidth
                        onClick={() => void startRecording()}
                        disabled={Boolean(voiceFile)}
                        className="gap-2"
                      >
                        <Mic className="h-4 w-4 shrink-0" aria-hidden />
                        Start recording
                      </Button>
                    )}
                    <input
                      ref={voicePickRef}
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={(e) => {
                        setVoiceFile(e.target.files?.[0] ?? null)
                        setRecState('stopped')
                      }}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      fullWidth
                      onClick={() => voicePickRef.current?.click()}
                      disabled={recState === 'recording'}
                    >
                      {voiceFile && recState !== 'recording' ? `Attached file: ${voiceFile.name}` : 'Upload audio file'}
                    </Button>
                  </div>
                  {voiceFile && recState !== 'recording' && voiceObjectUrl ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Listen back</p>
                      <audio src={voiceObjectUrl} controls className="w-full h-10" />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            playAppSound('tap')
                            setVoiceFile(null)
                            setRecState('idle')
                          }}
                          className="gap-1.5"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          Delete recording
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            playAppSound('tap')
                            setVoiceFile(null)
                            setRecState('idle')
                            void startRecording()
                          }}
                          className="gap-1.5"
                        >
                          <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                          Retry
                        </Button>
                      </div>
                    </div>
                  ) : null}
                  <label className="block text-caption font-medium text-ink-secondary mt-2">
                    Title <span className="font-normal text-ink-tertiary">(optional)</span>
                  </label>
                  <Input value={voiceTitle} onChange={(e) => setVoiceTitle(e.target.value)} placeholder="e.g. At the desk" />
                  <label className="block text-caption font-medium text-ink-secondary mt-1">
                    Context <span className="font-normal text-ink-tertiary">(optional)</span>
                  </label>
                  <Input value={b} onChange={(e) => setB(e.target.value)} placeholder="What this was about" />
                  <label className="block text-caption font-medium text-ink-secondary mt-2">
                    What you said <span className="font-normal text-ink-tertiary">(optional)</span>
                  </label>
                  <textarea
                    value={a}
                    onChange={(e) => setA(e.target.value)}
                    className="w-full min-h-[72px] rounded-xl border border-slate-200 px-3 py-2 text-body-sm"
                    placeholder={
                      isFeature1ChatBackendEnabled()
                        ? 'If you already know the words, type them here — helps when it was loud.'
                        : 'We transcribe on your device offline; tweak the line here if needed.'
                    }
                  />
                </>
              ) : null}

              <div className="flex flex-col gap-2 pt-2">
                <Button variant="primary" fullWidth onClick={() => void submitSave()} disabled={!canSubmit}>
                  {busy ? 'Saving…' : 'Save to Library'}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
