# Conversation lifecycle (FluentCopilot — Train station chat)

This document describes how **train-station text threads** move between **active**, **paused**, and **completed** states, how the UI surfaces controls, and why primary actions are visible instead of overflow-only.

## Thread states

| State | Meaning | Continue target | Talk landing |
| --- | --- | --- | --- |
| **Active** | Open thread; user can send messages. | Primary “Active · continue conversation” card links to the thread. | Shown as the highlighted continue card with an **Active** label. |
| **Paused** | Thread is **not** completed; user intentionally paused (or chose “pause current & start new”). | Opens the same thread; in-thread banner offers **Resume**. | Listed under **Paused** with resume affordance. Not the default “continue” card while another active thread exists. |
| **Completed** | Thread is **closed**; recap is the right surface. | `…/thread/{id}/recap` | Listed under **Completed recently** with “View recap”. |

**Active vs paused:** paused threads remain **resumable** and are **not** treated as finished practice. **Completed** threads are closed; the recap flow is the intentional “I’m done” outcome.

## Visible controls (rationale)

Messaging apps train users to look for **thread-level actions** near the header and **wrap-up** near the composer. Hiding **End** only under a three-dot menu makes users feel **stuck in a thread**.

- **New** (header): always discoverable entry to **start another** conversation with an explicit choice sheet when one is already active.
- **End & review** (composer zone, after a few user turns): secondary to **Send**, calm styling — suggests **finish and get value**, not a destructive exit.
- **Pause** (header overflow): secondary lifecycle action, still one tap away but not competing with **Send** / **End**.

## Start new conversation

### From the active thread (`ChatSubheader`)

Tapping **New** opens `StartNewConversationModal`:

1. **Continue current conversation** — dismiss.
2. **Pause current & start new** — `POST …/conversations/{threadId}/pause` (or mock `pauseTrainThread`), then open **New conversation setup**.
3. **End current & review first** — navigate to thread with end flow (`?endReview=1`) so the user **closes intentionally** before starting another.

### From Talk (`TalkNowPanel`)

**New train chat** is always visible:

- If there is **no** active train thread → opens **New conversation setup** directly.
- If there **is** an active train thread → same three-option modal as above (mock or backend).

Deep link: `/app/talk?openTrainSetup=1` opens the setup sheet on landing (used from recap **Start new train chat**).

## Pause and resume

- **Pause:** `POST /api/.../conversations/{threadId}/pause` — persists `ConversationPaused` (backend) or mock `status: 'paused'`.
- **Resume:** `POST …/resume` or in-mock `resumeTrainThread` when opening a paused thread.

Paused threads **do not** appear as the primary “active” continue card; they appear in the **Paused** list on Talk.

## End conversation

1. User taps **End & review** (composer) or chooses **End current & review first** from the new-chat sheet.
2. **EndConversationConfirmModal** confirms intent.
3. Client calls **`endConversation`** (backend) or **`endThread`** (mock), then routes to **`/app/talk/thread/{id}/recap`**.
4. **ConversationRecapView** shows handled well, improvements, phrases, next step — plus **Start new train chat** (`?openTrainSetup=1`) and **Back to Talk**.

## Talk landing rendering rules

1. **New train chat** — always first-class control in the train section.
2. **Active** — at most one active train thread from `getContinueConversation` (backend) or the mock store; large continue card, label **Active · continue conversation**.
3. **Paused** — `trainPausedThreads` (API) or filtered mock threads; amber list rows, **Paused** label, link to thread.
4. **Completed recently** — `trainRecentCompleted` (API) or last N completed mock threads; neutral rows, link to recap.

## API touchpoints (backend mode)

- Continue payload: `activeThread`, `trainPausedThreads`, `trainRecentCompleted` (train-station scenario).
- Lifecycle: `pause`, `resume`, `end` on `/conversations/{threadId}/…`.

## Frontend files (reference)

- Thread: `TrainStationChatPage.tsx`, `ChatSubheader.tsx`, `StickyChatComposer.tsx`, `EndConversationConfirmModal.tsx`, `StartNewConversationModal.tsx`.
- Talk: `TalkNowPanel.tsx`.
- Recap: `ConversationRecapView.tsx`, `TrainStationRecapPage.tsx`.
- Client: `conversationClient.ts` (`pauseConversation`, `resumeConversation`, `endConversation`, `getContinueConversation`).
