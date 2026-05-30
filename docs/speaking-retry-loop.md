# Speaking retry loop & targeted practice (Phase 6)

End-user goal: **after pronunciation feedback, the next step is obvious** — retry the full line, a difficult phrase or word with Azure scoring against that text, optionally run a **shadow** pass (listen → pause → record), and **save** useful material to the library.

## Retry targets (`phraseTargets`, `coaching.retryTarget`)

- **Full speaking assessment** (`SpeakingAssessmentViewModel`) already carries `phraseTargets[]` and `coaching.retryTarget` from the LLM orchestration stack.
- **Sticky composer path** (`POST /api/speech/pronunciation-assessment`) attaches **`retryHints`** on the JSON response: same shape (`phraseTargets`, `coaching.retryTarget` / `retryWhy`), derived **deterministically** from Azure word scores in `backend/src/services/speech/buildPronunciationRetryHints.ts` (no extra LLM call).

The client maps this in `resolveRetryUi()` (`src/lib/speaking/pronunciationCoachModel.ts`):

- **Primary CTA** follows `coaching.retryTarget` when present (full line vs multi-word vs single-word); if absent, falls back to the previous fluency / weak-word heuristic.
- **Default** when there is no meaningful subset remains **full sentence** (`onQueuePhraseAssessment(null)`).

## Partial / subset assessment (backend + client)

- The pronunciation API already supports **`assessmentMode: "reference"`** with **`expectedText`** set to any substring (phrase or single word). Azure compares the learner clip to that reference line.
- The sticky hook keeps an **`assessmentOverrideRef`**: when the user chooses phrase/word retry (or shadow), the next assessment uses `expectedText = override` instead of the thread’s `voiceReferencePhrase`.
- **`transcript`** is still the Whisper result of what the learner said (required for `open_response`; for `reference` the server still receives it for logging / consistency).
- **Phrase-only reference audio** is not a separate binary: the client requests TTS for the **same substring** via `GET /api/speaking/reference-audio?text=…` (`getSpeakingReferenceAudio`), so the reference always matches the assessment target.

## Shadow mode (V1)

Flow (sticky composer only; `layout="thread"` does not expose shadow):

1. User taps **Shadow practice (listen → record)** on the coach card.
2. `beginShadowPractice(chunk)` sets `assessmentOverrideRef`, updates the composer to the chunk, dismisses the feedback card, and sets phase `shadow_listen`.
3. `StickyChatComposer` plays reference audio for `shadowListenText` (server TTS when configured, else browser `speechSynthesis`).
4. Short pause (~450 ms), then `completeShadowListenAndArmRecording()` arms **MediaRecorder** (same path as normal dictation).
5. User stops → Whisper runs with `purpose: "shadow_retry"` (logging), then pronunciation assessment uses **`reference` + override `expectedText`** so scores apply to **that chunk only**.

Cancel: **Cancel shadow** or composer-level cancel clears override and returns to idle.

## Save to library

From the feedback card, learners can save:

- Whole coaching line (`fullLine`)
- Difficult phrase / word chips
- **`coaching.retryTarget`** when it is distinct from the other chips (deduped by normalized text)

Wiring remains `onSavePhrase` → `handleSave` in `TrainStationChatPage` (see Phase 5).

## Re-record vs Discard (review)

- **Discard** runs `discardTranscriptReview()` — restores the composer to the text captured *before* the last voice take and clears any queued **assessment override** (user is abandoning the take).
- **Re-record** from review clears feedback UI but **keeps the current composer** and the override so phrase/word retry and Azure subset scoring still apply on the next clip.

## Acceptance checklist

| Criterion | Mechanism |
| --------- | ----------- |
| Retry actions work | Retry CTAs call `apply` + `queueReferenceOnlyAssessment` / `null` for full line |
| Phrase retry works | Override `expectedText` on next mic cycle |
| Shadow V1 works | `shadow_listen` + TTS + auto record + `shadow_retry` transcribe purpose |
| Library saves | Save chips + stable `sourceMessageId` / disambiguators from Phase 5 |

## Files touched (Phase 6)

- Backend: `buildPronunciationRetryHints.ts`, `pronunciationAssessmentContracts.ts`, `pronunciationAssessmentGateway.ts`, `speakingAssessmentMapper.ts` (unused import)
- Client: `speechInputTypes.ts`, `useStickyVoiceInput.ts`, `StickyChatComposer.tsx`, `SpeakingCoachFeedbackExperience.tsx`, `VoiceQualityFeedbackCard.tsx`, `pronunciationCoachModel.ts`, `audioPronunciationTypes.ts`, `speechClient.ts` (comment only)
