# Speak Live — grounded session recap (Train Station)

## Problem

End-of-session recaps sometimes contradicted the real conversation (for example claiming the learner never asked about punctuality or departure time) because the model leaned on a **free-form rolling summary** that could drift or be wrong.

## Approach

1. **Primary grounding** — For Train Station Speak Live (`scenario.slug === train-station'` and `conversationSurface === speak_live`), we inject a JSON blob built from persisted slot state: `LiveScenarioRecapInput` (`backend/src/domain/speakLive/trainStationLiveRecapInput.ts`). It includes `achievedGoals`, `pendingGoals`, `transcriptEvidence` (quotes resolved from message ids where possible), `turnFactsDigest`, and weak language signals from feedback rows.

2. **Prompt order** — In `buildRecapUserPayload`, that JSON is labeled `PRIMARY GROUNDING` and appears **before** the transcript. The rolling English summary is demoted to `LOWEST PRIORITY` and explicitly marked as possibly stale when structured grounding exists (`backend/src/prompts/buildRecapMessages.ts`).

3. **Deterministic reconciliation** — After the LLM returns recap JSON, `reconcileTrainStationLiveRecap` overwrites `goalsCompleted`, `goalsMissed`, and `transcriptEvidence` from slot hits, prepends evidence-based `whatWentWell` lines, and strips `whatToImprove` lines that look like false negatives (e.g. “you did not ask…” when delay/time goals were achieved). This removes incorrect “missed goal” claims even if the model mis-read the thread (`backend/src/services/conversation/conversationAppService.ts`).

4. **Extended recap schema** — `RecapZ` / `validateAndMapRecapJson` accept optional `goalsCompleted`, `goalsMissed`, `languageNotes`, `transcriptEvidence`, `recommendedNextStep`, `dutchUpgrade`, and `savedWordSuggestions` (merged into `saveWordCandidates`) (`backend/src/services/ai/orchestration/ResponseValidator.ts`).

5. **Frontend** — `mapApiSummaryToRecapView` maps structured fields into `ConversationRecapViewModel` (`youAskedAbout`, `youCouldStillAdd`, `tryNext`, `dutchUpgradeLines`). `SpeakLiveSessionRecapView` renders the grounded sections: **You asked about**, **You still could add**, **Try next**, **Dutch upgrade**, then language/pronunciation blocks as before.

## Example corrected recap (illustrative)

After the learner says *“Is de trein op tijd?”* and *“Hoe laat vertrekt de trein?”*, stored state includes `ASK_DELAY_STATUS` and `ASK_DEPARTURE_TIME`. The persisted summary JSON will include, among other fields:

```json
{
  "goalsCompleted": ["ASK_DELAY_STATUS", "ASK_DEPARTURE_TIME", "ASK_PLATFORM"],
  "goalsMissed": ["ASK_DESTINATION", "CONFIRM_DETAIL", "THANK_AND_CLOSE"],
  "transcriptEvidence": [
    { "goalId": "ASK_DELAY_STATUS", "quote": "Is de trein op tijd?" },
    { "goalId": "ASK_DEPARTURE_TIME", "quote": "Hoe laat vertrekt de trein?" }
  ],
  "whatToImprove": ["You could add articles in longer sentences."],
  "recommendedNextStep": "Ask your destination in one Dutch sentence, then listen for the answer.",
  "dutchUpgrade": ["Practice “naar [plaats]” with a clear place name."]
}
```

The UI will **not** list delay or departure under “You still could add”, and will not claim the learner failed to ask about them.

## Tests

- `backend/src/domain/speakLive/trainStationLiveRecapInput.test.ts` — evidence quotes + reconciliation removes false negatives.
- `backend/src/services/ai/orchestration/responseValidator.test.ts` — extended recap JSON parsing.
- `src/lib/api/conversationMappers.test.ts` — FE mapping for grounded fields.

## Developer debug (grounding + recap)

- **Server (non-`production`)**: set `SPEAK_LIVE_DEBUG_PANEL=1` or `SPEAK_LIVE_DEBUG_TURNS=1` to attach `lastGroundingDebug` on persisted Speak Live state after each turn, emit structured logs (`speak_live_grounding_debug`, `speak_live_recap_debug`), and include `speakLiveRecapDebug` on `POST .../conversations/:id/end` when applicable.
- **Client**: set `NEXT_PUBLIC_SPEAK_LIVE_DEBUG_PANEL=1` to show the collapsible **Train grounding** panel on Speak Live run + recap (Train scenario only). The panel refreshes thread data and shows last transcript, slot goals, prompt snapshot, model output, and recap input JSON when the server has written `lastGroundingDebug`.
