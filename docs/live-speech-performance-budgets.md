# Live speech performance budgets

Configurable targets for product tuning and warnings. **Client** measures wall time from mic release through playback; **server** measures handler time through persist (no browser TTS).

## Environment variables (backend)

| Variable | Default (ms) | Meaning |
|----------|----------------|----------|
| `LIVE_TRANSCRIPT_BUDGET_MS` | 1500 | Target for transcript finalization (primarily **client** / Azure STT) |
| `LIVE_LLM_BUDGET_MS` | 2500 | Target for server Stage A LLM duration |
| `LIVE_TTS_BUDGET_MS` | 1500 | Target for TTS (primarily **client** `requestGenerateSpeech`) |
| `LIVE_TOTAL_BUDGET_MS` | 5000 | Soft total for server handler (`liveTurnLatencyTrace.totalMs`) |

Server-side checks in `liveTurnServerLatencyTrace.ts` currently flag **`liveLlmBudgetMs`** and **`liveTotalBudgetMs`**; exceeded keys appear as `budgetsExceeded` on `liveTurnLatencyTrace`.

## Hard warning

When server `totalMs` **> 5000**, the backend logs:

`WARNING: LIVE TURN OVER BUDGET` (JSON line to `console.warn`).

The browser dev build logs the same string when **client** `LiveSpeechTurnTimer.finish().totalMs > 5000`.

## Dev overlay

In Speak Live (`LiveSpeechPerfOverlay`, non-production builds), rows include server LLM / state load / bottleneck / token estimates / budgets exceeded.

## Related

- `docs/live-speech-fast-path.md`
- `docs/live-turn-bottleneck-report.md`
