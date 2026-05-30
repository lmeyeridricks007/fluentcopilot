'use client'

import { useCallback, useState } from 'react'
import { BookmarkPlus, Check, Play, Volume2 } from 'lucide-react'
import { coachSnippetForDisplay } from './CoachGuidanceEvidence'
import { DutchWordGlossPicker, type WordCorrection } from './dutchWordGlossSupport'

type Props = {
  variant: 'chat' | 'voice'
  sessionId: string
  scenarioId: string
  level: string
  /** Learner wording from this session (transcript line). */
  yourLine: string
  /** Dutch to aim for (coach model or phrasing upgrade). */
  modelDutch: string
  /** When variant is voice: the syllable/word that scored low (or LLM-inferred intent). */
  weakWord?: string
  /** Optional short tip from pronunciation heuristics. */
  tip?: string
  /**
   * Optional LLM-inferred intent (e.g. spoken "gernen" → likely "gerend" (ran)). When
   * present, the card surfaces a "Likely meant" chip next to the weak-word chip and
   * uses the corrected Dutch as the practice target. Absent for rows where the spoken
   * token was clearly a real Dutch word.
   */
  intent?: {
    dutchWord: string
    englishGloss: string
  }
  saveKeyBase: string
  playbackTurnId: string
  onPlayDutchReference: (turnId: string, text: string) => Promise<void>
  onSave: (input: Record<string, unknown>) => void
  saving: string | null
  savedKeys: Set<string>
}

export function LanguageCoachPhrasePracticeCard(props: Props) {
  const {
    variant,
    sessionId,
    scenarioId,
    level,
    yourLine,
    modelDutch,
    weakWord,
    tip,
    intent,
    saveKeyBase,
    playbackTurnId,
    onPlayDutchReference,
    onSave,
    saving,
    savedKeys,
  } = props
  const [pickedWord, setPickedWord] = useState<string | null>(null)
  const [ttsBusy, setTtsBusy] = useState(false)

  const learner = yourLine.trim()
  const coachPhrase = coachSnippetForDisplay(modelDutch)
  const hasCoachDutch = coachPhrase.length >= 2
  const emptyCorrections: WordCorrection[] = []

  const saveLineKey = `${saveKeyBase}-line`
  const saveWordKey = `${saveKeyBase}-word`
  const lineSaved = savedKeys.has(saveLineKey)
  const wordSaved = savedKeys.has(saveWordKey)
  const lineBusy = saving === saveLineKey
  const wordBusy = saving === saveWordKey

  const playCoach = useCallback(async () => {
    if (!hasCoachDutch) return
    setTtsBusy(true)
    try {
      await onPlayDutchReference(playbackTurnId, coachPhrase)
    } finally {
      setTtsBusy(false)
    }
  }, [hasCoachDutch, onPlayDutchReference, playbackTurnId, coachPhrase])

  const picked = pickedWord?.replace(/^['"„‚«»(]+/u, '').replace(/['"»).,?!;:…]+$/u, '').trim() ?? ''

  const shell =
    variant === 'voice'
      ? 'border-emerald-200/90 bg-gradient-to-br from-emerald-50/50 via-white to-white'
      : 'border-violet-200/90 bg-gradient-to-br from-violet-50/40 via-white to-white'

  return (
    <div className={`rounded-[1.2rem] border p-4 shadow-sm ring-1 ring-black/[0.03] sm:p-4 ${shell}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-slate-900/[0.06] px-2.5 py-0.5 text-[11px] font-semibold text-slate-800">
          {variant === 'voice' ? 'Mic · sound focus' : 'Chat · phrasing'}
        </span>
        {intent ? (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-violet-100/90 px-2.5 py-0.5 text-[11px] font-semibold text-violet-950"
            title={intent.englishGloss ? `${intent.dutchWord} — ${intent.englishGloss}` : intent.dutchWord}
          >
            <span aria-hidden className="text-violet-700/80">Likely meant</span>
            <span className="font-bold">“{intent.dutchWord}”</span>
            {intent.englishGloss ? (
              <span className="font-normal text-violet-900/80">· {intent.englishGloss}</span>
            ) : null}
          </span>
        ) : weakWord ? (
          <span className="rounded-full bg-emerald-100/90 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-950">
            “{weakWord}”
          </span>
        ) : null}
      </div>

      <div className="mt-3 space-y-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">What you said</p>
          <p className="mt-1 text-[15px] font-medium leading-relaxed text-ink-primary">“{learner}”</p>
        </div>

        {hasCoachDutch ? (
          <div className="rounded-xl border border-indigo-100/90 bg-indigo-50/45 px-3 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-900/85">Aim for this Dutch</p>
            <p className="mt-1 text-[15px] font-semibold leading-relaxed text-indigo-950">“{coachPhrase}”</p>
            {tip ? <p className="mt-2 text-[12px] leading-relaxed text-indigo-900/75">{tip}</p> : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={ttsBusy}
                onClick={() => void playCoach()}
                className="inline-flex min-h-touch items-center gap-1.5 rounded-xl border border-indigo-200 bg-white px-3 py-2 text-[12px] font-semibold text-indigo-900 hover:bg-indigo-50 disabled:opacity-60"
              >
                {ttsBusy ? (
                  <Volume2 className="h-4 w-4 shrink-0 motion-safe:animate-pulse" aria-hidden />
                ) : (
                  <Play className="h-4 w-4 shrink-0" aria-hidden />
                )}
                {ttsBusy ? 'Loading audio…' : 'Hear reference Dutch'}
              </button>
              <button
                type="button"
                disabled={lineBusy || lineSaved}
                onClick={() =>
                  onSave({
                    type: 'save_natural_phrasing',
                    title:
                      variant === 'voice'
                        ? `Mic focus “${(weakWord ?? '').slice(0, 24)}”: “${coachPhrase.slice(0, 64)}${coachPhrase.length > 64 ? '…' : ''}”`
                        : `Phrase: “${coachPhrase.slice(0, 72)}${coachPhrase.length > 72 ? '…' : ''}”`,
                    content: `Your line: “${learner}”\nModel Dutch: “${coachPhrase}”`,
                    saveBusyKey: saveLineKey,
                    learnerOriginalSentence: learner,
                    improvedSentence: coachPhrase,
                    tagCategory: 'phrasing_upgrade',
                    suggestedTrainingMode: 'speaking',
                    metadata: {
                      scenarioId,
                      level,
                      surface: 'speak_live_voice_report',
                      source: variant === 'voice' ? 'language_coach_voice_compare' : 'language_coach_chat_compare',
                      sessionId,
                    },
                  })
                }
                className={
                  lineSaved
                    ? 'inline-flex min-h-touch items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] font-semibold text-emerald-900'
                    : 'inline-flex min-h-touch items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] font-semibold text-slate-800 hover:bg-slate-50'
                }
              >
                {lineSaved ? <Check className="h-3.5 w-3.5" /> : <BookmarkPlus className="h-3.5 w-3.5" />}
                {lineSaved ? 'Saved' : lineBusy ? 'Saving…' : 'Save for practice'}
              </button>
            </div>
            <DutchWordGlossPicker
              phrase={coachPhrase}
              corrections={emptyCorrections}
              label="Tap a word for English meaning"
              onPickedWordChange={setPickedWord}
            />
            {picked ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={wordBusy || wordSaved}
                  onClick={() =>
                    onSave({
                      type: 'library_word',
                      title: `Word: “${picked}” (${variant === 'voice' ? 'mic' : 'chat'})`,
                      content: `From model: “${coachPhrase}”\nWord: ${picked}`,
                      saveBusyKey: saveWordKey,
                      learnerOriginalSentence: learner,
                      improvedSentence: coachPhrase,
                      tagCategory: 'library',
                      suggestedTrainingMode: 'speaking',
                      metadata: {
                        scenarioId,
                        level,
                        surface: 'speak_live_voice_report',
                        source: variant === 'voice' ? 'language_coach_voice_compare_word' : 'language_coach_chat_compare_word',
                        sessionId,
                        pickedWord: picked,
                      },
                    })
                  }
                  className={
                    wordSaved
                      ? 'inline-flex min-h-touch items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] font-semibold text-emerald-900'
                      : 'inline-flex min-h-touch items-center gap-1.5 rounded-xl border border-violet-200 bg-white px-3 py-2 text-[12px] font-semibold text-violet-900 hover:bg-violet-50'
                  }
                >
                  {wordSaved ? <Check className="h-3.5 w-3.5" /> : <BookmarkPlus className="h-3.5 w-3.5" />}
                  {wordSaved ? 'Saved' : wordBusy ? 'Saving…' : `Save “${picked}”`}
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-[13px] text-ink-tertiary">No model Dutch was inferred for this snippet.</p>
        )}
      </div>
    </div>
  )
}
