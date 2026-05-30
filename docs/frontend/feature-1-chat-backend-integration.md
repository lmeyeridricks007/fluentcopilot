# Feature 1 — Chat / text conversation (frontend ↔ backend)

This document describes how the Talk train-station chat vertical slice integrates with the Azure Functions API.

## Surfaces wired to the backend

When **backend mode** is active (see below), these flows use HTTP instead of the local mock store:

- **Talk → Now** — `GET /api/talk/continue` for the continue card; `POST /api/conversations/start` when starting a new chat.
- **Thread** — `GET /api/conversations/{threadId}` to load messages, scenario, persona, and feedback rows.
- **Send** — `POST /api/conversations/{threadId}/messages` with loading/typing state and merged thread updates.
- **End** — `POST /api/conversations/{threadId}/end`; recap is cached for navigation and persisted as JSON in `summaryText` on the thread.
- **Recap** — reads React Query cache after end, or refetches the thread and parses `summaryText` JSON on refresh.
- **Save word** — `POST /api/saved-words`, then merges the returned item into the Library store (with server id for deduplication).

## Client / service structure

| Path | Role |
|------|------|
| `src/lib/api/apiConfig.ts` | Base URL, `getFeature1ChatSource()`, `isFeature1ChatBackendEnabled()` |
| `src/lib/api/apiErrors.ts` | `ApiRequestError`, JSON error parsing |
| `src/lib/api/apiTypes.ts` | Backend DTO shapes |
| `src/lib/api/apiUser.ts` | `x-user-id` from auth store / anonymous learner id |
| `src/lib/api/conversationClient.ts` | Conversation + Talk HTTP methods |
| `src/lib/api/savedWordsClient.ts` | Saved words HTTP |
| `src/lib/api/conversationMappers.ts` | BE → UI models (messages, feedback modes, recap) |
| `src/lib/api/index.ts` | Barrel exports |

Components should import clients from `@/lib/api/*`, not call `fetch` directly.

## Configuration

- **`NEXT_PUBLIC_API_BASE_URL`** — Functions host origin, e.g. `http://localhost:7071` (routes append `/api/...`).
- **`NEXT_PUBLIC_FEATURE1_CHAT_SOURCE`** — Optional: `backend` | `mock`. If unset: **backend** when the base URL is non-empty, otherwise **mock** (no backend required for pure UI work).

See `.env.local.example` in the repo root.

## Route model

Canonical URLs:

- Thread: `/app/talk/thread/[threadId]`
- Recap: `/app/talk/thread/[threadId]/recap`

Legacy `/app/talk/chat/*` routes **redirect** to the thread routes so old bookmarks keep working.

Routing helpers: `appTalkThread`, `appTalkThreadRecap` in `src/lib/routing/appRoutes.ts`.

## Feedback modes

| UI (`FeedbackMode`) | API (`feedbackMode`) |
|---------------------|----------------------|
| `after_each` | `turn` |
| `at_end` | `end` |

Turn-mode feedback rows come from the API on send and from `GET` when resuming. End-mode recap uses the structured summary from `POST .../end`.

## Mock vs real

- **Mock** — `useFeature1ConversationStore` (Zustand persist), `mockConversationEngine`, local Library writes only.
- **Real** — React Query + `conversationClient` / `savedWordsClient`; Library still updated locally for immediate UX, using backend word ids when present.

## Running locally

1. Start SQL + Azure Functions per `docs/backend` (or your team runbook).
2. Set `NEXT_PUBLIC_API_BASE_URL=http://localhost:7071` in `.env.local`.
3. Ensure the browser sends a stable `x-user-id` (anonymous learner id matches backend seed user for demos).
4. `npm run dev` for the Next app.

## Cloud dev

Point `NEXT_PUBLIC_API_BASE_URL` at your deployed Functions origin (HTTPS). Keep `NEXT_PUBLIC_FEATURE1_CHAT_SOURCE=backend` if you also use a local base URL for other experiments.

## Follow-ups (before Feature 2+)

- Optional Next.js **rewrite proxy** to avoid CORS during local dev.
- List saved words from API on Library (currently local store + POST save only).
- Stronger offline handling (queued sends) if product requires it.
