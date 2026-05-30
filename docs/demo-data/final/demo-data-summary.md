# Demo Data Summary — AI Dutch Coach

**Purpose**: Final summary of demo data implementation: scenarios, domains, feature coverage, local setup, default scenario, and limitations.

---

## 1. Scenarios Implemented

| Scenario | Purpose | Key data |
|----------|---------|----------|
| **happy-path** (default) | Engaged learner; populated Home and Learn | 15 lessons; 5 completed, 1 in-progress; XP 420, streak 5; 2/5 usage; 6 scenarios |
| **new-user** | First-time experience | 15 lessons; 0 progress; 0 usage; XP 0, streak 0 |
| **at-cap** | Free user at daily cap | 5 completed today; 5/5 usage; no in-progress |
| **trial** / **premium** | Tier-specific (data same as happy-path; tier from auth) | Same as happy-path |
| **power-user** | High activity | 15 completed; XP 2140, streak 14 |
| **edge-case** | Minimal, one in-progress | 1 in-progress; 0 completed; low XP |

---

## 2. Data Domains Covered

- **Lessons**: Catalog of 15 lessons (A0–A2; vocabulary, grammar, dialogue, listening, quiz); completed/progress flags per scenario.
- **Progress summary**: XP, streak, lessons completed, daily goal, weekly minutes.
- **Scenarios**: 6 AI practice scenarios (café, doctor, supermarket, municipality, work, train).
- **Lesson progress**: Per-lesson status (in_progress, completed) and usage counts for cap logic.
- **Usage counts**: lessonsCompletedCount, scenariosCompletedCount, periodKey (today).
- **Achievements**: Catalog + earned state per scenario (e.g. happy-path: 2 unlocked; power-user: 5). See `achievementFactory` and scenario builders.
- **Auth demo users**: In auth feature mocks (demo@example.com, test@example.com; add at-cap/trial/premium as needed).
- **Daily activities / generated lessons / location prompts**: Remain in feature-level mocks; can be moved into demo-data later. See [gaps-and-follow-ups.md](../gaps-and-follow-ups.md).

---

## 3. Feature Coverage Status

| Feature | Data source | Status |
|---------|-------------|--------|
| Home | demo-data (lessons, progress, scenarios) | Populated |
| Lesson discovery | demo-data (lessons) | 15 lessons |
| Progress page | demo-data (progress) | Populated |
| Core lessons run | Lesson content from existing flow | OK |
| Entitlements / cap | demo-data (usage); auth (tier) | Dataset supports at-cap |
| Scenarios (list) | demo-data (scenarios) | 6 items |
| Daily Lessons | Feature mocks | Populated |
| Context prompts | Feature mocks | Populated |
| Achievements | demo-data (factory + scenario-driven) | Populated; 2–5 unlocked by scenario |
| Notifications | — | Documented; not in demo-data (see gaps-and-follow-ups) |
| Admin | Admin mocks | Populated |

---

## 4. Local Setup Instructions

1. **Install and run**: `npm install && npm run dev`.
2. **Default data**: App loads **happy-path** dataset (15 lessons, streak 5, XP 420, 6 scenarios, 2/5 usage).
3. **Switch scenario**: **Dev only**: Use the “Demo:” dropdown in the header (select scenario → page reloads). Or set `localStorage.setItem('demoScenario', 'at-cap')` (or `new-user`, `power-user`, `edge-case`) and reload. Default dataset is built from stored scenario at load, so all data reflects the selection after reload.
4. **Demo login**: Use `demo@example.com` / `demo123` (see auth mocks).
5. **Reset**: Clear localStorage and refresh for default scenario.

---

## 5. Recommended Default Local Seed Scenario

- **Scenario**: **happy-path**.
- **Reason**: Best for daily development: populated Home (Continue, recommended, streak, scenarios), 15 lessons in catalog, progress summary, and one in-progress lesson for “Continue” flow.

---

## 6. Known Limitations

- **No database**: All data is in-memory; no seed SQL or API.
- **Scenario switcher**: Dev-only dropdown sets localStorage and reloads; default dataset is built from stored scenario at load, so all DEMO_* exports reflect the selected scenario after reload.
- **Notifications / listening / exam**: Documented in feature and integration docs; not in demo-data module. See [gaps-and-follow-ups.md](../gaps-and-follow-ups.md).
- **Daily activities / prompts**: Still in feature mocks; can be moved into demo-data later for scenario consistency.
- **Admin**: Queue and batches not driven by demo-data scenarios; use admin mocks as-is.

---

## 7. Gaps and Follow-Ups

See **[docs/demo-data/gaps-and-follow-ups.md](../gaps-and-follow-ups.md)** for: achievements (done), notifications/listening/exam (documented, not in demo-data), scenario switcher UI (done), daily activities/prompts (in feature mocks; optional move later), admin (not in demo-data).

---

## 8. File Reference

| Item | Location |
|------|----------|
| Domains | docs/demo-data/demo-data-domains.md |
| Feature map | docs/demo-data/demo-data-feature-map.md |
| Scenarios | docs/demo-data/demo-scenarios.md |
| Requirements | docs/demo-data/feature-demo-data-requirements.md |
| Edge cases | docs/demo-data/edge-case-scenarios.md |
| Catalog | docs/demo-data/demo-data-catalog.md |
| Local usage | docs/demo-data/local-demo-data-usage.md |
| Gaps and follow-ups | docs/demo-data/gaps-and-follow-ups.md |
| Review | docs/demo-data/reviews/demo-data-review.md |
| Audit | docs/demo-data/audits/demo-data-audit.md |
| Factories | src/demo-data/factories/ |
| Scenario builders | src/demo-data/scenarios/ |
| Entry point | src/demo-data/index.ts |
| Mocks (wired) | src/mocks/lessons.ts, progress.ts, scenarios.ts, achievements.ts |
| Dev scenario switcher | src/components/dev/DevScenarioSwitcher.tsx |
