# Demo Scenarios — AI Dutch Coach

**Purpose**: Realistic, coherent product states for local development and demos. Each scenario represents a full dataset that makes the app feel alive and exercises specific flows.

---

## 1. Scenario: Happy-path active learner (default)

| Attribute | Value |
|-----------|--------|
| **Name** | happy-path |
| **Purpose** | Default local experience: engaged user with mixed progress and recommendations. |
| **Key entities** | 1 primary user (A1); 12+ lessons (A0–A2); 3–5 completed, 1 in_progress; 5 scenarios; progress summary (XP 400+, streak 5); daily activities; 1 generated lesson; context prompts. |
| **User state** | Authenticated; onboarding complete; free tier; usage 2/5 today. |
| **Features exercised** | Home (streak, XP, Continue, recommended, scenarios), Lesson list (filter, open lesson), Lesson run (resume), Progress page, Daily Lessons hub, Context prompts, Settings. |
| **UI states** | Populated dashboard; “Continue [lesson]” visible; recommendations; daily goal partial; no cap modal. |

---

## 2. Scenario: New user (just onboarded)

| Attribute | Value |
|-----------|--------|
| **Name** | new-user |
| **Purpose** | Test first-time experience: minimal progress, empty or small recommendations. |
| **Key entities** | 1 user (A1); same lesson catalog (12+); no lesson_progress; usage 0; progress summary (XP 0, streak 0); no or 1 daily activity; no generated lesson yet. |
| **User state** | Authenticated; onboarding complete; free tier. |
| **Features exercised** | Home (empty Continue; recommendations only), Lesson list, first lesson start, Progress (zeros or low). |
| **UI states** | Empty “Continue”; recommendations list; zero streak; daily goal 0/N. |

---

## 3. Scenario: Free user at daily cap

| Attribute | Value |
|-----------|--------|
| **Name** | at-cap |
| **Purpose** | Test cap modal and upsell when free user has used 5/5 lessons today. |
| **Key entities** | 1 user (free); usage_counts.lessons_completed_count = 5 for today; 5 lesson_progress completed today; no in_progress. |
| **User state** | Free tier; at cap. |
| **Features exercised** | Lesson list, attempt to start new lesson → cap modal, upsell CTA, usage indicator. |
| **UI states** | “5/5 lessons today”; 403/cap modal on start new lesson. |

---

## 4. Scenario: Trial user

| Attribute | Value |
|-----------|--------|
| **Name** | trial |
| **Purpose** | Test trial state: full access, trial_ends_at visible. |
| **Key entities** | 1 user; trial_ends_at = now + 5 days; no subscription; usage irrelevant for gating. |
| **User state** | Tier = trial. |
| **Features exercised** | All features unlocked; trial banner in Settings/Home; manage subscription when ready. |
| **UI states** | “Your trial ends on …”; premium features accessible. |

---

## 5. Scenario: Premium user

| Attribute | Value |
|-----------|--------|
| **Name** | premium |
| **Purpose** | Test premium: no cap, manage subscription. |
| **Key entities** | 1 user; subscription active; current_period_end in future. |
| **User state** | Tier = premium. |
| **Features exercised** | All features; Settings subscription section “Premium Active”; manage_url. |
| **UI states** | No cap; no trial banner; “Manage subscription” link. |

---

## 6. Scenario: Power user (heavy activity)

| Attribute | Value |
|-----------|--------|
| **Name** | power-user |
| **Purpose** | Test dashboards with high numbers and history. |
| **Key entities** | 1 user; 20+ lessons completed; long streak (14); high XP (2000+); many daily activities; 3+ generated lessons in history; multiple scenarios completed. |
| **User state** | Free or premium. |
| **Features exercised** | Progress page (high stats), activity timeline, Daily Lessons history, Achievements (several unlocked). |
| **UI states** | Full progress bars; long streak; achievement badges; scrollable history. |

---

## 7. Scenario: Edge-case / empty and partial

| Attribute | Value |
|-----------|--------|
| **Name** | edge-case |
| **Purpose** | Test empty states, one in_progress, no daily activities. |
| **Key entities** | 1 user; 1 in_progress lesson; 0 completed today; 0 daily activities; recommendations still from catalog. |
| **User state** | Free. |
| **Features exercised** | Continue (one item); empty daily hub; empty activity list; zero streak possible. |
| **UI states** | Empty state for daily activities; “Continue” has one lesson; minimal progress. |

---

## 8. Scenario Summary Table

| Scenario | User type | Lesson progress | Usage | Progress summary | Daily / prompts |
|----------|-----------|------------------|-------|------------------|------------------|
| happy-path | free | 5 completed, 1 in_progress | 2/5 | XP 420, streak 5 | Activities + generated; prompts |
| new-user | free | 0 | 0/5 | XP 0, streak 0 | Optional 1 activity |
| at-cap | free | 5 completed today | 5/5 | — | — |
| trial | trial | any | — | any | any |
| premium | premium | any | — | any | any |
| power-user | free/premium | 20+ completed | — | XP 2000+, streak 14 | Many activities + history |
| edge-case | free | 1 in_progress | 0 | low | 0 activities |
