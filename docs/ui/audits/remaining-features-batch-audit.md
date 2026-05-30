# Remaining Features UI Batch Audit (E-03 through E-15)

**Features**: Core Lessons, Gamification, Personalization, AI Tutor Feedback, Scenario Simulations, AI Voice Tutor, Listening, Pronunciation, Exam Preparation, Notifications, Daily Reflection, Location-Aware Prompts  
**Audit date**: Per run  
**Prerequisite**: docs/ui/reviews/remaining-features-batch-review.md (passed).

---

## Verification Checklist

### Routes and screens exist

- **Core Lessons**: /app/learn, /app/learn/:lessonId, /app/learn/:lessonId/flashcards, /app/learn/:lessonId/quiz — all registered and render.
- **Gamification**: /app/achievements, /app/progress; Home shows streak/XP.
- **Personalization**: Home session set (Continue, Daily goal, scenarios) — present.
- **Scenario Simulations**: /app/practice/simulation/:scenarioId? — present; PaywallModal on scenario cap.
- **Voice / Listening / Pronunciation**: /app/practice/voice, /app/practice/listening/:exerciseId, /app/practice/pronunciation-feedback — present.
- **Exam**: /app/exam — present.
- **Reflection**: /app/reflection — present.
- **Location-Aware**: /app/context-prompts, intro, settings, :promptId — present.
- **Daily Life Lessons**: /app/daily-lessons, intro, capture, history, settings — present.
- **Notifications**: Settings has Notifications row; onboarding has notification step.

**Result**: All documented routes and screens exist. **Pass.**

---

### Buttons and navigation

- Lesson discovery: lesson click → guided or PaywallModal; filters work.
- Guided lesson: Back, Continue, Flashcards, Quiz — wired.
- Scenario list: scenario click → simulation or PaywallModal — wired.
- Home: Continue learning, Practice with AI, Progress/Achievements — wired.
- Settings: profile edit, subscription, permissions — wired.

**Result**: Primary CTAs and navigation wired. **Pass.**

---

### Mock data and gates

- Lessons, progress, scenarios, achievements from demo-data/mocks; entitlement provider drives usage and cap; PaywallModal shown when at lesson or scenario cap.

**Result**: Mock data and entitlement gates in place. **Pass.**

---

## Audit Verdict

**Pass.**

Remaining features (E-03 through E-15) meet UI completion criteria: screens exist, routes work, buttons are wired, mock/demo data supports flows, and entitlement gates (PaywallModal) are integrated for lessons and scenarios.
