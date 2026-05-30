# Speak Live mode

Speak Live is a **first-class** FluentCopilot experience: real-time, voice-first practice in a dedicated full-screen flow, separate from the WhatsApp-style text thread. Users discover it from **Talk**, enter through a **fast selector**, and **exit cleanly** back to Talk without breaking existing navigation.

## Routes

| URL | Purpose |
|-----|---------|
| `/app/talk/live` | Selector + marketing copy. Normal app chrome (header + bottom nav). |
| `/app/talk/live/run` | Immersive Speak Live session shell. Query params carry configuration (see below). |
| `/app/speak-live` | **Alias** — server redirect to `/app/talk/live`. |

### Query parameters (`/app/talk/live/run`)

| Param | Values | Notes |
|-------|--------|------|
| `scenarioId` | e.g. `train-station`, `cafe` | Passed to future thread/API start; must match backend scenario slug or id where supported. |
| `mode` | `guided` \| `free` | Same semantics as text threads (`ConversationMode` in code). |
| `level` | `A1`, `A2`, `B1` | Learner CEFR target for coaching copy and future STT tuning. |

Canonical builders live in `src/lib/routing/appRoutes.ts` (`speakLiveRunHref`, `APP_SPEAK_LIVE`, `APP_SPEAK_LIVE_RUN`).

## Product naming vs code

Historically, **`ConversationMode`** in the codebase means **guided vs free** pacing on a thread. That must stay stable for prompts and thread logic.

The **text vs Speak Live** axis is modeled separately:

| Concept | Type / field | Values |
|---------|----------------|--------|
| Pacing | `ConversationMode` (`mode` on thread, API `mode`) | `guided` \| `free` |
| Channel / surface | `ConversationSurface` (`conversationSurface` on thread, API `conversationSurface`) | `text` \| `speak_live` |

Product or UX copy that says “conversation mode: text or Speak Live” maps to **`ConversationSurface`** (and the API field `conversationSurface`), not to `guided`/`free`.

Shared definition (frontend): `src/lib/conversation/conversationSurface.ts`.  
Backend mirror: `backend/src/models/contracts.ts` (`ConversationSurface`).

## Persistence

- SQL migration: `backend/database/migrations/003_conversation_surface.sql` adds `ConversationSurface` to `dbo.ConversationThreads` with default `text`.
- `POST /conversations/start` accepts optional `conversationSurface`. Omitted ⇒ `text` (existing behaviour).

## Entry points (IA)

1. **Talk → Now** — Primary card: “Speak Live” with **Start speaking** / **Choose scene first** (`TalkNowPanel`).
2. **Talk → `/app/talk/live`** — Dedicated landing + selector.
3. **Active text thread** — Secondary **Switch to speaking** (`TrainStationChatPage`) pre-fills scenario slug, pacing, and level.
4. **Coach** — Compact **Speak Live** chip in the header (`CoachHubPage`).

## Exit and summary

- **Exit to Talk** — Primary control on the run screen; returns to `/app/talk`.
- **Save session** — Prototype: appends a row to `localStorage` under `fc-speak-live-saved-sessions` (device-local).
- **View summary** — Navigates to `/app/talk?speakLiveSummary=1`; `PracticeHubPage` shows a dismissible banner describing future recap wiring.

## Layout

`AppLayout` hides **Header**, **TrialBanner**, and **BottomNav** when the path starts with `/app/talk/live/run` so the voice surface is not squeezed under global chrome.

## Regression notes

- Text chat routes (`/app/talk/thread/...`) unchanged.
- `guided` / `free` and feedback timing unchanged.
- Bottom nav “Talk” remains active for `/app/talk/live` (same tab family as `/app/talk`).
