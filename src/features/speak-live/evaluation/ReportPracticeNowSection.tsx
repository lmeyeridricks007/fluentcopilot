'use client'

import Link from 'next/link'
import type { ApiPersonalizedTrainingLoop, ApiTrainingLoopPracticeNowBundle } from '@/lib/api/apiTypes'
import { appTalkTrainingLoopHref } from '@/lib/routing/appRoutes'

/**
 * Per-loop content preview surfaced inside the practice-now card so the user can see WHAT they
 * are about to practice (the actual words, the corrected sentence, etc.) before they tap "Start".
 *
 * Without this, every card looked like a generic CTA — "Practice these weak words" with no
 * visible words. The preview is a thin shape extracted from `loop.payload` (typed `unknown` on
 * the API surface) via runtime guards.
 */
export type LoopContentPreview =
  | { kind: 'chips'; label: string; items: string[] }
  | { kind: 'quote'; label: string; text: string }
  | null

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  const out: string[] = []
  for (const item of v) {
    if (typeof item === 'string') {
      const t = item.trim()
      if (t) out.push(t)
    }
  }
  return out
}

function asString(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

/**
 * Heuristic: does this string look like English coach meta-text rather than an actual
 * line a learner would say? Used to filter out previously-persisted bad `openingPrompt`
 * values like "Jump in with your first line — keep it simple and direct." or
 * "Stay in the same real-life beat as your capture. Anchor: …" so they do not keep
 * surfacing under the "OPENING LINE" label after the backend writer has been fixed.
 *
 * We deliberately keep the matchers narrow (specific known-bad phrases + a generic
 * "Anchor:" prefix) so a real learner line that happens to start with English (e.g.
 * "Excuse me, where is …") still renders as an opener.
 */
function looksLikeCoachMeta(s: string): boolean {
  if (!s) return false
  const lower = s.toLowerCase()
  if (lower.startsWith('jump in with your first line')) return true
  if (lower.startsWith('stay in the same real-life beat')) return true
  if (/^anchor:\s*/i.test(s)) return true
  return false
}

/** Exported for unit tests. Returns the visible-content preview for a single training loop card. */
export function extractLoopPreview(loop: ApiPersonalizedTrainingLoop): LoopContentPreview {
  const payload = (loop.payload && typeof loop.payload === 'object' ? (loop.payload as Record<string, unknown>) : {}) as Record<string, unknown>
  switch (loop.loopType) {
    case 'weak_words': {
      /** {@link backend WeakWordsLoopPayload.words} — up to 5 actual display words. */
      const words = asStringArray(payload.words).slice(0, 6)
      if (words.length === 0) return null
      return { kind: 'chips', label: 'Words', items: words }
    }
    case 'pronunciation_drill': {
      /** {@link backend PronunciationDrillLoopPayload.words} */
      const words = asStringArray(payload.words).slice(0, 6)
      if (words.length === 0) return null
      return { kind: 'chips', label: 'Words', items: words }
    }
    case 'read_aloud_fix': {
      /** {@link backend ReadAloudFixLoopPayload.targetWords} */
      const words = asStringArray(payload.targetWords).slice(0, 6)
      if (words.length === 0) return null
      return { kind: 'chips', label: 'Focus words', items: words }
    }
    case 'retry_sentence': {
      /** {@link backend RetrySentenceLoopPayload.correctedVersion} */
      const corrected = asString(payload.correctedVersion)
      if (!corrected) return null
      return { kind: 'quote', label: 'You will practice', text: corrected }
    }
    case 'mini_scenario': {
      /**
       * Field-priority for the mini-scenario card:
       *   1. `openingPrompt` — the actual line the learner can lean on, when it isn't English coach
       *      meta-text. We strip out previously-shipped meta-strings ("Jump in with your first
       *      line…", "Stay in the same real-life beat…") so loops persisted before the backend fix
       *      do not keep showing a useless "OPENING LINE" preview.
       *   2. `supportingPhrase` — historically the real Dutch hint when `openingPrompt` was meta.
       *   3. `objective` — last-resort goal description, surfaced under a "Goal" label so we
       *      never mislabel an objective as an opening line.
       */
      const rawOpener = asString(payload.openingPrompt)
      const supporting = asString(payload.supportingPhrase)
      const objective = asString(payload.objective)
      const opener = rawOpener && !looksLikeCoachMeta(rawOpener) ? rawOpener : ''
      if (opener) return { kind: 'quote', label: 'Opening line', text: opener }
      if (supporting) return { kind: 'quote', label: 'Try this line', text: supporting }
      if (objective) return { kind: 'quote', label: 'Goal', text: objective }
      return null
    }
    case 'question_drill': {
      /** {@link backend QuestionDrillLoopPayload.exampleQuestions} */
      const qs = asStringArray(payload.exampleQuestions).slice(0, 3)
      if (qs.length === 0) return null
      return { kind: 'quote', label: 'Example question', text: qs[0]! }
    }
    case 'storytelling_drill': {
      /** {@link backend StorytellingDrillLoopPayload.prompt} */
      const prompt = asString(payload.prompt)
      if (!prompt) return null
      return { kind: 'quote', label: 'Prompt', text: prompt }
    }
    case 'structure_drill': {
      /** {@link backend StructureDrillLoopPayload.prompts} */
      const prompts = asStringArray(payload.prompts).slice(0, 3)
      if (prompts.length === 0) return null
      return { kind: 'quote', label: 'First prompt', text: prompts[0]! }
    }
    default:
      return null
  }
}

function LoopPreview({
  preview,
  emphasis,
}: {
  preview: NonNullable<LoopContentPreview>
  emphasis: 'primary' | 'secondary' | 'stretch'
}) {
  const chipTone =
    emphasis === 'primary'
      ? 'bg-violet-100 text-violet-800 ring-violet-200'
      : emphasis === 'stretch'
        ? 'bg-amber-100 text-amber-900 ring-amber-200'
        : 'bg-slate-100 text-slate-700 ring-slate-200'
  const labelTone =
    emphasis === 'primary'
      ? 'text-violet-700/80'
      : emphasis === 'stretch'
        ? 'text-amber-800/80'
        : 'text-slate-500'
  return (
    <div className="mt-3">
      <p className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${labelTone}`}>
        {preview.label}
      </p>
      {preview.kind === 'chips' ? (
        <ul className="mt-1.5 flex flex-wrap gap-1.5" aria-label={preview.label}>
          {preview.items.map((w) => (
            <li
              key={w}
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-medium ring-1 ${chipTone}`}
            >
              {w}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-[13px] italic leading-relaxed text-ink-primary">
          “{preview.text}”
        </p>
      )}
    </div>
  )
}

function LoopCard({ loop, emphasis }: { loop: ApiPersonalizedTrainingLoop; emphasis: 'primary' | 'secondary' | 'stretch' }) {
  const href = appTalkTrainingLoopHref(loop.id)
  /**
   * The evaluation page renders on a light surface (white / slate-50). Earlier styling used
   * `text-white` on a `from-white/[0.07] …` gradient, so the title, subtitle and reason were
   * effectively invisible — that is what produced the "empty cards" report screenshot.
   * The palette below mirrors the surrounding scenario sections (ink-primary for headings,
   * ink-secondary / slate-500 for body) so populated data is actually readable.
   */
  const surface =
    emphasis === 'primary'
      ? 'border-violet-200/80 bg-gradient-to-br from-violet-50/85 via-white to-white ring-violet-100/70 shadow-[0_16px_40px_-28px_rgba(124,58,237,0.32)]'
      : emphasis === 'stretch'
        ? 'border-amber-200/70 bg-gradient-to-br from-amber-50/85 via-white to-white ring-amber-100/70 shadow-[0_12px_32px_-24px_rgba(245,158,11,0.25)]'
        : 'border-slate-200/90 bg-white ring-slate-100/80 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.25)]'
  const eyebrowTone =
    emphasis === 'primary'
      ? 'text-violet-700/85'
      : emphasis === 'stretch'
        ? 'text-amber-700/85'
        : 'text-slate-500'
  const button =
    emphasis === 'stretch'
      ? 'bg-amber-600 text-white hover:bg-amber-500'
      : 'bg-violet-700 text-white hover:bg-violet-600'
  const preview = extractLoopPreview(loop)
  return (
    <div className={`rounded-2xl border px-4 py-4 ring-1 sm:px-5 ${surface}`}>
      <p className={`text-[10px] font-bold uppercase tracking-[0.14em] ${eyebrowTone}`}>
        {emphasis === 'primary' ? 'Practice now' : emphasis === 'stretch' ? 'Stretch rep' : 'Also try'}
      </p>
      <h3 className="mt-1.5 text-[16px] font-semibold tracking-tight text-ink-primary">{loop.title}</h3>
      {loop.subtitle ? <p className="mt-1 text-[13px] leading-relaxed text-ink-secondary">{loop.subtitle}</p> : null}
      <p className="mt-2 text-[12px] leading-relaxed text-slate-600">{loop.reason}</p>
      {preview ? <LoopPreview preview={preview} emphasis={emphasis} /> : null}
      <p className="mt-3 text-[11px] text-slate-400">
        ~{Math.max(0.5, Math.round(loop.estimatedMinutes * 10) / 10)} min · Built from your last session
      </p>
      <Link
        href={href}
        className={`mt-4 inline-flex min-h-touch w-full items-center justify-center rounded-xl px-4 py-3 text-[14px] font-semibold active:scale-[0.99] transition-transform ${button}`}
      >
        Start this rep
      </Link>
    </div>
  )
}

export function ReportPracticeNowSection({
  bundle,
  showEngineDebug,
}: {
  bundle: ApiTrainingLoopPracticeNowBundle | null | undefined
  showEngineDebug?: boolean
}) {
  if (!bundle) return null
  const { primary, secondary, stretch, debug } = bundle
  if (!primary && !secondary && !stretch) return null
  return (
    <section className="mt-8" aria-labelledby="fc-practice-now-heading">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 id="fc-practice-now-heading" className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
            Practice now
          </h2>
          <p className="mt-1 text-[14px] text-ink-secondary">One quick rep — strongest first.</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-3">
        {primary ? <LoopCard loop={primary} emphasis="primary" /> : null}
        {secondary ? <LoopCard loop={secondary} emphasis="secondary" /> : null}
        {stretch ? <LoopCard loop={stretch} emphasis="stretch" /> : null}
      </div>
      {showEngineDebug && debug ? (
        <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
          <summary className="cursor-pointer font-semibold text-ink-primary">Training loop engine (dev)</summary>
          <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-[10px] leading-relaxed text-slate-500">
            {JSON.stringify(debug, null, 2)}
          </pre>
        </details>
      ) : null}
    </section>
  )
}
