# Saved training items — FluentCopilot long-term practice objects

Post-session **Speak Live voice evaluation** (and future surfaces) persist learner-chosen drills into `dbo.SavedTrainingItems`. Rows are **practice objects**, not passive notes: each carries type, routing tags, suggested modality, sentences, and optional audio URLs for downstream modules.

## HTTP

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/training-items/saved` | Create item (voice report, recap, future UIs). |
| `GET` | `/api/training-items/saved?tagCategory=&itemType=&limit=` | List current user’s items (Library, coach prefetch, review builders). |

Headers: `x-user-id` (dev) or production auth as for other Functions.

## Columns (after migration `006_saved_training_training_rails.sql`)

| Column | Type | Purpose |
|--------|------|---------|
| `Id` | uniqueidentifier | PK |
| `UserId` | uniqueidentifier | Owner |
| `SourceSessionId` | uniqueidentifier | Speak Live thread id |
| `SourceTurnId` | nvarchar(64) | Learner turn / message id |
| `SourceScenarioId` | nvarchar(200) | Scenario slug or id (e.g. `train-station`) |
| `LearnerOriginalSentence` | nvarchar(max) | What the learner said / tried |
| `ImprovedSentence` | nvarchar(max) | Coach reference / improved Dutch |
| `TagCategory` | nvarchar(64) | **Routing**: `library` · `coach_follow_up` · `review_queue` · `speaking_drill` · `pronunciation_drill` · `rhythm_drill` · `phrasing_upgrade` · `general` |
| `SuggestedTrainingMode` | nvarchar(64) | **Modality hint**: `talk_focus` · `read_aloud` · `voice_session` · `shadowing` · `review_then_speak` · `coach_card` · `practice_object` |
| `ItemType` | nvarchar(64) | Canonical storage enum (see repository) |
| `Title`, `Content` | nvarchar | UI label + drill payload / notes |
| `AudioReferenceUrl`, `LearnerAudioUrl` | nvarchar(2048) | Optional playback URLs |
| `MetadataJson` | nvarchar(max) | Extra JSON (`scenarioId`, `level`, `saveRequestType`, …) |
| `CreatedAt` | datetime2 | Sorting |

Index: `IX_SavedTrainingItems_User_Tag_Created (UserId, TagCategory, CreatedAt DESC)`.

## Request `type` → stored `ItemType` + default `TagCategory`

The API accepts product-oriented `type` values; the server maps to `ItemType` and infers `TagCategory` / `SuggestedTrainingMode` unless the client overrides them.

| Request `type` | Stored `ItemType` | Default `TagCategory` |
|----------------|-------------------|------------------------|
| `save_phrase`, `library_phrase` | `phrase` | `library` |
| `save_improved_version` | `phrase` | `library` |
| `library_word`, `word` | `word` | `library` |
| `save_pronunciation_word` | `pronunciation_drill` | `pronunciation_drill` |
| `save_rhythm_drill` | `rhythm_drill` | `rhythm_drill` |
| `save_natural_phrasing` | `natural_phrasing_drill` | `phrasing_upgrade` |
| `sentence_drill` | `sentence_drill` | `review_queue` |
| `review_queue` | `review_queue` | `review_queue` |
| `speaking_drill` | `speaking_drill` | `speaking_drill` |
| `coach_followup`, `coach_follow_up` | `coach_followup` | `coach_follow_up` |
| `scenario_follow_up`, `repeat_scenario`, … | `scenario_followup` | `coach_follow_up` |

## Example rows (illustrative JSON)

**Library — saved phrase**

```json
{
  "id": "b2c4f8a1-…",
  "sourceSessionId": "9f3e…",
  "sourceTurnId": "a11b…",
  "sourceScenarioId": "train-station",
  "learnerOriginalSentence": "Ik wil een kaartje naar Utrecht.",
  "improvedSentence": "Een enkele reis naar Utrecht, graag.",
  "tagCategory": "library",
  "suggestedTrainingMode": "talk_focus",
  "itemType": "phrase",
  "title": "Save phrase to Library",
  "content": "Ik wil een kaartje naar Utrecht.\n---\nEen enkele reis naar Utrecht, graag.",
  "audioReferenceUrl": "https://…/api/speak-live/session/…/reference-audio/…",
  "learnerAudioUrl": "https://…/api/speak-live/session/…/learner-audio/…",
  "metadataJson": "{\"scenarioId\":\"train-station\",\"level\":\"A2\",\"saveRequestType\":\"save_phrase\"}"
}
```

**Pronunciation drill queue**

```json
{
  "tagCategory": "pronunciation_drill",
  "suggestedTrainingMode": "voice_session",
  "itemType": "pronunciation_drill",
  "title": "Add to pronunciation practice",
  "learnerOriginalSentence": "Ik wil een kaartje naar Utrecht.",
  "improvedSentence": "Een enkele reis naar Utrecht, graag."
}
```

**Coach follow-up**

```json
{
  "tagCategory": "coach_follow_up",
  "suggestedTrainingMode": "coach_card",
  "itemType": "coach_followup",
  "title": "Send to Coach follow-up",
  "content": "…"
}
```

## Downstream consumption (FluentCopilot)

| Surface | Query | Notes |
|---------|-------|------|
| **Library** | `GET …/saved?limit=40` | `LibrarySavedFromVoiceSection` merges server list with local bank. |
| **Voice / speaking** | `practiceHrefForSavedItem()` | Builds `/app/practice/voice` or `/app/practice/reading-aloud` with `practiceText`, `trainingFocus`, `savedId`. |
| **Coach hub** | `tagCategory=coach_follow_up` | Deep link includes `savedTraining` id; coach UI can prefetch these rows. |
| **Review** | `tagCategory=review_queue` | `/app/review?source=saved_training` entry point; filter `sentence_drill` / `review_queue`. |

Practice pages may ignore unknown query params until wired; **persistence and categorization** are the contract for product iteration.
