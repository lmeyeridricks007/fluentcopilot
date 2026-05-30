# Live speech latency benchmark (methodology)

This document defines **how** to benchmark Speak Live; numbers vary by machine, region, model, and keys.

## Scenarios (Dutch)

1. **Short:** “Is de trein op tijd?”
2. **Medium:** “Hoe laat vertrekt de trein naar Amsterdam?”
3. **Multi-intent:** “Is de trein op tijd en van welk perron vertrekt hij?”

## Procedure

1. Non-production build, `NEXT_PUBLIC_SPEAK_LIVE_BROWSER_AZURE_STT=1`, `NEXT_PUBLIC_CONVERSATION_STREAM=1`.
2. Open Speak Live dev overlay (`LiveSpeechPerfOverlay`).
3. For each phrase: hold mic → speak → release; record one row per turn.

## Metrics to capture

| Metric | Source |
|--------|--------|
| Transcript partial → final | Client trace |
| Server `stateLoadMs` / `llmMs` | `liveTurnLatencyTrace` on `done` |
| Text visible | Client `llmToTextRenderMs` |
| TTS | Client `ttsMs` |
| Playback | Client `playbackStartMs` |
| Total | Client `totalMs` + server `serverTotalMs` |

## Targets (product)

| Stage | Target |
|--------|--------|
| Transcript after stop | < 1.5 s |
| Assistant text after final transcript | < 2.5 s |
| Audio start | < 4 s |

## Before / after (this change set — qualitative)

| Area | Expected improvement |
|------|----------------------|
| LLM start blocked on blob upload | **Removed** (upload overlaps LLM) |
| Scenario/persona SQL | **Reduced** via TTL cache on hot path |
| Prompt size | **Smaller** default recent turns (4), tighter train JSON cap |
| Phrase end (Azure) | **Faster** default segmentation silence (320 ms) |
| Observability | **Structured** trace + budgets + overlay |

## After run — fill in locally

| Utterance | Before total (ms) | After total (ms) | Dominant stage |
|-----------|-------------------|------------------|----------------|
| Short | _ | _ | _ |
| Medium | _ | _ | _ |
| Multi | _ | _ | _ |

_Re-run after changing `LIVE_REPLY_MODEL` or Azure region._
