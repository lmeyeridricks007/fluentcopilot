# Train Station — explicit goal & slot tracking (Speak Live)

Structured state for **`train-station`** Speak Live sessions lives in **`SpeakLivePersistedState.scenarioSessionState`** (JSON column `SpeakLiveStateJson` on `ConversationThreads`). It complements the existing FSM (`phase`, `goalsCompleted[]` as scenario indices) with **fine-grained slots**, **evidence per hit**, and **per-turn facts** for users and assistants.

---

## Goal identifiers (`TrainStationGoalId`)

| ID | Meaning |
|----|---------|
| `ASK_DESTINATION` | Destination / “where does this train go” |
| `ASK_DEPARTURE_TIME` | Departure (or arrival) time |
| `ASK_PLATFORM` | Platform / track (`perron`, `spoor`) |
| `ASK_DELAY_STATUS` | On time, late, delay, cancellation |
| `CONFIRM_DETAIL` | Learner double-checks understanding |
| `THANK_AND_CLOSE` | Thanks / goodbye |

### Mapping to seeded scenario goals (`GoalsJson` indices)

| Scenario index | Scenario goal (seed) | Slot IDs that satisfy it |
|----------------|----------------------|---------------------------|
| 0 | Ask which platform… | `ASK_PLATFORM` |
| 1 | Confirm time, delay, destination… | `ASK_DEPARTURE_TIME`, `ASK_DELAY_STATUS`, `ASK_DESTINATION`, `CONFIRM_DETAIL` |
| 2 | Close politely | `THANK_AND_CLOSE` |

`scenarioGoalIndexesFromTrainHits()` derives FSM `goalIndexesCompleted` for the reply merge layer.

---

## `GoalHit` (evidence row)

Each deterministic match produces:

```json
{
  "goalId": "ASK_DELAY_STATUS",
  "matchedText": "Is de trein op tijd?",
  "transcriptTurnId": "<user message UUID>",
  "confidence": 0.92,
  "source": "rule"
}
```

- **`source`**: currently **`rule`** only for the matcher; reserved for `llm` / `hybrid` if we blend later.
- **`transcriptTurnId`**: the persisted user message id for that STT turn.

---

## `ScenarioSessionState` (persisted blob)

| Field | Description |
|-------|-------------|
| `schemaVersion` | `1` |
| `scenarioSlug` | `'train-station'` |
| `sessionId` | Thread id (Speak Live session = thread) |
| `scenarioId` | Scenario UUID |
| `locale` | e.g. `nl-NL` |
| `mode` | `guided` \| `free` |
| `status` | Thread `active` \| `paused` \| `completed` |
| `achievedGoals` | `GoalHit[]` (deduped by `goalId`, first evidence kept) |
| `pendingGoals` | Slots not yet seen |
| `mentionedEntities` | Place names after `naar` / `tot` / `richting` (best-effort) |
| `turnFacts` | Rolling log: user row (`userFacts`, optional `hits`) + assistant row (`assistantFacts`) per exchange |
| `lastUpdatedAt` | ISO timestamp |

---

## Matching rules (deterministic)

Rules live in `backend/src/domain/speakLive/trainStationSlotState.ts` (`USER_RULES`). Highlights:

- **Delay / punctuality:** `is de trein op tijd`, `op tijd`, `vertraging`, `heeft de trein vertraging`, `te laat`, `uitval`, …
- **Time:** `hoe laat`, `op welke tijd`, `wanneer vertrekt|gaat|komt|rijdt`, `wanneer … trein|vertrek|rit`
- **Platform:** `van welk perron`, `welk spoor`, `perron` + `vertrekt|gaat|…`, `welk perron`
- **Destination:** `naar <place>`, `bestemming`, `waar gaat de trein`
- **Confirm:** `klopt`, `begrijp ik`, `dus de trein`, `even checken`
- **Thanks / close:** `dank u`, `bedankt`, `tot ziens`, …

Normalization strips diacritics for matching, folds case, trims punctuation.

### Assistant turn facts (heuristic)

`inferAssistantTrainFacts()` sets booleans when the Dutch reply likely **answered** time, delay, platform, or destination (regex on numbers, `spoor 5`, `op tijd`, etc.). Used in prompts and for future coaching—not for slot “achievement” (learner evidence stays rule-based).

---

## State transitions

1. **Thread start (Speak Live + train-station):** optional empty state; first user turn creates session via `mergeTrainStationScenarioSession({ prev: undefined, … })`.
2. **Each user + assistant pair** (`sendConversationMessage` after assistant insert):
   - Run `detectTrainStationSlots(userText, userMessageId)`.
   - Merge into `achievedGoals` / `pendingGoals` / `mentionedEntities` / `turnFacts`.
   - Serialize into `speakLiveStateJson` with the rest of `SpeakLivePersistedState`.
3. **LLM prompt (same turn, before assistant):** `formatTrainStationSlotBlock(prevState)` + utterance grounding from `formatGroundingForPrompt` are concatenated into the Speak Live system block so the model sees **prior** slots + **current** line facts.
4. **Recap (`endConversation`):** `trainStationRecapSlotSummary(state)` is passed as `ConversationRecapGenerationContext.trainStationSlotRecapSummary` so the recap model cannot ignore structured progress.

---

## Example `GoalHit` payload (abbreviated)

After the learner says *Heeft de trein vertraging?*:

```json
{
  "goalId": "ASK_DELAY_STATUS",
  "matchedText": "Heeft de trein vertraging?",
  "transcriptTurnId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "confidence": 0.92,
  "source": "rule"
}
```

Corresponding `TrainUserTurnFacts`:

```json
{
  "askedDepartureTime": false,
  "askedDelayStatus": true,
  "askedPlatform": false,
  "askedDestination": false,
  "politeClosing": false,
  "confirmDetail": false
}
```

---

## Assistant reply (Train Station Speak Live)

Reply-only turns add a **structured orchestration JSON** in the system prompt (`trainStationReplyOrchestration.ts` → `TurnPromptBuilder`) with `scenarioId`, description, role `station_assistant`, learner level **A2**, latest transcript, achieved/pending slot ids, **alreadyAnsweredFacts** (from prior assistant turn facts), **recommendedNextResponseTarget**, and scenario goal titles.

Hard rules live in `prompts/trainStationReplyPrompt.ts` (answer latest question first, no invented questions, A2 Dutch, mock-profile note for plausible times).

The model returns optional **`trainTurnResponse`** alongside `assistantReply` (see `REPLY_ONLY_JSON_CONTRACT`): `answeredGoals[]`, `unresolvedGoals[]`, `nextLikelyGoal`, `coachNotesOptional`. Validated in `ResponseValidator`. Alias **`assistantMessage`** is accepted as `assistantReply`.

---

## Related code

| File | Role |
|------|------|
| `backend/src/domain/speakLive/trainStationSlotState.ts` | Types, detection, merge, recap/prompt formatters |
| `backend/src/domain/speakLive/trainStationReplyOrchestration.ts` | Orchestration JSON, answered-fact rollup, recommended next target |
| `backend/src/prompts/trainStationReplyPrompt.ts` | Non-drifting reply rules (+ mock hint) |
| `backend/src/domain/speakLive/scenarioIntentGrounding.ts` | Maps slot hits → `GroundedSpeakLivePatch` for `speakLiveSignals` merge |
| `backend/src/domain/speakLive/speakLiveFsm.ts` | Parses/persists `scenarioSessionState` on `SpeakLivePersistedState` |
| `backend/src/services/conversation/conversationAppService.ts` | Runs merge after each turn; recap context; passes `userMessageId` into LLM request |
| `backend/src/prompts/buildRecapMessages.ts` | Injects structured slot summary + transcript precedence rules |
| `backend/src/prompts/buildTurnMessages.ts` | Reply-only system prompt carries orchestration + rules |
| `backend/src/services/ai/orchestration/TurnPromptBuilder.ts` | Builds Train Station blocks for Speak Live |
| `backend/src/services/ai/orchestration/ResponseValidator.ts` | Zod for `trainTurnResponse` + `assistantMessage` alias |

---

## Future work

- Blend **`llm` / `hybrid`** `GoalHit` when the model proposes a slot the rules missed (with lower confidence).
- Generalize **`ScenarioSessionState`** for other scenario slugs (café, etc.).
- Promote **`mentionedEntities`** to a small gazetteer for Dutch station names.
