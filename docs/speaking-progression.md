# Speaking progression (Phase 7)

Goal: show **improvement over time**, not only the last clip — with **honest, low-precision** language (improving / steady / needs more data).

## What is stored

Each row is a compact **`SpeakingProgressRecordV1`** line in a per-user JSONL file (when progression is enabled):

| Field | Source |
| ----- | ------ |
| `scenarioId`, `scenarioTitle`, `threadId`, `level` | Optional `progressMeta` on pronunciation API; speaking assess uses `scenarioId` / `scenarioName` / `body.level` |
| `rawScores` | Azure pronunciation snapshot (`pronunciation`, `fluency`, `completeness`, `overall`, `prosody`, `accuracy`) |
| `derivedScores` | Same proxies as the speaking coach dimensions (rhythm / stress / naturalness / intonation) |
| `verdictLabels` | Heuristic labels for pronunciation-only; full `verdicts` for speaking assess |
| `retryTarget` | `retryHints.coaching.retryTarget` or full assess `coaching.retryTarget` |
| `weakWordsTop` | Lowest-accuracy tokens (normalized, capped) |
| `phraseSnippets` | Phrase-target texts (capped) |
| `dutchSoundingLabel` | Full speaking assess only (`coaching.dutchSoundingLabel`) |
| `createdAtUtc` | Server timestamp |

## When rows are written

1. **`POST /api/speech/pronunciation-assessment`** — after a successful assessment, **fire-and-forget** append (errors swallowed so scoring never fails).
2. **`POST /api/speaking/assess`** — after the canonical row is saved to the speaking-assessment store, append a richer snapshot.

## Configuration (backend)

- **`SPEAKING_PROGRESS_ENABLED=1`** or **`SPEAKING_PROGRESS_STORE_PATH`** — turns on append + read APIs.
- Default directory when path unset: `data/speaking-progress/` under the Functions app cwd.

## Aggregation (`GET /api/speaking/progression`)

Returns `{ enabled, summary }`:

- **`trust`**: `needs_more_data` if &lt; 5 clips, `limited` if &lt; 12, else `moderate` (never claims lab precision).
- **Pronunciation / rhythm / naturalness**: compare mean of **earlier third** vs **recent third** of the score series; thresholds are **±3 points** on the 0–100-style scale → `improving` | `steady` | `unclear` | `needs_more_data`.
- **Common weak words / patterns**: frequency counts; **repeated weak areas** text only when count ≥ 2.
- **Recommended next track**: short heuristic copy from top weak token or phrase.

## Frontend

- **Route:** `/app/talk/speaking-progress`
- **Entry:** link on Talk hub (`PracticeHubPage`) — “How your Dutch is sounding over time”.
- **Client:** `fetchSpeakingProgression()` in `src/lib/speaking/speakingProgressClient.ts`.
- **Pronunciation requests** optionally send `progressMeta` (`threadId`, `scenarioId`, `scenarioTitle`, `level`) from `useStickyVoiceInput` when the Feature 1 API is enabled.

## Trustworthiness (product)

- No decimal precision; trends are **buckets**, not slopes with confidence intervals.
- Copy stresses **coarse averages** and **coach language**, not acoustic truth.
- When storage is disabled, the UI explains env flags instead of fabricating charts.
