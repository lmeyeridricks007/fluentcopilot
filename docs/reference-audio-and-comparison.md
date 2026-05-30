# Reference audio and “Listen and compare” (Phase 3)

FluentCopilot generates **native-style Dutch reference clips** (normal, slower, chunked) for speaking practice, alongside the learner’s own recording. This is **coach UX**, not linguistic ground truth.

## Backend

### Services

| Piece | Path | Role |
|-------|------|------|
| Chunking | `backend/src/services/speaking-assessment/sentenceChunkingForReference.ts` | Conservative phrase splits (commas/semicolons, then short word groups) for chunked TTS. |
| Azure TTS | `backend/src/services/speaking-assessment/azureNeuralReferenceTts.ts` | Neural voices via SSML (rate, `<break>` between chunks). |
| Reference orchestration | `backend/src/services/speaking-assessment/referenceAudioService.ts` | Resolves `normalUrl` / `slowUrl` / `chunkedUrl` (data URLs) or signals browser fallback. |
| Cache | `backend/src/services/speaking-assessment/referenceAudioCache.ts` | Key = SHA-256 of `locale \| voice \| speedMode \| normalized text`. Memory LRU + optional disk (`SPEAKING_REFERENCE_AUDIO_CACHE_DIR` or `AUDIO_TTS_DISK_CACHE_DIR` as `.txt` holding the `data:` URL string). |

### Provider selection

Configured in `speakingAssessmentConfig.ts`:

- **`SPEAKING_REFERENCE_AUDIO_PROVIDER`** (optional): `azure` | `openai` | `browser-fallback`, or unset for **auto**.
- **Auto order:** Azure when `AZURE_SPEECH_KEY` + `AZURE_SPEECH_REGION` are set; then OpenAI if `OPENAI_API_KEY` is set. If neither, **`useBrowserTts: true`** on the API and URLs are `null`.
- **Forced `azure`** without Azure keys → tries OpenAI only if a key exists.
- **OpenAI TTS** uses the same disk/memory cache as assistant TTS, with an extra **purpose** segment in the cache key (`speaking_reference_*`) so reference clips never collide with chat audio.

### Voices

| Provider | Default | Override |
|----------|---------|----------|
| Azure Neural | `nl-NL-FennaNeural` | `AZURE_TTS_VOICE` |
| OpenAI | `coral` | `SPEAKING_OPENAI_TTS_VOICE` or `OPENAI_TTS_VOICE` |

### HTTP

- **`POST /api/speaking/assess`** with `includeReferenceAudio: true` — orchestrator calls `ReferenceAudioService.resolveReferenceAudio` (all three variants in parallel, each cached independently).
- **`GET /api/speaking/reference-audio?text=…&speed=normal|slow|chunked&locale=…&voice=…`** — lazy single-variant resolve (`resolveOneSpeed`), same cache keys.

Response fields include **`useBrowserTts`** when the server will not synthesize (no keys / forced browser).

### Chunked audio

- **Azure:** one SSML utterance with **450 ms** breaks between coaching chunks.
- **OpenAI:** no SSML breaks — chunks are joined with **`. `** and slightly slower playback (`speed` ~0.9) to keep one MP3 without a merge step.

## Frontend

| Piece | Path |
|-------|------|
| Client | `src/lib/speaking/speakingAssessmentClient.ts` — `getSpeakingReferenceAudio` |
| Chunk mirror | `src/lib/speaking/chunkReferenceTextForListen.ts` — same rules as backend for **browser** sequential playback |
| UI | `src/features/feature1-chat/components/ListenAndComparePanel.tsx` |
| Wiring | `VoiceQualityFeedbackCard` + `StickyChatComposer` (+ thread layout in `TrainStationChatPage`) |

### Behaviour

- **One active player:** starting a new clip stops the previous `<audio>` or `speechSynthesis` queue.
- **Lazy load:** first tap on Reference / Slower / In chunks fetches that variant (unless cached in component state).
- **No API base URL:** falls back to **browser TTS** for reference (dev convenience).
- **Shadow prep:** chunked browser path plays **utterances in sequence** using the same chunk list as server chunking logic (keep files aligned when changing rules).

## Limitations

- Data URLs in JSON can be **large**; keep expected lines reasonably short for mobile.
- OpenAI chunked timing is **approximate** (punctuation-based), not identical to Azure `<break>`.
- Browser TTS **quality and voice** vary by OS; use only as last resort.

## Related

- Speaking foundation: `docs/speaking-feedback-foundation.md`
- Derived timing signals: `docs/speaking-derived-analysis.md`
