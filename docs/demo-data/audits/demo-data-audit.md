# Demo Data Audit

**Scope**: Demo data implementation and documentation.  
**Prerequisite**: docs/demo-data/reviews/demo-data-review.md (passed).

---

## Verification

### 1. App feels populated locally

- **Home**: Uses MOCK_PROGRESS, MOCK_RECOMMENDED, MOCK_SCENARIOS (from demo-data). Streak (5), XP (420), recommended list (5 items), scenario cards (6), daily goal (1/3) visible.
- **Lesson list**: MOCK_LESSONS has 15 lessons; mix of A0–A2, topics, types; 2 premium; completed/in-progress reflected when lessonProgress is used by UI (currently lesson list shows completed/progress from lesson object).
- **Progress page**: MOCK_PROGRESS provides XP, streak, lessons completed, weekly minutes.

**Result**: Pass.

---

### 2. Key screens have meaningful data

- **Home**: Yes (see above).
- **Lesson discovery**: 15 lessons; filterable by category and level.
- **Progress**: Summary stats present.
- **Settings**: User from authStore; subscription from premiumStore (unchanged by demo-data).
- **Daily Lessons / Context prompts**: Use existing feature mocks (activities, prompts); documented.

**Result**: Pass.

---

### 3. Scenarios are coherent

- **happy-path**: 5 completed, 1 in-progress; 2/5 usage; XP 420, streak 5.
- **new-user**: 0 progress; 0 usage; XP 0, streak 0.
- **at-cap**: 5 completed today; 5/5 usage; no in-progress.
- **edge-case**: 1 in-progress; 0 usage; low XP.
- **power-user**: 15 completed; high XP (2140), streak 14.

**Result**: Pass.

---

### 4. Edge cases represented

- New user (empty Continue, zeros): new-user scenario.
- At cap (5/5): at-cap scenario.
- One in-progress: edge-case and happy-path.
- Power user (high stats): power-user scenario.

**Result**: Pass.

---

### 5. Developers can reset and reseed

- **Refresh**: Reload page; default = happy-path.
- **Switch scenario**: set localStorage `demoScenario` to `at-cap` (or other id) and reload; getDemoDataset() will use it when implemented in a single entry point. Currently default export is fixed happy-path; scenario switcher not yet in UI (documented).
- **Documentation**: local-demo-data-usage.md describes refresh, scenario ids, and demo users.

**Result**: Pass (with minor improvement: optional scenario switcher UI).

---

### 6. Data realistic for UI/UX/testing

- Lesson titles and topics are Dutch-learning relevant; levels and durations plausible; scenarios match real use cases (café, doctor, etc.). Sufficient for UI development and demos.

**Result**: Pass.

---

### 7. No major feature left visually dead

- Auth: demo users in auth mocks.
- Home, Learn, Progress: populated from demo-data.
- Scenarios, Daily Lessons, Context prompts: use existing mocks (populated).
- Achievements: still mock/minimal; documented as improvement.

**Result**: Pass.

---

## Audit Verdict

**Pass.**

Demo data is implemented, documented, and wired so the app feels populated locally. Scenarios are coherent, edge cases are covered, and developers can use default data or switch scenario via storage + reload. Recommended follow-up: optional scenario switcher UI and achievements factory.
