# Speak Live — save for later (training queue)

## Product intent

From the **voice coach report**, learners save **specific** follow-ups (pronunciation, rhythm, phrasing, sentence drill, repeat scenario, library phrase/word, review queue, coach follow-up). Items land in **`SavedTrainingItems`** for downstream surfaces (Library, Coach, Review, targeted Speak Live) to consume.

## API

- `POST /api/training-items/saved` — create a practice object.
- `GET /api/training-items/saved?tagCategory=&itemType=&limit=` — list for Library, coach, review builders.

`POST /api/training-items/saved`

Headers: `x-user-id` (dev) — same as other Functions.

### Body (JSON)

| Field | Type | Required | Notes |
|-------|------|------------|-------|
| `sourceSessionId` | uuid | yes | Speak Live thread id. |
| `sourceTurnId` | string | no | Turn / user message id from Speak Live (≤80 chars). |
| `type` | string | yes | See mapping below. |
| `title` | string | yes | Short label (UI). |
| `content` | string | yes | Drill payload: transcript + improved line, notes, etc. |
| `audioReferenceUrl` | string | no | Optional HTTP(S) or `data:` URL. |
| `learnerAudioUrl` | string | no | Optional learner clip URL. |
| `metadata` | object | no | Free-form JSON (e.g. `{ scenarioId, level }`). |
| `sourceScenarioId` | string | no | Scenario slug; defaults from thread + scenario catalog. |
| `learnerOriginalSentence` | string | no | Stored column for drills / Library. |
| `improvedSentence` | string | no | Reference / improved Dutch line. |
| `tagCategory` | string | no | Override inferred rail (`library`, `coach_follow_up`, …). |
| `suggestedTrainingMode` | string | no | Override inferred modality (`read_aloud`, `voice_session`, …). |

### Type mapping (API → storage)

The API accepts product-oriented aliases; the repository stores canonical enums:

| Request `type` | Stored `ItemType` |
|----------------|-------------------|
| `library_phrase`, `save_phrase`, `save_improved_version` | `phrase` |
| `library_word`, `word` | `word` |
| `save_pronunciation_word` | `pronunciation_drill` |
| `save_rhythm_drill` | `rhythm_drill` |
| `save_natural_phrasing` | `natural_phrasing_drill` |
| `coach_follow_up` | `coach_followup` |
| `repeat_scenario`, `scenario_follow_up`, `scenario_followup` | `scenario_followup` |
| others | unchanged (`speaking_drill`, `sentence_drill`, `review_queue`, …) |

## SQL: `SavedTrainingItems`

Full practice-object contract: **[saved-training-items-schema.md](./saved-training-items-schema.md)** (includes migration **006** rails).

| Column | Notes |
|--------|--------|
| `Id` | UUID PK |
| `UserId` | Internal user |
| `SourceSessionId` | Thread UUID |
| `SourceTurnId` | Optional learner message id |
| `SourceScenarioId`, `LearnerOriginalSentence`, `ImprovedSentence` | Scenario + sentence pair (006) |
| `TagCategory`, `SuggestedTrainingMode` | Library / coach / review / drill routing |
| `ItemType` | Canonical type (see repository) |
| `Title`, `Content` | Learner-facing |
| `AudioReferenceUrl`, `LearnerAudioUrl` | Optional URLs |
| `MetadataJson` | JSON blob |

Indexes: `IX_SavedTrainingItems_User_Created`, `IX_SavedTrainingItems_User_Tag_Created`.

## Integration (current vs future)

**Implemented now**

- Persist rows via `POST /training-items/saved` with rails columns + inferred tags/modes.
- `GET /training-items/saved` for downstream lists.
- Voice report UI merges coach actions + canonical save targets per turn (`buildMergedTurnSaveActions`).
- Library **Saved** tab: `LibrarySavedFromVoiceSection` loads server items and links into voice / read-aloud / coach / review.

**Future enhancements**

- Coach hub: read `savedTraining` query param and hydrate cards from `tagCategory=coach_follow_up`.
- Review module: dedicated queue UI over `review_queue` + `sentence_drill`.
- Speak Live: “resume drill list” from saved pronunciation/rhythm items.

## Privacy / retention

Audio URLs may be **relative API paths** (authenticated fetch) or short-lived `data:` URLs from TTS. Blob retention policies are environment-specific — document in deployment runbooks when enabling production storage.
