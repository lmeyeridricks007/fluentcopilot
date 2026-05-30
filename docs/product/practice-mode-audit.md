# Practice mode audit — Dutch learning app

**Date:** 2025-03-26  
**Scope:** Repository inspection (`src/`, `docs/`) — product, UX, conversation system, architecture, integrations.  
**Not in scope:** Major implementation, new scenarios, prompt engineering.

---

## Executive summary

Practice is exposed as a **bottom-nav tab** pointing at **text simulation** (`/app/practice/simulation`), not a unified “Practice hub.” The primary user-facing conversation surface (`SimulationPage`) is a **UI prototype**: canned messages, no backend, no link to `ai-conversation-engine`. A **separate, richer** scenario and session model exists under `src/ai-conversation-engine/` but is **not wired** to Next.js routes or the simulation UI.

**Retention (streak / XP)** is driven only by **lesson completion** and **structured review / mistake-fix** sessions — not by Practice chat, voice, or listening exercises.

**Premium gating** is **inconsistent**: text simulation uses entitlement caps; voice tutor uses `PremiumLock`; usage counters are **static demo data** and are **not incremented** when users chat.

---

## 1. Practice mode inventory

### Screens / routes (`src/app/app/practice/`)

| Route | Component / feature | Role |
|--------|----------------------|------|
| `/app/practice` | Redirects to `/app/home` | No hub page |
| `/app/practice/simulation` | `SimulationPage` | Scenario chips + chat (mock) |
| `/app/practice/simulation/[scenarioId]` | Same `SimulationPage` | Deep link; scenario header from catalog |
| `/app/practice/voice` | `VoiceTutorPage` | Mic permission + mock recording UI |
| `/app/practice/voice/[scenarioId]` | `VoiceTutorPage` | Scenario card context |
| `/app/practice/listening` | `ListeningCatalogPage` | Exercise list |
| `/app/practice/listening/[exerciseId]` | `ListeningPage` | Mock audio + MCQ |
| `/app/practice/pronunciation-feedback` | `PronunciationFeedbackPage` | Static score + tips (mock) |

### Navigation & entry points

- **Bottom nav** (`BottomNav.tsx`): “Practice” → `/app/practice/simulation`.
- **Home** (`HomePage.tsx`): “Practice with AI” cards (text / voice / listening); horizontal “Scenarios” chips → simulation deep links.
- **Smart Prompts** (`ContextPromptDetailPage.tsx`): “Start practice” → `/app/practice/simulation/{prompt.scenarioId}`.
- **Generated daily lesson** (`GeneratedLessonPage.tsx`): practice module → simulation with optional `scenarioId`.
- **Lesson freer practice** (`FreerPracticePremiumPanel.tsx`): rule-based API evaluation; copy references “Practice →” but **not** wired to retention.
- **Voice tutor** fallbacks link to text simulation.

### Components (Practice-adjacent)

| Area | Files | Notes |
|------|--------|--------|
| Text chat UI | `src/features/simulations/SimulationPage.tsx` | Messages, input, tip side panel |
| Voice | `src/features/voice/VoiceTutorPage.tsx`, `PronunciationFeedbackPage.tsx` | Premium + mic gate; mock STT/TTS |
| Listening | `src/features/listening/*`, `mockExercises.ts` | Mock playback + questions |
| Entitlements | `EntitlementProvider`, `PaywallModal`, `UsageIndicator` | Tier + caps (demo-backed) |
| Guided lesson “practice” | `GuidedPracticePager`, `FreerPracticePremiumPanel`, etc. | **Different feature** — lesson steps, not Practice tab |

### Data structures

| Structure | Location | Purpose |
|-----------|----------|---------|
| `DemoScenario` | `src/demo-data/types.ts` | UI catalog: `id`, `title`, `description`, `category`, `level`, `icon` |
| `MOCK_SCENARIOS` | `src/mocks/scenarios.ts` | Re-exports `DEMO_SCENARIOS` from active demo dataset |
| Seed scenarios | `src/demo-data/factories/scenarioFactory.ts` | Fixed list: `cafe`, `doctor`, `supermarket`, `municipality`, `work`, `train` |
| `ScenarioContext` | `src/ai-conversation-engine/types/scenario.ts` | Rich context for prompts: phrases, vocabulary, `ai_roleplay_instructions`, CEFR adjustments |
| Built-in AI scenarios | `src/ai-conversation-engine/config/scenarios.ts` | Map keyed by `scenario_id` (partially **different ids** from demo — see §4) |
| Conversation session | `src/ai-conversation-engine/types/session.ts` | `ConversationSession`, messages, feedback, summary, status |
| API contracts | `src/ai-conversation-engine/types/api.ts` | `startConversation`, `sendMessage`, `endConversation` shapes |
| Retention | `src/lib/retention/types.ts` | `XpReason`, `RetentionActivityType` — **no** practice-conversation type |

### Services / engines

| Service | Location | Wired to UI? |
|---------|----------|----------------|
| `conversationApi` (start/send/end/get) | `src/ai-conversation-engine/api/conversationApi.ts` | **No** Next.js API routes found under `src/app/api` for conversation |
| `processTurn` / orchestrator | `orchestrator/conversationLoop.ts` | Used only via `conversationApi` |
| Session store | `session/sessionStore.ts` | **In-memory** `Map` — not durable, not server-shared |
| Providers | `providers/*` | Mock / adapters exist; UI does not call them |
| Freer practice evaluate | `src/app/api/freer-practice/evaluate/route.ts` | Lesson step only |

### Flows (as implemented)

1. **Text simulation:** Open simulation → optional cap check on **chip navigation** → chat with **hardcoded** opener (café Dutch) and **fixed** assistant reply after delay → static “tip” string.
2. **Voice:** Non-premium → `PremiumLock`; premium → mic permission → toggle “recording” state (no audio pipeline); empty transcript; “AI response (Mock)”.
3. **Listening:** Select exercise → mock play → MCQ → local score (no persistence).

### Existing integrations

| System | Practice connection |
|--------|---------------------|
| Review engine / SRS | **None** from Practice surfaces |
| Streak / XP | **None** from simulation, voice, or listening |
| Mistakes / weak tags | Curriculum “practice weak” routes to **lessons**, not Practice tab |
| Entitlements | **Partial:** `canStartScenario` / paywall on scenario **picker** only in `SimulationPage` |
| Analytics | `smart_prompt_practice_clicked` on Smart Prompts CTA |
| Docs | `docs/features/deep-dives/scenario-simulations.md` describes target behavior (APIs, XP, persistence) **ahead** of implementation |

---

## 2. What is working well (keep)

Grounded in code:

- **Clear IA:** Home surfaces three Practice modalities; bottom nav lands on simulation; back behavior in `Header` includes `practice` paths.
- **Scenario catalog for UI:** `DemoScenario` + `scenarioFactory` gives consistent titles, descriptions, levels, icons for chips and cards.
- **Horizontal scenario picker pattern** on simulation root and Home is a reasonable pattern for quick entry.
- **Chat layout:** Readable bubble layout, loading state, optional tip panel — reasonable shell for a real conversation product.
- **Entitlement hooks exist** (`useEntitlement`, `PaywallModal` with `scenario_cap`) — ready to attach to real usage once backend exists.
- **`ai-conversation-engine` package** already defines **session lifecycle**, **prompt building**, **moderation hook**, **grammar analysis hook**, **feedback/summary builders**, and **telemetry recorders** — valuable to preserve as the orchestration reference.
- **Type-level contracts** for conversation API (`types/api.ts`, `types/session.ts`) are a good basis for server routes.
- **Freer practice** demonstrates **server-evaluated** practice with explicit premium framing (pattern for future AI feedback).

---

## 3. What is weak or missing

### Product / UX

- **Not a real practice system yet:** No objectives, no progression, no end-of-session outcome, no persistence — a **chat shell** with demo behavior.
- **Scenario mismatch in the chat:** Initial assistant message is always café Dutch (`Welkom bij het café…`) regardless of `scenarioId` (`SimulationPage.tsx`).
- **Same canned reply** for every user message; no persona or scenario-specific continuation.
- **“Tip” is not tied** to user input analysis in the UI (static string after send).
- **No guided / semi-guided modes** — only free-form typing into a single thread.
- **Post-A2 / “pre-B1” bridge:** One scenario is labeled `B1` (`work` in factory); there is no dedicated “post-A2 continuation” track or content layer in Practice.
- **Daily habit:** Completing Practice does **not** extend streak or grant XP (see §F), so it does not reinforce daily use the way lessons/reviews do.

### Conversation system

- **Two scenario sources** (`scenarioFactory` vs `ai-conversation-engine/config/scenarios.ts`) with **inconsistent ids** (e.g. demo `work` vs engine `workplace_meeting`, `train` vs `travel`; **no** `municipality` in engine registry).
- **Structured scenario data for AI** exists only in the engine config — **unused** by `SimulationPage`.
- **No turn/orchestration** in the app UI; no `conversation_type` (guided/free) in user-facing flows.

### Technical

- **No HTTP API** for conversation in `src/app/api` → engine is dead code from the browser’s perspective.
- **In-memory sessions** would not survive serverless cold starts or multi-instance deploys.
- **Usage / cap:** `DEMO_USAGE.scenariosCompletedCount` never updates from simulation; paywall is **cosmetic** relative to real enforcement.
- **Premium:** Voice blocks non-premium users entirely on `VoiceTutorPage`; text simulation allows free tier with cap — product rules are **split** across files without a single policy module.

---

## 4. Hardcoded vs reusable vs refactor vs missing

| Category | Examples |
|----------|-----------|
| **Hardcoded** | Café opening line, assistant reply, tip text, listening questions/transcript, pronunciation scores, `SimulationPage` message state shape (local interface, not shared with engine) |
| **Reusable** | `Card`, `Button`, layout patterns; `MOCK_SCENARIOS` consumption; entitlement context; `ai-conversation-engine` types and orchestration **if** exposed via API |
| **Needs refactor** | Unify scenario ids and a **single catalog** consumed by UI + engine; extract **chat thread + composer** from simulation-specific mock logic; move cap checks to **session start** + server; align Paywall copy (weekly vs daily) with actual period model |
| **Missing entirely** | Practice hub route; session persistence; API routes; guided conversation state machine; objectives / rubric; post-session feedback screen in app; XP/streak hooks for practice; weakness-driven scenario selection; missions; mastery model for speaking/chat |

---

## 5. Refactor plan (evolution toward Practice & Mastery)

### Phase 0 — Contracts first (before more UI)

1. **Single scenario catalog schema** (authoritative ids): map UI display fields + engine `ScenarioContext` + optional curriculum tags (grammar/vocab targets). Eliminate id drift (`work` / `workplace_meeting`, etc.).
2. **Define `PracticeSession` boundaries:** distinguish **demo/mock**, **client-only**, and **server-backed** states; document transport (REST or future RPC).
3. **Add minimal API routes** that delegate to `conversationApi` (`startConversation`, `sendMessage`, `endConversation`) — replace in-memory store with pluggable persistence (even if v1 is still single-node for dev).

### Phase 1 — Wire simulation to engine (minimal vertical slice)

1. Replace `SimulationPage` mock loop with: start session → render history from server → send message → show corrections/feedback snippet from `SendMessageResponse`.
2. **Scenario-specific opening line:** from server `initial_message` or template per scenario (remove hardcoded café text).
3. **Enforcement:** increment usage / check cap on **start** on server; align `PaywallModal` copy with `periodKey` semantics.

### Phase 2 — Retention integration

1. Extend `XpReason` / `RetentionActivityType` with e.g. `practice_conversation_complete` (and optional partial credit).
2. On `endConversation`, call `recordPracticeSessionComplete` (new) with quality thresholds (mirroring review session rules).
3. Optionally enqueue **review cards** from `SessionSummary` / grammar mistakes (bridge to review engine).

### Phase 3 — Product layers (guided / mastery / missions)

1. **Conversation orchestration layer:** mode = `guided | semi_guided | free` stored on session; prompt templates branch on mode.
2. **Skill tracks & weakness routing:** map mistakes/tags → suggested scenarios (reuse patterns from `CurriculumReviewPanel` / weak tags, but target Practice).
3. **Practice hub** at `/app/practice` with tabs: Simulate / Voice / Listening / (future) Missions — bottom nav can point to hub.
4. **Post-session feedback** screen using `SessionSummary` + `ConversationFeedback` (engine already builds structures on end).

### What must not be built ad hoc

- Duplicate scenario definitions in UI and engine.
- Client-only “fake” caps for monetization.
- Another message type incompatible with `ConversationMessage`.
- XP/streak logic scattered outside `retentionService`.

---

## 6. Recommended architecture direction (conceptual)

- **Practice Hub:** Single entry (`/app/practice`) composing modalities (text AI, voice, listening, future drills).
- **Scenario catalog:** Versioned content: id, CEFR band, domain tags, `ScenarioContext`, optional **learning objectives** and **success criteria** for guided modes.
- **Conversation orchestration:** Session entity with mode, turn limits, moderation, provider adapter, grammar/analysis pipeline — **already sketched** in `ai-conversation-engine`; needs hosting + persistence.
- **Support tools:** Phrase hints, optional translations, difficulty toggle — can layer on chat UI.
- **Feedback engine:** Turn-level corrections + end-session summary; connect to UI and retention.
- **Mastery tracking:** Per-skill or per-scenario-family mastery (separate from lesson completion); feed from session outcomes and review performance.
- **Missions / daily structure:** Composable tasks (“complete 1 scenario,” “fix 3 mistakes,” “5-min review”) pulling from same catalog and retention ledger.
- **Retention integration:** Streak/XP/review queue share one **activity recorder** with explicit reasons and refs (session id).

---

## 7. Implementation sequence (for follow-up prompts)

1. **Define Practice & Mastery system architecture** — document catalog schema, session lifecycle, API surface, persistence, and retention events (this audit feeds it).
2. **Normalize scenario ids** — one catalog; extend `ai-conversation-engine/config/scenarios.ts` or generate from shared JSON; update `scenarioFactory` and any Smart Prompts ids.
3. **Add Next.js API routes** for conversation + swap `sessionStore` for persistent implementation (or document dev-only limitation).
4. **Refactor `SimulationPage`** into presentational **ChatThread** + **usePracticeConversation** hook calling APIs.
5. **Server-side entitlement** for session start + usage persistence (replace static `DEMO_USAGE` for production path).
6. **`recordPracticeSessionComplete`** + home/progress copy updates so Practice can count toward streak/XP where product intends.
7. **Guided mode MVP** — e.g. scripted first turns or objective checklist in session metadata.
8. **Practice hub page** + bottom nav target update.
9. **Weakness → scenario** suggestions on hub or curriculum.

---

## Appendix — Audit questions (A–G)

### A. Product / UX

1. **Today:** Mock chat (café-flavored), voice and listening shells, pronunciation static page; entry from Home, nav, Smart Prompts, lessons.
2. **A2 usability:** Can explore UI and type Dutch, but **no real tutoring**; misleading for learners who expect AI.
3. **Mode:** **Fully open** text entry; no scripted guidance.
4. **Real system vs shell:** **Shell** + demo strings.
5. **Post-A2 “not B1 ready”:** **No** dedicated track; only generic scenarios and one `B1`-labeled work scenario in seed data.
6. **Biggest UX gaps:** Wrong opener per scenario, no feedback tied to input, no session end/summary in UI, no habit loop (streak/XP).
7. **Daily usefulness:** Without retention credit and real AI, **low** compared to lessons/review.

### B. Conversation system

1. **Representation:** UI = `DemoScenario`; engine = `ScenarioContext` in TS config.
2. **Structured vs labels:** Engine side **structured**; UI list is **labels + metadata** only in simulation.
3. **Turn/persona/objectives:** **None** in UI; engine prompts include roleplay instructions but **unused**.
4. **Reusable chat UI:** Layout is reusable; state/logic is **coupled** to mock.
5. **Guided support:** **No** in app; engine has `conversation_type` text/voice only.
6. **AI readiness:** Engine layer **moderately ready**; **integration gap** is routing, persistence, and UI.

### C. Technical architecture

1–6. See §3–§5; summary: **hardcoded mock** in UI, **strong library** unused, **no separation** of orchestration from `SimulationPage` today.

### D. Input / modality

1. **Text** in simulation; **mic toggle** (no capture pipeline) in voice; **listening** MCQ; freer practice in lessons with text evaluate API.
2. **Text:** yes.
3. **Speaking:** mic permission only; **no** STT integration in repo for Practice.
4. **TTS/playback:** **Mock** labels only.
5. **Missing:** Real STT/TTS, pronunciation pipeline, reading-specific practice mode in Practice tab, consistent premium matrix.

### E. Premium / free gating

1. **Exists:** `EntitlementProvider` caps; `PremiumLock` on voice; `PaywallModal` for scenario cap.
2. **Enforcement:** **UI-only** for scenarios (and demo counts); voice is **client** premium check.
3. **Natural premium:** Unlimited scenarios, voice/STT, deep feedback, exam-prep sections (already partially mirrored elsewhere).
4. **Natural free:** Limited scenarios/week, text-first trial, maybe short sessions.
5. **Weakness:** Static usage; paywall message says “week” while usage type uses `periodKey` as date string in factory — **wording vs model** risk; no server validation.

### F. Integration

1. **Connects today:** **No** to review, streak, XP, mistakes, mastery path for Practice actions.
2. **Add:** `recordPracticeSessionComplete`; optional review item injection; weak-tag updates from analysis.
3. **Should generate (product decision):** XP on session end (quality-gated); streak if session meets minimum depth; review items from errors; weakness signals from grammar analysis; ability progress only if mapped to curriculum outcomes.

### G. Long-term

See §5–§7. **Lock first:** single scenario schema, session persistence strategy, retention event taxonomy, premium policy table.

---

## Terminal / chat summary

| # | Item |
|---|------|
| 1 | **Current maturity:** **Prototype / shell** — polished layout and navigation, mock conversation, engine package present but unwired, no retention loop for Practice. |
| 2 | **Biggest architectural risks:** Dual scenario sources + id mismatch; in-memory sessions; client-only caps; building more UI before API + persistence contracts. |
| 3 | **Biggest product/UX gaps:** Scenario-agnostic café script; no real AI feedback; no session outcome; Practice does not count toward streak/XP. |
| 4 | **Refactor first:** Unify scenario catalog + ids; add conversation API + persistence; decouple `SimulationPage` into hook + presentational chat; align gating with server usage. |
| 5 | **Recommended next prompt:** **“Define the Practice & Mastery system architecture”** (catalog schema, session lifecycle, API, persistence, retention events, premium matrix, guided modes). |

---

## Files created/updated

- **Created:** `docs/product/practice-mode-audit.md` (this document).

---

## Key findings (short)

- Practice tab = **text simulation**; `/app/practice` does not hub modalities.
- **`SimulationPage` is mock-only** and **not** using `ai-conversation-engine`.
- **Streak/XP** only for **lessons + review/mistake-fix**, not Practice.
- **Scenario ids diverge** between demo UI and AI engine config.
- **Specs** (`scenario-simulations.md`) describe target system **beyond** current code.

---

## Biggest gaps

- No production conversation API or durable sessions.
- No end-to-end scenario-accurate behavior in chat.
- No mastery, missions, or review linkage for Practice.

---

## What should be preserved

- Nav/IA patterns, `DemoScenario`-driven chips, chat UI shell, entitlement/paywall components, `ai-conversation-engine` types and orchestration as the core library.

---

## What should be refactored first

1. Single scenario catalog + id alignment.  
2. API + session persistence + `SimulationPage` → real turns.  
3. Retention integration for completed practice sessions (contract + implementation).

---

## Recommended next step

**Define the Practice & Mastery system architecture** — formalize schemas, services, and integration points before extending UI or authoring new scenarios.
