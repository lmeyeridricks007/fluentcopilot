'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { isFeature1ChatBackendEnabled } from '@/lib/api/apiConfig'
import { quickCaptureClient, type QuickCaptureItem } from '@/lib/api/quickCaptureClient'
import { useQuickCaptureOfflineStore } from '@/store/quickCaptureOfflineStore'
import { APP_LIBRARY_FROM_YOUR_DAY, APP_LIBRARY_HUB } from '@/lib/routing/appRoutes'
import { playAppSound } from '@/lib/interaction/appSounds'
import {
  captureDisplayTitle,
  parseQuickCaptureEnrichment,
  typeLabel,
} from './parseQuickCaptureEnrichment'
import { VoiceNotePlayback } from './VoiceNotePlayback'
function mergeCaptures(apiItems: QuickCaptureItem[], offlineItems: QuickCaptureItem[]): QuickCaptureItem[] {
  const byId = new Map<string, QuickCaptureItem>()
  for (const o of offlineItems) byId.set(o.id, o)
  for (const a of apiItems) byId.set(a.id, a)
  return Array.from(byId.values())
}

function voiceLearnerInferenceLabel(inference: string): string {
  switch (inference) {
    case 'single_speaker':
      return 'Sounds like one voice'
    case 'likely_learner_monologue':
      return 'Sounds like you talking (solo)'
    case 'likely_dialogue_two_or_more':
      return 'Sounds like a conversation (two or more voices in the text)'
    case 'ambiguous':
      return 'Hard to tell who is who from the text alone'
    case 'unknown':
    default:
      return 'Could not infer from the transcript'
  }
}

function rawPreview(rawJson: string | null): string {
  if (!rawJson?.trim()) return ''
  try {
    const j = JSON.parse(rawJson) as Record<string, unknown>
    const slim: Record<string, unknown> = { ...j }
    if (typeof slim.imageBase64 === 'string') slim.imageBase64 = `[${slim.imageBase64.length} chars]`
    if (typeof slim.voiceAudioBase64 === 'string') slim.voiceAudioBase64 = `[${slim.voiceAudioBase64.length} chars]`
    return JSON.stringify(slim, null, 2).slice(0, 2400)
  } catch {
    return rawJson.slice(0, 1200)
  }
}

export function CaptureItemDetailView({ captureId }: { captureId: string }) {
  const router = useRouter()
  const offlineCaptures = useQuickCaptureOfflineStore((s) => s.captures)
  const offlineSetStatus = useQuickCaptureOfflineStore((s) => s.setCaptureStatus)
  const [item, setItem] = useState<QuickCaptureItem | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setItem(null)
    setNotFound(false)
    const backend = isFeature1ChatBackendEnabled()
    let api: QuickCaptureItem[] = []
    if (backend) {
      try {
        const r = await quickCaptureClient.list()
        api = r.items ?? []
      } catch {
        /* fall through to offline merge */
      }
    }
    const merged = mergeCaptures(api, offlineCaptures)
    const found = merged.find((x) => x.id === captureId) ?? null
    setItem(found)
    setNotFound(!found)
  }, [captureId, offlineCaptures])

  useEffect(() => {
    void load()
  }, [load])

  const enrichment = useMemo(() => (item ? parseQuickCaptureEnrichment(item) : null), [item])

  const patch = useCallback(
    async (status: QuickCaptureItem['status']) => {
      if (!item) return
      setBusy(true)
      try {
        if (isFeature1ChatBackendEnabled()) await quickCaptureClient.patchCapture(item.id, status)
        offlineSetStatus(item.id, status)
        await load()
      } finally {
        setBusy(false)
      }
    },
    [item, load, offlineSetStatus],
  )

  if (notFound && !item) {
    return (
      <div className="max-w-lg mx-auto w-full px-4 py-10">
        <button
          type="button"
          onClick={() => router.push(`${APP_LIBRARY_HUB}?tab=captured`)}
          className="mb-6 inline-flex min-h-touch items-center gap-2 text-body-sm font-semibold text-primary-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to Library
        </button>
        <p className="text-body font-semibold text-ink-primary">We could not find that save</p>
        <p className="mt-2 text-caption text-ink-secondary leading-relaxed">
          It may have been removed or is still catching up. Open your collection to see what is here.
        </p>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="max-w-lg mx-auto w-full px-4 py-16">
        <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    )
  }

  const title = captureDisplayTitle(item)
  const fromDayHref = `${APP_LIBRARY_FROM_YOUR_DAY}?date=${encodeURIComponent(item.localCaptureDate)}`

  return (
    <div className="max-w-lg mx-auto w-full px-4 pb-12">
      <button
        type="button"
        onClick={() => {
          playAppSound('tap')
          router.push(`${APP_LIBRARY_HUB}?tab=captured`)
        }}
        className="mb-4 mt-2 inline-flex min-h-touch items-center gap-2 text-body-sm font-semibold text-primary-700"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Library
      </button>

      <header className="space-y-1 border-b border-slate-100 pb-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{typeLabel(item.captureType)}</p>
        <h1 className="text-title font-bold text-ink-primary tracking-tight leading-tight">{title}</h1>
        <p className="text-caption text-ink-tertiary">
          {new Date(item.createdAt).toLocaleString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
          <span className="mx-1.5">·</span>
          Day {item.localCaptureDate}
        </p>
      </header>

      {item.captureType === 'voice_note' ? (
        <section className="mt-6 space-y-2" aria-labelledby="capture-voice-recording">
          <h2 id="capture-voice-recording" className="text-caption font-bold uppercase tracking-wide text-slate-500">
            Recording
          </h2>
          <div className="rounded-2xl border border-slate-200/90 bg-surface-elevated p-4 space-y-3 shadow-sm">
            {item.title?.trim() ? (
              <div>
                <p className="text-[10px] font-semibold uppercase text-slate-400">What you wanted to work on</p>
                <p className="mt-1 text-body-sm font-semibold text-ink-primary leading-snug">{item.title.trim()}</p>
              </div>
            ) : null}
            {item.bodySecondary?.trim() ? (
              <div>
                <p className="text-[10px] font-semibold uppercase text-slate-400">Your note</p>
                <p className="mt-1 text-body-sm text-ink-secondary whitespace-pre-wrap leading-relaxed">{item.bodySecondary.trim()}</p>
              </div>
            ) : null}
            <div>
              <p className="text-[10px] font-semibold uppercase text-slate-400">Audio</p>
              <VoiceNotePlayback item={item} />
            </div>
          </div>
        </section>
      ) : null}

      <section className="mt-6 space-y-2" aria-labelledby="capture-original">
        <h2 id="capture-original" className="text-caption font-bold uppercase tracking-wide text-slate-500">
          {item.captureType === 'voice_note' ? 'Transcript & saved text' : 'What you saved'}
        </h2>
        <div className="rounded-2xl border border-slate-200/90 bg-surface-elevated p-4 space-y-3 shadow-sm">
          {item.captureType !== 'voice_note' && item.bodyPrimary?.trim() ? (
            <div>
              <p className="text-[10px] font-semibold uppercase text-slate-400">Main</p>
              <p className="mt-1 text-body-sm text-ink-primary whitespace-pre-wrap leading-relaxed">{item.bodyPrimary}</p>
            </div>
          ) : null}
          {item.captureType !== 'voice_note' && item.bodySecondary?.trim() ? (
            <div>
              <p className="text-[10px] font-semibold uppercase text-slate-400">Extra</p>
              <p className="mt-1 text-caption text-ink-secondary whitespace-pre-wrap leading-relaxed">{item.bodySecondary}</p>
            </div>
          ) : null}
          {item.captureType === 'voice_note' && item.bodyPrimary?.trim() ? (
            <div>
              <p className="text-[10px] font-semibold uppercase text-slate-400">Main text (from your voice or typing)</p>
              <p className="mt-1 text-body-sm text-ink-primary whitespace-pre-wrap leading-relaxed">{item.bodyPrimary}</p>
            </div>
          ) : null}
          {item.transcript?.trim() &&
          (item.captureType !== 'voice_note' || item.transcript.trim() !== (item.bodyPrimary ?? '').trim()) ? (
            <div>
              <p className="text-[10px] font-semibold uppercase text-slate-400">Voice as text</p>
              <p className="mt-1 text-body-sm text-ink-primary whitespace-pre-wrap leading-relaxed">{item.transcript}</p>
            </div>
          ) : null}
          {item.placeKind ? (
            <p className="text-caption text-ink-secondary">
              <span className="font-semibold text-ink-primary">Where:</span> {item.placeKind.replace(/_/g, ' ')}
            </p>
          ) : null}
          {item.rawJson?.trim() ? (
            <details className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2">
              <summary className="cursor-pointer text-caption font-semibold text-ink-secondary">Technical detail (redacted)</summary>
              <pre className="mt-2 max-h-56 overflow-auto text-[11px] leading-snug text-slate-600 whitespace-pre-wrap">
                {rawPreview(item.rawJson)}
              </pre>
            </details>
          ) : null}
        </div>
      </section>

      {enrichment ? (
        <section className="mt-8 space-y-3" aria-labelledby="capture-enrichment">
          <h2 id="capture-enrichment" className="text-caption font-bold uppercase tracking-wide text-slate-500">
            Notes for practice
          </h2>
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/25 p-4 space-y-3 ring-1 ring-indigo-100/50">
            {item.captureType === 'voice_note' && item.title?.trim() ? (
              <p className="text-body-sm text-ink-primary leading-relaxed">
                <span className="font-semibold">What you said you want to work on:</span> {item.title.trim()}
              </p>
            ) : null}
            {enrichment.overallConfidence != null ? (
              <p className="text-caption text-ink-secondary">
                <span className="font-semibold text-ink-primary">How sure we are:</span>{' '}
                about {Math.round(enrichment.overallConfidence * 100)}% — worth a glance if it matters for you.
              </p>
            ) : null}
            {enrichment.needsReview ? (
              <p className="rounded-lg bg-violet-50 px-2 py-1.5 text-caption font-medium text-violet-950 ring-1 ring-violet-100">
                Give this one a quick look — meaning or wording might be off.
              </p>
            ) : null}
            {enrichment.likelyMeaning ? (
              <p className="text-body-sm text-ink-primary leading-relaxed">
                <span className="font-semibold">Probably means:</span> {enrichment.likelyMeaning}
              </p>
            ) : null}
            {enrichment.likelyScenario ? (
              <p className="text-caption text-ink-secondary">
                <span className="font-semibold text-ink-primary">Probably where:</span> {enrichment.likelyScenario}
              </p>
            ) : null}
            {enrichment.likelyPlaceType ? (
              <p className="text-caption text-ink-secondary">
                <span className="font-semibold text-ink-primary">Setting:</span> {enrichment.likelyPlaceType}
              </p>
            ) : null}
            {enrichment.registerNotes ? (
              <p className="text-caption text-ink-secondary leading-relaxed">{enrichment.registerNotes}</p>
            ) : null}
            {enrichment.enrichmentNotes ? (
              <p className="text-caption text-ink-secondary leading-relaxed">{enrichment.enrichmentNotes}</p>
            ) : null}
            {enrichment.struggleSignals?.length ? (
              <div>
                <p className="text-[10px] font-semibold uppercase text-slate-400">What stood out</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {enrichment.struggleSignals.map((s) => (
                    <span key={s} className="rounded-md bg-white/80 px-2 py-0.5 text-[11px] font-medium text-slate-700 ring-1 ring-slate-200/80">
                      {s.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {enrichment.skillImpacts?.length ? (
              <div>
                <p className="text-[10px] font-semibold uppercase text-slate-400">Where this helps</p>
                <ul className="mt-1 space-y-1 list-none p-0 m-0 text-caption text-ink-secondary">
                  {enrichment.skillImpacts.map((sk) => (
                    <li key={sk.skill}>
                      <span className="font-medium text-ink-primary">{sk.skill}</span>
                      {sk.impact ? <span> — {sk.impact}</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </section>
      ) : (
        <p className="mt-8 text-caption text-ink-tertiary">
          Extra notes will show up here once we have had a quiet pass at this save.
        </p>
      )}

      {enrichment?.tags?.length || enrichment?.scenarioSlugGuess ? (
        <section className="mt-8 space-y-2" aria-labelledby="capture-tags">
          <h2 id="capture-tags" className="text-caption font-bold uppercase tracking-wide text-slate-500">
            From real life
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {enrichment.scenarioSlugGuess ? (
              <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white">
                {enrichment.scenarioSlugGuess.replace(/-/g, ' ')}
              </span>
            ) : null}
            {(enrichment.tags ?? []).map((t) => (
              <span
                key={t}
                className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700"
              >
                {t}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {enrichment?.practiceRecommendations?.length ? (
        <section className="mt-8 space-y-2" aria-labelledby="capture-practice">
          <h2 id="capture-practice" className="text-caption font-bold uppercase tracking-wide text-slate-500">
            Ideas for practice
          </h2>
          <ul className="space-y-2 list-none p-0 m-0">
            {enrichment.practiceRecommendations.map((pr, i) => (
              <li
                key={`${pr.kind}-${i}`}
                className="rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-caption text-ink-secondary shadow-sm"
              >
                <span className="font-semibold text-ink-primary capitalize">{pr.kind.replace(/_/g, ' ')}</span>
                <p className="mt-1 leading-relaxed">{pr.rationale}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {item.captureType === 'voice_note' && !enrichment?.practiceRecommendations?.length ? (
        <section className="mt-8 space-y-2" aria-labelledby="capture-practice-fallback">
          <h2 id="capture-practice-fallback" className="text-caption font-bold uppercase tracking-wide text-slate-500">
            Ideas for practice
          </h2>
          <ul className="m-0 list-none space-y-2 p-0">
            <li className="rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-caption text-ink-secondary shadow-sm leading-relaxed">
              <span className="font-semibold text-ink-primary">Replay</span>
              <p className="mt-1">
                Use the player above, then say your target wording slowly twice — match the rhythm you want in real life.
              </p>
            </li>
            <li className="rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-caption text-ink-secondary shadow-sm leading-relaxed">
              <span className="font-semibold text-ink-primary">Same-day pack</span>
              <p className="mt-1">
                When the transcript looks right, open &quot;Turn this into practice&quot; below so this day can pull it into
                short reps.
              </p>
            </li>
            {item.bodyPrimary?.trim() ? (
              <li className="rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-caption text-ink-secondary shadow-sm leading-relaxed">
                <span className="font-semibold text-ink-primary">Shadow</span>
                <p className="mt-1">Read your main line aloud once, then cover the text and try again from memory.</p>
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}

      {item.captureType === 'voice_note' && enrichment?.voiceNoteAnalysis ? (
        <section className="mt-8 space-y-3" aria-labelledby="capture-voice-analysis">
          <h2 id="capture-voice-analysis" className="text-caption font-bold uppercase tracking-wide text-slate-500">
            From your recording (transcript)
          </h2>
          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-4 space-y-3 ring-1 ring-amber-100/60">
            <p className="text-caption text-amber-950/90 leading-relaxed">
              This is an automatic read of the <span className="font-semibold">written transcript</span>, not separate
              tracks per speaker on the audio. Counts and &quot;which is me&quot; are best-effort when the text sounds like
              dialogue.
            </p>
            {enrichment.voiceNoteAnalysis.analysisConfidence > 0 &&
            enrichment.voiceNoteAnalysis.analysisConfidence < 0.55 ? (
              <p className="rounded-lg bg-white/80 px-2 py-1.5 text-caption text-amber-950 ring-1 ring-amber-100">
                Low confidence on this pass — skim with a grain of salt.
              </p>
            ) : null}
            {enrichment.voiceNoteAnalysis.contextSummaryEn ? (
              <div>
                <p className="text-[10px] font-semibold uppercase text-slate-500">Context</p>
                <p className="mt-1 text-body-sm text-ink-primary leading-relaxed">{enrichment.voiceNoteAnalysis.contextSummaryEn}</p>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2 text-caption">
              {enrichment.voiceNoteAnalysis.estimatedSpeakerCount != null ? (
                <span className="rounded-full border border-slate-200/90 bg-white px-2.5 py-1 font-medium text-ink-primary">
                  About {enrichment.voiceNoteAnalysis.estimatedSpeakerCount} speaker
                  {enrichment.voiceNoteAnalysis.estimatedSpeakerCount === 1 ? '' : 's'} (inferred)
                </span>
              ) : null}
              <span className="rounded-full border border-slate-200/90 bg-white px-2.5 py-1 font-medium text-ink-secondary">
                {voiceLearnerInferenceLabel(enrichment.voiceNoteAnalysis.learnerSpeakerInference)}
              </span>
            </div>
            {enrichment.voiceNoteAnalysis.learnerSpeakerRationaleEn ? (
              <p className="text-caption text-ink-secondary leading-relaxed">
                <span className="font-semibold text-ink-primary">Why:</span> {enrichment.voiceNoteAnalysis.learnerSpeakerRationaleEn}
              </p>
            ) : null}
            {enrichment.voiceNoteAnalysis.vocabularyHighlightsNl.length ? (
              <div>
                <p className="text-[10px] font-semibold uppercase text-slate-500">Words &amp; phrases to reuse</p>
                <ul className="mt-1 list-disc pl-4 space-y-0.5 text-body-sm text-ink-primary">
                  {enrichment.voiceNoteAnalysis.vocabularyHighlightsNl.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {enrichment.voiceNoteAnalysis.grammarNotesEn.length ? (
              <div>
                <p className="text-[10px] font-semibold uppercase text-slate-500">Grammar notes</p>
                <ul className="mt-1 list-disc pl-4 space-y-0.5 text-caption text-ink-secondary leading-relaxed">
                  {enrichment.voiceNoteAnalysis.grammarNotesEn.map((g, i) => (
                    <li key={`${i}-${g.slice(0, 24)}`}>{g}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {item.captureType === 'voice_note' && enrichment?.voicePracticeSurface ? (
        <section className="mt-8 space-y-3" aria-labelledby="capture-voice-practice">
          <h2 id="capture-voice-practice" className="text-caption font-bold uppercase tracking-wide text-slate-500">
            From your voice note
          </h2>
          <div className="rounded-2xl border border-teal-200/90 bg-teal-50/30 p-4 space-y-3 ring-1 ring-teal-100/60">
            <p className="text-caption text-ink-secondary leading-relaxed">
              A cleaned-up version you can drop into chat or a short drill — nothing to memorize, just useful lines.
            </p>
            {enrichment.voicePracticeSurface.polishedDutch ? (
              <div>
                <p className="text-[10px] font-semibold uppercase text-slate-400">Natural Dutch</p>
                <p className="mt-1 text-body-sm text-ink-primary whitespace-pre-wrap leading-relaxed">
                  {enrichment.voicePracticeSurface.polishedDutch}
                </p>
              </div>
            ) : null}
            {enrichment.voicePracticeSurface.englishGloss ? (
              <div>
                <p className="text-[10px] font-semibold uppercase text-slate-400">In English</p>
                <p className="mt-1 text-caption text-ink-secondary leading-relaxed">
                  {enrichment.voicePracticeSurface.englishGloss}
                </p>
              </div>
            ) : null}
            {enrichment.voicePracticeSurface.whatToSayNextNl ? (
              <div>
                <p className="text-[10px] font-semibold uppercase text-slate-400">What to say next time</p>
                <p className="mt-1 text-body-sm text-ink-primary whitespace-pre-wrap leading-relaxed">
                  {enrichment.voicePracticeSurface.whatToSayNextNl}
                </p>
              </div>
            ) : null}
            {enrichment.voicePracticeSurface.phrasePracticeNl ? (
              <div>
                <p className="text-[10px] font-semibold uppercase text-slate-400">Phrase to repeat</p>
                <p className="mt-1 text-body-sm text-ink-primary whitespace-pre-wrap leading-relaxed">
                  {enrichment.voicePracticeSurface.phrasePracticeNl}
                </p>
              </div>
            ) : null}
            {enrichment.voicePracticeSurface.coachDebriefSeed ? (
              <div>
                <p className="text-[10px] font-semibold uppercase text-slate-400">Coach prompt</p>
                <p className="mt-1 text-caption text-ink-secondary whitespace-pre-wrap leading-relaxed">
                  {enrichment.voicePracticeSurface.coachDebriefSeed}
                </p>
              </div>
            ) : null}
            {enrichment.voicePracticeSurface.miniScenarioSeedNl ||
            enrichment.voicePracticeSurface.miniScenarioSlugGuess ? (
              <div>
                <p className="text-[10px] font-semibold uppercase text-slate-400">Mini scenario</p>
                {enrichment.voicePracticeSurface.miniScenarioSlugGuess ? (
                  <p className="mt-1 text-caption font-medium text-ink-primary">
                    {enrichment.voicePracticeSurface.miniScenarioSlugGuess.replace(/-/g, ' ')}
                  </p>
                ) : null}
                {enrichment.voicePracticeSurface.miniScenarioSeedNl ? (
                  <p className="mt-1 text-body-sm text-ink-primary whitespace-pre-wrap leading-relaxed">
                    {enrichment.voicePracticeSurface.miniScenarioSeedNl}
                  </p>
                ) : null}
              </div>
            ) : null}
            {enrichment.voicePracticeSurface.vocabularyHints?.length ? (
              <div>
                <p className="text-[10px] font-semibold uppercase text-slate-400">Handy words</p>
                <ul className="mt-1 list-disc pl-4 space-y-0.5 text-caption text-ink-secondary">
                  {enrichment.voicePracticeSurface.vocabularyHints.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="mt-8 space-y-2" aria-labelledby="capture-pack">
        <h2 id="capture-pack" className="text-caption font-bold uppercase tracking-wide text-slate-500">
          From your day
        </h2>
        <div className="rounded-2xl border border-slate-200/90 bg-surface-muted/30 p-4">
          {item.dayPackId ? (
            <>
              <p className="text-body-sm text-ink-primary">
                Already part of a short pack from this calendar day.
              </p>
              <p className="mt-1 text-caption text-ink-secondary">
                Same day as this save — easy to pick up where you left off.
              </p>
            </>
          ) : (
            <p className="text-caption text-ink-secondary leading-relaxed">
              Not in a pack yet. When it feels ready, you can weave it into a calm &quot;From your day&quot; loop below.
            </p>
          )}
        </div>
      </section>

      <section className="mt-10 flex flex-col gap-3 border-t border-slate-100 pt-6">
        <p className="text-caption font-bold uppercase tracking-wide text-slate-500">Next step</p>
        <Link
          href={fromDayHref}
          onClick={() => playAppSound('tap')}
          className="inline-flex min-h-touch w-full items-center justify-center rounded-xl bg-primary-600 px-4 py-3 text-body-sm font-semibold text-white shadow-sm hover:bg-primary-700"
        >
          Turn this into practice
          <ExternalLink className="ml-1.5 h-4 w-4 opacity-90" aria-hidden />
        </Link>
        <div className="flex flex-wrap items-center justify-center gap-4">
          {item.status !== 'saved_long_term' && item.status !== 'archived' ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void patch('saved_long_term')}
              className="text-caption font-semibold text-primary-800 underline-offset-2 hover:underline disabled:opacity-50"
            >
              Keep for later
            </button>
          ) : null}
          {item.status !== 'archived' ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void patch('archived')}
              className="text-caption font-semibold text-ink-tertiary underline-offset-2 hover:underline disabled:opacity-50"
            >
              Archive
            </button>
          ) : null}
        </div>
      </section>
    </div>
  )
}
