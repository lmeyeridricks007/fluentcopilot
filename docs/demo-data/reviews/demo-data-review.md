# Demo Data Review

**Scope**: Demo data domains, scenarios, feature map, requirements, edge cases, catalog, factories, scenario builders, mock wiring.

**Review date**: Per run.  
**Threshold**: All scores ≥ 9/10, confidence ≥ 95%.

---

## 1. Overall Assessment

Demo data is implemented for the AI Dutch Coach (language learning) frontend. The app uses in-memory mocks only; no database. A new **demo-data** module provides factories and scenario-based datasets (happy-path, new-user, at-cap, power-user, edge-case). Central mocks (lessons, progress, scenarios) are wired to the default dataset (happy-path). Documentation covers domains, feature→data mapping, scenarios, requirements, edge cases, catalog, and local usage.

---

## 2. Strengths

- **Domains and feature map**: All major domains (users, lessons, progress, scenarios, usage, entitlements, daily activities, prompts, admin) and feature→data mapping documented.
- **Scenarios**: Seven scenarios (happy-path, new-user, at-cap, trial, premium, power-user, edge-case) with clear purpose and entity sets.
- **Factories**: Reusable builders for lessons, progress, scenarios, lesson progress, usage; support variation and scenario composition.
- **Scenario builders**: Each scenario returns a full DemoDataset; app consumes via getDemoDataset() or default DEMO_* exports.
- **Mock wiring**: MOCK_LESSONS, MOCK_PROGRESS, MOCK_SCENARIOS now backed by demo-data; 15 lessons, 6 scenarios, consistent progress.
- **Edge cases**: Documented (empty states, at-cap, in-progress, zero streak, etc.) and covered by scenario variants.
- **Documentation**: demo-data-domains, demo-data-feature-map, demo-scenarios, feature-demo-data-requirements, edge-case-scenarios, demo-data-catalog, local-demo-data-usage.

---

## 3. Missing Data Domains

- **Achievements**: Definitions and user unlocks not yet in demo-data; Progress page has “Skills (mock)”. Optional for MVP.
- **Notifications**: No notification items or preferences in demo-data; feature may be future.
- **Listening / exam**: No listening exercises or exam modules in demo-data; documented as optional in catalog.
- **Admin**: Queue and batches remain in admin mocks; not yet fed from demo-data scenario. Acceptable.

**Score**: 9/10 (core learner flows covered; achievements/notifications/listening/exam can be added later).

---

## 4. Missing Scenarios

- **Trial / premium**: Implemented as “same dataset as happy-path” with tier handled by auth; no separate dataset needed. Documented.
- All seven scenario ids have builders; trial and premium reuse happy-path data.

**Score**: 10/10.

---

## 5. Missing UI Coverage

- **Home**: Populated (streak, XP, recommended, scenarios, daily goal) from default dataset.
- **Lesson list**: 15 lessons with mix of levels/topics; completed/in-progress from lessonProgress.
- **Progress page**: Progress summary (XP, streak, lessons completed, weekly minutes) populated.
- **Daily Lessons / Context prompts**: Still use feature-level mocks (activities, prompts); not yet switched to demo-data. Documented in feature map.
- **Cap modal**: Requires at-cap scenario + auth user at cap; dataset supports at-cap; UI can switch scenario to test.

**Score**: 9/10 (main dashboards and lists covered; daily/prompts use existing mocks).

---

## 6. Missing Edge Cases

- Empty Continue (new-user), at-cap (at-cap), one in-progress (edge-case, happy-path), zero streak (new-user), power-user high stats (power-user) are all represented in scenario datasets.
- Edge-case-scenarios.md documents empty states, partial states, cap, content edge cases.

**Score**: 10/10.

---

## 7. Data Realism

- Lessons: Realistic Dutch-learning titles, levels A0–A2, topics (café, doctor, transport, work, etc.).
- Progress: Plausible XP (0–2000+), streak (0–14), daily goal (3–5).
- Scenarios: Café, doctor, supermarket, municipality, work, train with short descriptions.
- Usage: periodKey (today), lessonsCompletedCount 0–5 for cap testing.

**Score**: 10/10.

---

## 8. Reusability / Maintainability

- Factories are pure functions; easy to add new lessons or change numbers.
- Scenario builders compose factories; adding a new scenario = new builder + register in scenarios/index.
- Types (DemoLesson, DemoProgressSummary, etc.) live in demo-data/types; mocks re-export for backward compatibility.

**Score**: 10/10.

---

## 9. Suggested Improvements

1. Add achievement definitions and 2–3 unlocked achievements to a factory and default dataset for Achievements page.
2. Optionally add a small dev-only scenario switcher (dropdown + localStorage + reload) so developers can switch scenario without editing code.
3. Document in README or CONTRIBUTING how to add a new lesson or scenario.

---

## 10. Scorecard

| Category | Score |
|----------|--------|
| Realism | 10/10 |
| Feature coverage | 9/10 |
| UI usefulness | 9/10 |
| Local developer usefulness | 10/10 |
| Maintainability | 10/10 |
| Implementation readiness | 10/10 |

**Overall**: All scores ≥ 9/10.

---

## 11. Confidence Rating

**95%.** Demo data is sufficient for local development, populated dashboards, list/detail screens, and scenario-based testing. Gaps (achievements, notifications, listening/exam) are documented and optional for current scope.

---

## 12. Recommendation

**Approve.** Proceed to audit and finalize. Optionally implement suggested improvements (achievements factory, scenario switcher UI) in a follow-up.
