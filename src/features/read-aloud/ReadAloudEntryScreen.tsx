'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { BookOpen, Bookmark, Camera, Sparkles, Type, Wand2 } from 'lucide-react'
import { playAppSound } from '@/lib/interaction/appSounds'
import { clsx } from 'clsx'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { APP_READ_ALOUD_SESSION, APP_SPEAK_LIVE, APP_TALK_SKILLS } from '@/lib/routing/appRoutes'
import { isFeature1ChatBackendEnabled } from '@/lib/api/apiConfig'
import { conversationClient } from '@/lib/api/conversationClient'
import { ApiRequestError } from '@/lib/api/apiErrors'
import {
  isReadAloudPersonalizationProfileId,
  readAloudGeneratePassage,
  readAloudOcr,
  type ReadAloudGenre,
  type ReadAloudPassagePersonalizationProfileId,
} from './readAloudApi'
import {
  addSavedDrill,
  READ_ALOUD_PREFILL_GENERATE_KEY,
  saveReadAloudSession,
  type ReadAloudSessionPayload,
  type ReadAloudTextSource,
} from './readAloudStorage'
import { readAloudEntrySkillChips } from '@/features/talk/talkSkillSurfaces'
import { TalkSkillSignalRow } from '@/features/talk/TalkSkillSignalRow'

const MIN_LEN = 48
const MAX_LEN = 11_000

const GENRES: Array<{ id: ReadAloudGenre; label: string }> = [
  { id: 'everyday_conversation', label: 'Everyday conversation' },
  { id: 'story', label: 'Story' },
  { id: 'news_style', label: 'News-style' },
  { id: 'travel', label: 'Travel' },
  { id: 'work', label: 'Work' },
  { id: 'practical_instructions', label: 'Practical instructions' },
  { id: 'social_chat', label: 'Social chat' },
  { id: 'description', label: 'Description' },
  { id: 'opinion', label: 'Opinion' },
  { id: 'custom_topic', label: 'Custom topic' },
]

type SourceTab = 'manual' | 'photo' | 'generated'

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onloadend = () => {
      const s = r.result
      if (typeof s !== 'string') {
        reject(new Error('read failed'))
        return
      }
      const comma = s.indexOf(',')
      resolve(comma >= 0 ? s.slice(comma + 1) : s)
    }
    r.onerror = () => reject(r.error ?? new Error('read failed'))
    r.readAsDataURL(file)
  })
}

export function ReadAloudEntryScreen() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const readAloudProfileQuery = searchParams.get('readAloudProfile')?.trim() ?? ''
  const [tab, setTab] = useState<SourceTab>('manual')
  const [cefrLevel, setCefrLevel] = useState<'A1' | 'A2' | 'B1' | 'B2'>('A2')
  const [lineFocus, setLineFocus] = useState(false)

  const [manualText, setManualText] = useState('')
  const [photoExtracted, setPhotoExtracted] = useState('')
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoErr, setPhotoErr] = useState<string | null>(null)
  const [photoOcrMeta, setPhotoOcrMeta] = useState<{
    confidence: number | null
    warnings: string[]
    partial: boolean
    detail: string | null
  } | null>(null)
  const [photoReviewConfirmed, setPhotoReviewConfirmed] = useState(false)

  const [genGenre, setGenGenre] = useState<ReadAloudGenre>('everyday_conversation')
  const [genTopic, setGenTopic] = useState('')
  const [genLength, setGenLength] = useState<'short' | 'medium' | 'long'>('medium')
  const [genBusy, setGenBusy] = useState(false)
  const [genErr, setGenErr] = useState<string | null>(null)
  const [genTitle, setGenTitle] = useState<string | null>(null)
  /** True after a successful generate in this session (drives preview panel on Generate tab). */
  const [genPassageReady, setGenPassageReady] = useState(false)
  const [genSavedHint, setGenSavedHint] = useState<string | null>(null)
  /** Server-returned labels after generate-passage (profile-grounded passage). */
  const [genPersonalizationChips, setGenPersonalizationChips] = useState<string[] | null>(null)

  const profileRecsQuery = useQuery({
    queryKey: ['talk', 'continue'],
    queryFn: () => conversationClient.getContinueConversation(),
    enabled: isFeature1ChatBackendEnabled(),
    staleTime: 15_000,
  })
  const readAloudProfileRec = useMemo(() => {
    const lf = profileRecsQuery.data?.learningFocus
    if (!lf || lf.coldStart) return null
    return lf.recommendations?.find((r) => r.type === 'read_aloud_profile') ?? null
  }, [profileRecsQuery.data])

  const readAloudQueryProfile = useMemo((): ReadAloudPassagePersonalizationProfileId | undefined => {
    if (!readAloudProfileQuery || !isReadAloudPersonalizationProfileId(readAloudProfileQuery)) return undefined
    return readAloudProfileQuery
  }, [readAloudProfileQuery])

  const readAloudPersonalizationOverride = useMemo((): ReadAloudPassagePersonalizationProfileId | undefined => {
    if (readAloudQueryProfile) return readAloudQueryProfile
    const id = readAloudProfileRec?.targetId
    if (!id || !isReadAloudPersonalizationProfileId(id)) return undefined
    return id
  }, [readAloudQueryProfile, readAloudProfileRec?.targetId])

  const manualPhotoProfileChips = useMemo(() => {
    const lf = profileRecsQuery.data?.learningFocus
    if (!lf || lf.coldStart || !isFeature1ChatBackendEnabled()) return []
    const chips: string[] = []
    if (lf.workingOnChip?.trim()) chips.push(lf.workingOnChip.trim())
    const t = readAloudProfileRec?.title?.trim()
    if (t && !chips.includes(t)) chips.push(t)
    const because = lf.recommendedBecause?.trim()
    if (because && chips.length < 2 && !chips.includes(because)) chips.push(because)
    return chips.slice(0, 3)
  }, [profileRecsQuery.data?.learningFocus, readAloudProfileRec?.title])

  const readAloudSkillChips = useMemo(() => {
    const lf = profileRecsQuery.data?.learningFocus
    if (!lf || lf.coldStart) return []
    return readAloudEntrySkillChips(lf.skillsPreview, 2)
  }, [profileRecsQuery.data?.learningFocus])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = sessionStorage.getItem(READ_ALOUD_PREFILL_GENERATE_KEY)
      if (!raw) return
      sessionStorage.removeItem(READ_ALOUD_PREFILL_GENERATE_KEY)
      const o = JSON.parse(raw) as { level?: string; genre?: string }
      const levels = ['A1', 'A2', 'B1', 'B2'] as const
      if (o.level && levels.includes(o.level as (typeof levels)[number])) {
        setCefrLevel(o.level as (typeof levels)[number])
      }
      if (o.genre && GENRES.some((g) => g.id === o.genre)) {
        setGenGenre(o.genre as ReadAloudGenre)
        setTab('generated')
      }
    } catch {
      /* ignore */
    }
  }, [])

  const activeText = useMemo(() => {
    if (tab === 'manual') return manualText
    if (tab === 'photo') return photoExtracted
    return manualText
  }, [manualText, photoExtracted, tab])

  const charCount = activeText.length
  const photoNeedsConfirm = tab === 'photo' && photoOcrMeta != null && !photoReviewConfirmed
  const validationErr = useMemo(() => {
    const t = activeText.trim()
    if (t.length < MIN_LEN) return `Use at least ${MIN_LEN} characters for a useful reading.`
    if (t.length > MAX_LEN) return `Keep the passage under ${MAX_LEN} characters.`
    return null
  }, [activeText])

  const start = useCallback(() => {
    const text = activeText.replace(/\r\n/g, '\n').trim()
    if (text.length < MIN_LEN || text.length > MAX_LEN) return
    if (tab === 'photo' && photoOcrMeta != null && !photoReviewConfirmed) return
    playAppSound('tap')
    const source: ReadAloudTextSource = tab === 'manual' ? 'manual' : tab === 'photo' ? 'photo' : 'generated'
    const payload: ReadAloudSessionPayload = {
      targetText: text,
      title: genTitle,
      cefrLevel,
      source,
      genre: tab === 'generated' ? genGenre : null,
      lineFocus,
      createdAt: new Date().toISOString(),
    }
    saveReadAloudSession(payload)
    router.push(APP_READ_ALOUD_SESSION)
  }, [activeText, cefrLevel, genGenre, genTitle, lineFocus, photoOcrMeta, photoReviewConfirmed, router, tab])

  const onPickImage = async (file: File | null) => {
    if (!file) return
    setPhotoErr(null)
    setPhotoReviewConfirmed(false)
    setPhotoOcrMeta(null)
    const maxBytes = 10 * 1024 * 1024
    if (file.size > maxBytes) {
      setPhotoErr('This photo is too large. Choose an image under about 10 MB, or lower your camera resolution.')
      return
    }
    const mime = (file.type || '').toLowerCase()
    if (mime.includes('heic') || mime.includes('heif')) {
      setPhotoErr(
        'HEIC photos are not supported for automatic text extraction. In your camera settings, save as “Most compatible” (JPEG) or export the photo as JPEG/PNG and upload again.'
      )
      return
    }
    setPhotoBusy(true)
    try {
      const b64 = await fileToBase64(file)
      const mimeType = file.type || 'image/jpeg'
      const res = await readAloudOcr({ imageBase64: b64, mimeType })
      setPhotoExtracted(res.text)
      setManualText(res.text)
      setPhotoOcrMeta({
        confidence: res.confidence,
        warnings: res.warnings ?? [],
        partial: res.partial,
        detail: res.detail,
      })
      setPhotoReviewConfirmed(false)
      if (res.detail && !res.warnings?.length) {
        setPhotoErr(null)
      }
    } catch (e) {
      setPhotoOcrMeta(null)
      setPhotoReviewConfirmed(false)
      if (e instanceof ApiRequestError) {
        setPhotoErr(e.message)
      } else {
        setPhotoErr(e instanceof Error ? e.message : 'Text extraction did not complete. Try another photo.')
      }
    } finally {
      setPhotoBusy(false)
    }
  }

  const runGenerate = async () => {
    setGenErr(null)
    setGenSavedHint(null)
    setGenPersonalizationChips(null)
    if (genGenre === 'custom_topic' && !genTopic.trim()) {
      setGenErr('Add a short topic for a custom passage (a few words is enough).')
      return
    }
    setGenBusy(true)
    try {
      const usePersonalization = isFeature1ChatBackendEnabled()
      const res = await readAloudGeneratePassage({
        level: cefrLevel,
        genre: genGenre,
        topic: genGenre === 'custom_topic' ? genTopic.trim() || null : genTopic.trim() || null,
        length: genLength,
        usePersonalization,
        ...(usePersonalization && readAloudPersonalizationOverride
          ? { personalizationProfile: readAloudPersonalizationOverride }
          : {}),
      })
      setGenTitle(res.title)
      setManualText(res.passage)
      setGenPassageReady(true)
      setGenPersonalizationChips(res.personalization?.chips?.length ? res.personalization.chips : null)
    } catch (e) {
      setGenErr(e instanceof Error ? e.message : 'Generation failed.')
    } finally {
      setGenBusy(false)
    }
  }

  const saveGeneratedPassage = () => {
    const body = manualText.trim()
    if (!body) return
    playAppSound('tap')
    const label = GENRES.find((g) => g.id === genGenre)?.label ?? genGenre
    addSavedDrill({
      kind: 'passage',
      title: genTitle?.trim() || `Read aloud — ${label}`,
      content: body,
    })
    setGenSavedHint('Saved on this device for later practice.')
    window.setTimeout(() => setGenSavedHint(null), 4500)
  }

  return (
    <div className="space-y-6 pb-28">
      <Link
        href={APP_SPEAK_LIVE}
        className="inline-flex min-h-touch items-center rounded-full border border-slate-200/80 bg-white/90 px-3 py-2 text-caption font-semibold text-primary-700 shadow-sm hover:bg-white"
      >
        ← Speak
      </Link>

      <header className="space-y-3">
        <p className="text-caption font-semibold text-violet-700 uppercase tracking-[0.12em]">Studio mode</p>
        <h1 className="text-title font-bold text-ink-primary tracking-tight">Read Aloud</h1>
        <p className="text-body-sm text-ink-secondary leading-relaxed max-w-xl">
          Read text out loud and get detailed feedback on pronunciation, pacing, clarity, and delivery — with a clear
          comparison to what you intended to say.
        </p>
        {readAloudSkillChips.length > 0 ? (
          <div className="max-w-xl space-y-2">
            <TalkSkillSignalRow chips={readAloudSkillChips} />
            <p className="text-caption text-ink-tertiary">
              <Link href={APP_TALK_SKILLS} className="font-semibold text-violet-700 underline-offset-2 hover:underline">
                View full skills
              </Link>
            </p>
          </div>
        ) : null}
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        {(
          [
            { id: 'manual' as const, label: 'Enter text', icon: Type, desc: 'Paste or type' },
            { id: 'photo' as const, label: 'Photo → text', icon: Camera, desc: 'Upload or snap' },
            { id: 'generated' as const, label: 'Generate', icon: Wand2, desc: 'Level + genre' },
          ] as const
        ).map((x) => (
          <button
            key={x.id}
            type="button"
            onClick={() => {
              playAppSound('tap')
              setTab(x.id)
              if (x.id !== 'generated') {
                setGenPersonalizationChips(null)
              }
              if (x.id !== 'photo') {
                setPhotoErr(null)
              }
            }}
            className={clsx(
              'flex min-h-touch items-start gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all',
              tab === x.id
                ? 'border-violet-400 bg-white shadow-[0_16px_36px_-28px_rgba(99,102,241,0.65)]'
                : 'border-slate-200/90 bg-white/80 hover:border-violet-200'
            )}
          >
            <x.icon className="mt-0.5 h-[1.125rem] w-[1.125rem] shrink-0 text-violet-700" aria-hidden />
            <span className="min-w-0 flex flex-col gap-1.5">
              <span className="text-body-sm font-semibold leading-snug text-ink-primary">{x.label}</span>
              <span className="text-caption font-medium leading-snug text-ink-tertiary">{x.desc}</span>
            </span>
          </button>
        ))}
      </div>

      <Card variant="outlined" className="rounded-[1.75rem] border-slate-200/90 bg-white/95 p-5 shadow-sm space-y-4">
        {tab === 'manual' ? (
          <div className="space-y-2">
            <label className="text-caption font-semibold text-ink-primary" htmlFor="read-aloud-text">
              Your passage
            </label>
            <p className="text-caption text-ink-tertiary">Paste or type the text you want to practice reading aloud.</p>
            {manualPhotoProfileChips.length > 0 ? (
              <div className="flex flex-wrap gap-2" aria-label="Learning profile hints">
                {manualPhotoProfileChips.map((c) => (
                  <span
                    key={c}
                    className="inline-flex max-w-full items-center rounded-full border border-slate-200/90 bg-slate-50/90 px-2.5 py-1 text-caption font-medium text-ink-secondary"
                  >
                    <span className="truncate">{c}</span>
                  </span>
                ))}
              </div>
            ) : null}
            <textarea
              id="read-aloud-text"
              value={manualText}
              onChange={(e) => {
                const v = e.target.value
                setManualText(v)
                if (!v.trim()) setGenPassageReady(false)
              }}
              rows={12}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-body-sm leading-relaxed text-ink-primary placeholder:text-ink-tertiary focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
              placeholder="Bijvoorbeeld een kort nieuwsbericht of een briefje dat je zelf hebt geschreven…"
            />
          </div>
        ) : null}

        {tab === 'photo' ? (
          <div className="space-y-4">
            <p className="text-body-sm text-ink-secondary">
              Take or upload a <strong>straight-on</strong> photo of <strong>printed</strong> text (JPEG or PNG
              works best). We extract text on the server — you then <strong>review and edit</strong> it. Nothing is sent
              to read-aloud scoring until you confirm the final wording.
            </p>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-body-sm font-semibold text-ink-primary hover:border-violet-300">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
                  className="hidden"
                  onChange={(e) => void onPickImage(e.target.files?.[0] ?? null)}
                />
                Upload image
              </label>
              <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-body-sm font-semibold text-violet-950 hover:bg-violet-100">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => void onPickImage(e.target.files?.[0] ?? null)}
                />
                Take photo
              </label>
            </div>
            {photoBusy ? (
              <p className="text-caption font-medium text-violet-800">Extracting text on the server…</p>
            ) : null}
            {photoErr ? (
              <div
                role="alert"
                className="rounded-2xl border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-caption text-amber-950"
              >
                {photoErr}
              </div>
            ) : null}

            {photoOcrMeta ? (
              <div className="space-y-3 rounded-2xl border border-violet-200/80 bg-violet-50/40 px-4 py-4">
                <p className="text-caption font-semibold uppercase tracking-wide text-violet-900">Review extracted text</p>
                {photoOcrMeta.confidence != null ? (
                  <p className="text-body-sm text-ink-secondary">
                    Estimated read quality from the photo:{' '}
                    <span className="font-semibold text-ink-primary">
                      {Math.round(Math.max(0, Math.min(1, photoOcrMeta.confidence)) * 100)}%
                    </span>
                    {photoOcrMeta.confidence < 0.65
                      ? ' — scores on the low side; expect mistakes below.'
                      : ' — higher is sharper alignment with the pixels.'}
                  </p>
                ) : (
                  <p className="text-body-sm text-ink-tertiary">
                    Confidence scores were not returned for this image; please read the extract carefully anyway.
                  </p>
                )}
                {photoOcrMeta.detail ? <p className="text-caption text-violet-950/90">{photoOcrMeta.detail}</p> : null}
                {photoOcrMeta.warnings.length > 0 ? (
                  <ul className="list-inside list-disc space-y-1 text-caption text-amber-950">
                    {photoOcrMeta.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-2">
              <label className="text-caption font-semibold text-ink-primary" htmlFor="read-aloud-ocr">
                Your reading text (edit here)
              </label>
              <p className="text-caption text-ink-tertiary">
                Remove junk lines, fix punctuation, and correct any misread words. This is exactly what will be scored —
                not the raw OCR output.
              </p>
              {manualPhotoProfileChips.length > 0 ? (
                <div className="flex flex-wrap gap-2" aria-label="Learning profile hints">
                  {manualPhotoProfileChips.map((c) => (
                    <span
                      key={c}
                      className="inline-flex max-w-full items-center rounded-full border border-slate-200/90 bg-slate-50/90 px-2.5 py-1 text-caption font-medium text-ink-secondary"
                    >
                      <span className="truncate">{c}</span>
                    </span>
                  ))}
                </div>
              ) : null}
              <textarea
                id="read-aloud-ocr"
                value={photoExtracted}
                onChange={(e) => {
                  const v = e.target.value
                  setPhotoExtracted(v)
                  setManualText(v)
                  setPhotoReviewConfirmed(false)
                  if (!v.trim()) {
                    setPhotoOcrMeta(null)
                  }
                }}
                rows={12}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-body-sm leading-relaxed text-ink-primary focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
                placeholder="Extracted text appears here after you choose a photo. Edit until it matches what you want to read aloud."
              />
            </div>

            {photoOcrMeta && photoExtracted.trim().length > 0 ? (
              <Button
                type="button"
                variant={photoReviewConfirmed ? 'secondary' : 'primary'}
                fullWidth
                className="rounded-2xl py-3"
                onClick={() => {
                  playAppSound('tap')
                  setPhotoReviewConfirmed(true)
                  setPhotoErr(null)
                }}
              >
                {photoReviewConfirmed
                  ? 'Text confirmed — you can start reading below'
                  : 'I’ve reviewed and confirmed this text for reading aloud'}
              </Button>
            ) : null}
            {photoNeedsConfirm && photoExtracted.trim().length >= MIN_LEN ? (
              <p className="text-caption text-amber-900">
                Confirm the text above before starting — we never score raw OCR without your sign-off.
              </p>
            ) : null}
          </div>
        ) : null}

        {tab === 'generated' ? (
          <div className="space-y-4">
            <p className="text-body-sm text-ink-secondary">
              Choose level (below), genre, length, and an optional topic. We generate <strong>natural Dutch</strong> you
              can read aloud — then you can <strong>edit</strong>, <strong>regenerate</strong>, or <strong>save</strong>{' '}
              before you start reading.
            </p>
            {readAloudProfileRec ? (
              <p className="rounded-2xl border border-indigo-200/70 bg-indigo-50/50 px-3 py-2.5 text-caption leading-snug text-indigo-950">
                <span className="font-semibold">Suggested focus: </span>
                {readAloudProfileRec.title}
                {readAloudProfileRec.subtitle ? ` — ${readAloudProfileRec.subtitle}` : ''}
                {isFeature1ChatBackendEnabled()
                  ? ' Generation uses your learning profile when you are signed in and have a little history.'
                  : ''}
              </p>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-caption font-semibold text-ink-primary">Genre</span>
                <select
                  value={genGenre}
                  onChange={(e) => setGenGenre(e.target.value as ReadAloudGenre)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-body-sm"
                >
                  {GENRES.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-caption font-semibold text-ink-primary">Length</span>
                <select
                  value={genLength}
                  onChange={(e) => setGenLength(e.target.value as 'short' | 'medium' | 'long')}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-body-sm"
                >
                  <option value="short">Short</option>
                  <option value="medium">Medium</option>
                  <option value="long">Long</option>
                </select>
              </label>
            </div>
            <label className="space-y-1 block">
              <span className="text-caption font-semibold text-ink-primary">
                Topic / focus{' '}
                <span className="font-normal text-ink-tertiary">
                  ({genGenre === 'custom_topic' ? 'required for custom' : 'optional'})
                </span>
              </span>
              <input
                value={genTopic}
                onChange={(e) => setGenTopic(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-body-sm"
                placeholder={genGenre === 'custom_topic' ? 'Describe the topic in a few words…' : 'e.g. morning routine, weekend trip…'}
              />
            </label>
            {genErr ? <p className="text-caption text-red-700">{genErr}</p> : null}
            {genSavedHint ? (
              <p className="text-caption font-medium text-emerald-800" role="status">
                {genSavedHint}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="primary"
                className="gap-2"
                disabled={genBusy}
                onClick={() => void runGenerate()}
              >
                <Sparkles className="h-4 w-4" aria-hidden />
                {genBusy ? 'Generating…' : genPassageReady ? 'Regenerate passage' : 'Generate passage'}
              </Button>
              {genPassageReady ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="gap-2"
                  disabled={!manualText.trim()}
                  onClick={saveGeneratedPassage}
                >
                  <Bookmark className="h-4 w-4" aria-hidden />
                  Save for later
                </Button>
              ) : null}
            </div>

            {genPassageReady ? (
              <div className="space-y-2 rounded-2xl border border-emerald-200/80 bg-emerald-50/35 px-4 py-4">
                <p className="text-caption font-semibold uppercase tracking-wide text-emerald-900">Your passage</p>
                {genTitle?.trim() ? (
                  <p className="text-body font-semibold text-ink-primary leading-snug">{genTitle.trim()}</p>
                ) : null}
                {genPersonalizationChips && genPersonalizationChips.length > 0 ? (
                  <div className="flex flex-wrap gap-2" aria-label="Passage personalization">
                    {genPersonalizationChips.map((c) => (
                      <span
                        key={c}
                        className="inline-flex max-w-full items-center rounded-full border border-emerald-200/80 bg-white/80 px-2.5 py-1 text-caption font-medium text-emerald-950/90"
                      >
                        <span className="truncate">{c}</span>
                      </span>
                    ))}
                  </div>
                ) : null}
                <p className="text-caption text-ink-tertiary">
                  Edit wording, breaks, or length here. What you see is what will be scored — not a hidden draft.
                </p>
                <textarea
                  id="read-aloud-generated"
                  value={manualText}
                  onChange={(e) => {
                    const v = e.target.value
                    setManualText(v)
                    if (!v.trim()) setGenPassageReady(false)
                  }}
                  rows={12}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-body-sm leading-relaxed text-ink-primary focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
                />
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="border-t border-slate-100 pt-4 space-y-3">
          <p className="text-caption font-semibold text-ink-primary">Level & display</p>
          <div className="flex flex-wrap gap-2">
            {(['A1', 'A2', 'B1', 'B2'] as const).map((lv) => (
              <button
                key={lv}
                type="button"
                onClick={() => {
                  playAppSound('tap')
                  setCefrLevel(lv)
                }}
                className={clsx(
                  'min-h-touch rounded-2xl border px-4 py-2 text-body-sm font-semibold transition-colors',
                  cefrLevel === lv
                    ? 'border-violet-400 bg-violet-50 text-violet-950'
                    : 'border-slate-200 bg-white text-ink-secondary hover:border-violet-200'
                )}
              >
                {lv}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-body-sm text-ink-secondary cursor-pointer select-none">
            <input type="checkbox" checked={lineFocus} onChange={(e) => setLineFocus(e.target.checked)} className="rounded border-slate-300" />
            Calm reading view (one sentence at a time on the next screen)
          </label>
        </div>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200/90 bg-slate-50/80 px-4 py-3">
        <p className="text-caption text-ink-secondary">
          <span className="font-semibold text-ink-primary">{charCount}</span> characters · recommended {MIN_LEN}–
          {MAX_LEN.toLocaleString()}
        </p>
        {validationErr ? <p className="text-caption text-amber-800">{validationErr}</p> : null}
      </div>

      <Button
        type="button"
        variant="primary"
        fullWidth
        className="gap-2 rounded-2xl py-3.5 text-body font-semibold shadow-[0_18px_40px_-28px_rgba(79,70,229,0.55)]"
        disabled={Boolean(validationErr) || photoBusy || genBusy || photoNeedsConfirm}
        onClick={start}
      >
        <BookOpen className="h-5 w-5" aria-hidden />
        Start reading
      </Button>
    </div>
  )
}
