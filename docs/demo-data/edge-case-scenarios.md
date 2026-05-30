# Edge-Case Scenarios — Demo Data

**Purpose**: Targeted demo data for edge cases and special UI states so developers can test them quickly without manual setup.

---

## 1. Empty states

| Scenario | Data | Screen / component |
|----------|------|--------------------|
| **No recommendations** | New user; 0 lesson_progress; catalog still has lessons | Home “Recommended”; can show “Start your first lesson” |
| **No Continue** | 0 lesson_progress in_progress; 0 completed | Home “Continue learning” empty or CTA “Browse lessons” |
| **No daily activities** | Empty daily_activities array | Daily Lessons hub “Add your first moment” |
| **No generated lesson** | No generated_lessons for today | Daily Lessons “Generate from your day” or empty |
| **No notifications** | Empty notifications list | Notifications center empty state |
| **Zero streak** | streak = 0, lessonsCompleted low | Home streak card “Start a streak” |

---

## 2. Partial / in-progress states

| Scenario | Data | Purpose |
|----------|------|---------|
| **One in-progress lesson** | 1 lesson_progress status=in_progress, last_step_index=2 | “Continue [Lesson]” link; resume flow |
| **Partial daily goal** | dailyGoal=3; 1 or 2 completed today | Progress bar 1/3 or 2/3 |
| **Generated lesson in progress** | completionStatus=in_progress | Daily lesson “Resume” or “In progress” |
| **Incomplete onboarding** | hasCompletedOnboarding=false | Redirect to onboarding (auth flow) |

---

## 3. Cap and entitlement edge cases

| Scenario | Data | Purpose |
|----------|------|---------|
| **Free at cap** | usage_counts.lessons_completed_count = 5 for today; tier=free | 403 / cap modal on start new lesson; “5/5 today” |
| **Trial ending tomorrow** | trial_ends_at = now + 1 day | Trial banner “Ends tomorrow”; upsell nudge |
| **Premium expired** | subscription_ends_at in past; tier=free | Settings “Renew” or “Expired” |
| **Usage just under cap** | lessons_completed_count = 4; cap = 5 | One more lesson allowed; usage indicator 4/5 |

---

## 4. Content and list edge cases

| Scenario | Data | Purpose |
|----------|------|---------|
| **Single lesson in list** | 1 lesson in catalog (filtered) | List with one card; no “empty” but minimal |
| **All lessons completed** | All lesson_progress completed for catalog | Home “You’ve completed these”; recommendations empty or “Review” |
| **Mix premium and free** | Some lessons isPremium=true | Locked cards for free user; unlock for premium |
| **Long lesson title** | Title > 40 chars | Truncation in card |
| **Many recommendations** | 10+ recommended | Scroll; “See all” behavior |

---

## 5. Progress and gamification edge cases

| Scenario | Data | Purpose |
|----------|------|---------|
| **Zero XP and streak** | xp=0, streak=0, lessonsCompleted=0 | New user progress page |
| **Very long streak** | streak=30 | Streak display; “Streak freeze” if in product |
| **High XP** | xp=5000+ | Progress page; leaderboard placeholder |
| **Skills all same level** | All skills A1 at 50% | Progress skill bars |

---

## 6. Daily and prompts edge cases

| Scenario | Data | Purpose |
|----------|------|---------|
| **Many activities today** | 10+ daily activities | Scroll; “Generate lesson” with many sources |
| **Generated lesson failed** | generationStatus.status=’failed’ | Error state; retry CTA |
| **No prompts for venue** | Empty phrases for one venue | Venue card with “No phrases yet” or hide |
| **Prompt with one phrase** | 1 phrase in prompt | Detail page still works |

---

## 7. Admin edge cases (if applicable)

| Scenario | Data | Purpose |
|----------|------|---------|
| **Empty queue** | 0 items in review queue | Empty state “No items to review” |
| **Batch with failures** | Batch with 2 failed, 3 succeeded | Batch detail: partial success |
| **Large batch** | 100+ requests in batch | Pagination or “Show more” |

---

## 8. Implementation note

- Each edge case can be a **scenario variant** (e.g. scenario = “new-user” for empty Continue) or a **sub-set of the default dataset** (e.g. filter to one lesson).
- Prefer one scenario per “persona” (new-user, at-cap, trial, premium, power-user) and document which edge cases each scenario covers.
