# Demo Data Catalog — AI Dutch Coach

**Purpose**: Single catalog of what demo entities exist, counts, scenario membership, and how to regenerate. Aligns with docs/demo-data/demo-scenarios.md and implementation in src/demo-data.

---

## 1. Entity Counts (Default: happy-path)

| Entity | Count | Notes |
|--------|-------|--------|
| Demo users (auth) | 4 | default, at-cap, trial, premium (see auth mocks) |
| Lessons (catalog) | 15+ | A0–A2; vocabulary, grammar, dialogue; 2 premium |
| Lesson progress (per user) | 0–6+ | Default user: 5 completed, 1 in_progress |
| Usage counts (per user) | 1 row per user per day | default: 2/5; at-cap: 5/5; new-user: 0/5 |
| Scenarios | 6 | café, doctor, supermarket, municipality, work, train |
| Progress summary | 1 per user | XP, streak, dailyGoal, weeklyMinutes |
| Daily activities | 5 (today) | For default user’s “today” |
| Generated lessons | 2 | Today + 1 past (history) |
| Location prompts | 7 venues × 3–4 phrases | café, train, supermarket, pharmacy, office, school, municipality, restaurant |
| Achievements | 8 | 3 unlocked for default user |
| Admin queue (if used) | 5 items | Optional |
| Admin batches | 2 | Optional |

---

## 2. Scenario → Entity Mapping

| Scenario | Lessons | Lesson progress | Usage | Progress | Activities | Generated | Prompts |
|----------|---------|------------------|-------|----------|------------|-----------|---------|
| happy-path | 15 | 6 (5 done, 1 in prog) | 2/5 | XP 420, streak 5 | 5 | 2 | yes |
| new-user | 15 | 0 | 0/5 | XP 0, streak 0 | 0–1 | 0 | yes |
| at-cap | 15 | 5 (all done today) | 5/5 | any | any | any | yes |
| trial | 15 | any | — | any | any | any | yes |
| premium | 15 | any | — | any | any | any | yes |
| power-user | 15 | 25+ completed | — | XP 2000+, streak 14 | 15+ | 5+ | yes |
| edge-case | 15 | 1 in_progress | 0/5 | low | 0 | 0 | yes |

---

## 3. Features / Screens Supported

| Entity set | Supports |
|------------|----------|
| Lessons + progress | Home (Continue, recommended), Lesson discovery, Lesson run, Progress |
| Progress summary | Home, Progress page |
| Scenarios | Home practice cards, Simulation page |
| Daily activities + generated | Daily Lessons hub, Capture, Generated lesson, History |
| Location prompts | Context prompts feed, detail, settings |
| Demo users + usage + tier | Auth, cap modal, trial/premium UI, Settings |
| Achievements | Achievements page |

---

## 4. How to Regenerate

- **Current**: Demo data lives in src/mocks/*.ts and src/features/*/mocks/*.ts. Edit those files and refresh the app.
- **With demo-data module**: Call `getDemoDataset('happy-path')` (or other scenario) from src/demo-data; app uses that for lessons, progress, scenarios, etc. Regeneration = change scenario or re-run factory builders (see scripts/demo-data or src/demo-data/factories).
- **Reset to default**: Reload page; or set localStorage `demoScenario` to `happy-path` and reload if using scenario switcher.
- **No database**: No seed SQL or API; all in-memory. “Reseed” = reload with chosen scenario.

---

## 5. File Locations (Implementation)

| Data | File(s) |
|------|---------|
| Lessons | src/mocks/lessons.ts; src/demo-data/datasets/*.ts (scenario-specific) |
| Progress | src/mocks/progress.ts; src/demo-data/datasets/*.ts |
| Scenarios | src/mocks/scenarios.ts; src/demo-data/datasets/*.ts |
| Demo users | src/features/auth/mocks/demoUsers.ts |
| Daily activities | src/features/daily-life-lessons/mocks/activities.ts |
| Generated lessons | src/features/daily-life-lessons/mocks/lessons.ts |
| Location prompts | src/features/location-prompts/mocks/prompts.ts |
| Factories | src/demo-data/factories/*.ts |
| Scenario builders | src/demo-data/scenarios/*.ts |
| Catalog export | src/demo-data/index.ts (getDemoDataset) |
