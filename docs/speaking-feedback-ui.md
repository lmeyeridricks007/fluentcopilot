# Speaking feedback UI (Phase 5)

Premium, mobile-first **Dutch speaking coach** surface for Azure pronunciation assessment in Feature 1 chat. It replaces a generic “score card” with coach-like sections: verdict, dimensions, strengths, next steps, optional word detail, listen/compare, retry, and save chips.

## Data source

- **Current path:** `PronunciationAssessmentApiResponse` from `POST /api/speech/pronunciation-assessment` (sticky composer after mic review, and optional thread replay when `voiceQuality` is attached to a user message).
- **Derived coaching:** `src/lib/speaking/pronunciationCoachModel.ts` maps scores + words into headlines, five dimension rows, bullet lists, retry targets, and word bands. It does **not** depend on the full speaking-assessment LLM stack (`retryTarget` from that stack is not on this payload yet; primary retry is inferred from fluency and weak words).

## Component tree

```
VoiceQualityFeedbackCard
├── (no assessment) error panel + dismiss
└── SpeakingCoachFeedbackExperience
    ├── Header: “How this sounded”, verdict, summary, dismiss
    ├── DimensionCard × 5 (pronunciation, rhythm, sentence stress, intonation, naturalness)
    ├── BulletList — what went well
    ├── BulletList — what to improve next
    ├── Expandable — word-by-word (weak words, bands: strong / okay / work on this)
    ├── ListenAndComparePanel (visualStyle="premium", onRegisterHandlers)
    │   └── PlaybackChip (premium) — reference / slower / chunks / your clip; single-flight audio
    ├── RetryCta × 4 — full line, phrase, word, shadow native (→ playReference)
    ├── SaveChip row — bookmark + copy
    └── Primary CTA strip — “Practice … in composer” (sticky when layout=composer)

StickyChatComposer
└── VoiceQualityFeedbackCard (layout default: composer)
```

## Layout modes

| `layout`   | Where used                         | Primary CTA strip                          |
| ---------- | ---------------------------------- | ------------------------------------------ |
| `composer` | Sticky composer voice review       | `sticky` bottom bar + safe-area padding    |
| `thread`   | Inline card under a user message | Static footer (avoids nested sticky scroll) |

Props on `VoiceQualityFeedbackCard`: `onApplyPhraseToComposer`, `onSavePhrase` — wired from `TrainStationChatPage` to `setComposer` and `handleSave` (library), with stable synthetic `sourceMessageId` for composer-only review (`voice-feedback-${threadId}`) and per-message ids in thread.

## Design tokens

Reuse FluentCopilot-style Tailwind tokens already in chat: `text-ink-primary`, `text-ink-secondary`, `text-ink-tertiary`, `text-body-sm`, `text-caption`, `bg-surface-elevated`, `bg-primary-50`, `border-primary-*`, `min-h-touch`, `rounded-2xl`, primary CTA colors (`bg-primary-600`, etc.). Premium elevation uses subtle gradients and soft shadows on the coach card only.

## Acceptance mapping

| Requirement              | Implementation |
| ------------------------ | -------------- |
| Human verdict            | `buildSpeakingTopVerdict` |
| Five dimensions + tags   | `buildCoachDimensionsFromPronunciation` + quality tags on cards |
| Compare + one audio      | `ListenAndComparePanel` registers handlers; `stop()` before other plays |
| Retry + highlighted primary | Heuristic `primaryRetry` + `RetryCta` ring + bottom button |
| Mobile                   | Large tap targets, spacing, expandable word wall |
| Docs                     | This file |

## Future: full speaking assessment

When the client receives LLM coaching + `retryTarget`, prefer that string to choose the highlighted retry CTA and optional copy refresh, while keeping Azure scores as the numeric ground truth.
