# Local Demo Data Usage — AI Dutch Coach

**Purpose**: Commands and workflow for resetting, reseeding, and switching demo data so the app looks fully populated locally.

---

## 1. Current Setup (No Backend)

- The app runs entirely in the browser with **in-memory mock data**.
- Data is imported from `src/mocks/*.ts` and feature-level mocks (e.g. `src/features/auth/mocks/demoUsers.ts`, `src/features/daily-life-lessons/mocks/lessons.ts`).
- There is **no database seed** or API; “seed” = the contents of these mock files.

---

## 2. Refreshing Demo Data

| Action | How |
|--------|-----|
| **Reload default data** | Refresh the page (F5 or Cmd+R). All mocks are re-imported. |
| **Switch scenario** | **Dev only**: Use the “Demo:” dropdown in the header; select scenario → page reloads with that dataset. Or set `localStorage.setItem('demoScenario', 'at-cap')` (or `new-user`, `trial`, `premium`, `power-user`, `edge-case`) and refresh. |
| **Use env-based scenario** | Set `VITE_DEMO_SCENARIO=at-cap` in `.env.local`, rebuild (`npm run build`) or run dev (`npm run dev`). App uses that scenario when loading demo data. |

---

## 3. Resetting to Default

- **Default scenario**: `happy-path` (engaged learner with Continue, recommendations, streak, daily activities).
- **Reset**: Clear localStorage for the app (e.g. DevTools → Application → Local Storage → Clear), or set `demoScenario` to `happy-path`, then refresh.
- **Auth reset**: Log out (Settings → Sign out). To test another demo user, log in with a different email from the demo user list (see docs/demo-data/demo-data-catalog.md or auth mocks).

---

## 4. Demo User Quick Reference

Use these with the mock auth (Login page) when testing cap/trial/premium:

| Email | Intended scenario | Password (mock) |
|-------|-------------------|------------------|
| demo@example.com | Default / happy-path | demo123 |
| test@example.com | Alternative | demo123 |
| at-cap@example.com | At daily cap (if added) | demo123 |
| trial@example.com | Trial user (if added) | demo123 |
| premium@example.com | Premium user (if added) | demo123 |

*(Add at-cap, trial, premium users to auth mocks and optionally wire scenario switcher to set tier/usage.)*

---

## 5. Recommended Default Local Seed

- **Scenario**: `happy-path`.
- **Effect**: Home shows streak (5), XP (420), “Continue” lesson, 3 recommended lessons, 3 scenario cards, daily goal 1/3, Daily Lessons hub with activities and generated lesson, Context prompts feed with cards.
- **To get this**: Use default mocks (no scenario switcher) or set scenario to `happy-path`.

---

## 6. Rebuild / Regenerate Static Data

- **From repo root**:  
  - Factories and scenario builders live in `src/demo-data/` (factories/, scenarios/).  
  - To export a snapshot of the default (happy-path) dataset to JSON:  
    `npx tsx scripts/demo-data/run-seed.ts`  
  - Output: `scripts/demo-data/output/demo-dataset-snapshot.json` (for reference; app loads from in-memory getDemoDataset() at runtime).  
  - To change default scenario in code: edit `src/demo-data/index.ts` and set `DEFAULT_SCENARIO` to another id, then rebuild.

---

## 7. Verifying Data Locally

- **Home**: Check streak, XP, “Continue [lesson]”, recommended list, scenario cards, daily goal.
- **Learn**: Lesson list has 12+ lessons; at least one shows “In progress” or “Continue” if using progress.
- **Progress**: Progress page shows streak, XP, lessons completed, weekly minutes.
- **Daily Lessons**: Hub shows today’s activities; history shows at least one generated lesson.
- **Context prompts**: Feed shows multiple prompt cards.
- **Auth**: Log in with demo@example.com / demo123; after onboarding, Home is populated.
- **Cap (if at-cap user)**: Log in as at-cap user; start a new lesson → cap modal.
