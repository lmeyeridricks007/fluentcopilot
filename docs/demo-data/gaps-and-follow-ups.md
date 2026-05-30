# Demo Data — Gaps and Follow-Ups

**Purpose**: Record what is in scope vs out of scope for the demo-data module, and optional follow-ups. See also [demo-data-summary.md](final/demo-data-summary.md) and [local-demo-data-usage.md](local-demo-data-usage.md).

---

## 1. Achievements

- **Status**: **Done.** Achievements are now in demo-data.
- **Implementation**: `src/demo-data/factories/achievementFactory.ts` defines achievement definitions and `buildAchievements(unlockedIds)`. Each scenario (happy-path, new-user, at-cap, edge-case, power-user) sets which achievement ids are unlocked. Default dataset exports `DEMO_ACHIEVEMENTS`; `src/mocks/achievements.ts` re-exports for the Achievements page. Scenario switcher changes achievements after reload (e.g. power-user shows 5 earned, new-user shows 0).
- **Follow-up**: Add more achievement definitions to the factory or new scenarios as needed.

---

## 2. Notifications / Listening / Exam

- **Status**: **Documented; not in demo-data.**
- **Notifications**: Feature and integration behaviour are documented (e.g. docs/integrations/deep-dives/notification-delivery.md, per-feature notifications.md). No demo-data dataset for push tokens or notification history; UI can use minimal in-feature mocks or empty state.
- **Listening**: Listening exercises and audio are documented (feature-domain-breakdown FD-05, integration object-storage). No listening-specific catalog or progress in the demo-data module; lesson catalog can include listening type; audio URLs come from content or feature mocks.
- **Exam**: Exam prep content and progress are documented (FD-09, feature/exam docs). No exam-specific catalog or attempts in demo-data; optional later if we add exam practice screens that need scenario-driven data.
- **Follow-up**: Add listening/exam entities to demo-data only if we want scenario-driven listening or exam state (e.g. “new-user” has no exam attempts, “power-user” has several).

---

## 3. Scenario Switcher UI

- **Status**: **Done.** Optional dev-only UI implemented.
- **Implementation**: `src/components/dev/DevScenarioSwitcher.tsx` — dropdown of scenario ids (happy-path, new-user, at-cap, trial, premium, power-user, edge-case). Shown only when `import.meta.env.DEV` is true (e.g. `npm run dev`). On change: `localStorage.setItem('demoScenario', value)` and `window.location.reload()`. App bootstrap in `src/demo-data/index.ts` builds the default dataset from `getDemoScenarioFromStorage() ?? 'happy-path'`, so after reload the selected scenario is active.
- **Usage**: In development, use the “Demo:” dropdown in the header to switch scenario and reload.
- **Follow-up**: None required.

---

## 4. Daily Activities / Prompts

- **Status**: **Remain in feature mocks; can be moved to demo-data later if desired.**
- **Current**: Daily lessons (activities, generated lesson) and context/location prompts are populated from feature-level mocks (e.g. `src/features/daily-life-lessons/...`, context prompts in their feature). They are already populated and work for local dev.
- **Option**: Move daily-activities and location-prompts into `src/demo-data` (factories + scenario-driven datasets) so scenario switcher also changes “today’s activities” and “prompts” (e.g. new-user has empty activities, happy-path has a few). Not required for current scope.
- **Follow-up**: If we want scenario-consistent daily/prompts data, add factories and include in `DemoDataset` and scenario builders; then wire feature screens to demo-data.

---

## 5. Admin Queue / Batches

- **Status**: **Not in demo-data; not planned for demo-data.**
- **Current**: Admin queue and batches (if any) use their own mocks or backend; not driven by demo-data scenarios.
- **Follow-up**: Only add to demo-data if we introduce scenario-based admin state for local testing.

---

## 6. Summary Table

| Item                         | In demo-data?        | Follow-up / note                                      |
|-----------------------------|----------------------|--------------------------------------------------------|
| Achievements                | Yes (factory + data) | Done.                                                  |
| Notifications               | No                   | Documented; add to demo-data only if needed.          |
| Listening                   | No                   | Documented; add catalog/state to demo-data if needed.  |
| Exam                        | No                   | Documented; add to demo-data if exam screens need it.  |
| Scenario switcher UI        | N/A (UI component)   | Done; dev-only dropdown + localStorage + reload.       |
| Daily activities / prompts | No (feature mocks)   | Can move into demo-data later for scenario consistency.|
| Admin queue / batches       | No                   | Use admin mocks; add to demo-data only if required.    |
