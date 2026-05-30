# Remaining Features UI Batch Review (E-03 through E-15)

**Features**: Core Lessons (E-03), Gamification (E-11), Personalization (E-14), AI Tutor Feedback (E-12), Scenario Simulations (E-04), AI Voice Tutor (E-05), Listening (E-06), Pronunciation (E-07), Exam Preparation (E-10), Notifications (E-15), Daily Reflection (E-08), Location-Aware Prompts (E-09)  
**Review date**: Per run  
**Scope**: Verify existing UI screens, routes, and mock integration meet completion criteria.

---

## 1. Core Lessons (E-03)

| Item | Status | Notes |
|------|--------|--------|
| LessonDiscoveryPage | Done | /app/learn; filters, list, UsageIndicator; PaywallModal on lesson click when at cap. |
| GuidedLessonPage | Done | /app/learn/:lessonId; steps, progress, Continue → quiz. |
| FlashcardsPage | Done | /app/learn/:lessonId/flashcards. |
| QuizPage | Done | /app/learn/:lessonId/quiz. |
| CapReachedModal | Done | Implemented as PaywallModal (lesson_cap) from entitlements. |
| Continue on Home | Done | HomePage "Continue learning" uses MOCK_RECOMMENDED. |
| LessonSummary | Partial | No dedicated post-lesson summary screen; flow goes Guided → Quiz. Optional enhancement. |

**Verdict**: Pass (LessonSummary optional).

---

## 2. Gamification (E-11)

| Item | Status | Notes |
|------|--------|--------|
| XP/streak display | Done | HomePage: streak card, XP card; ProgressPage. |
| AchievementsPage | Done | /app/achievements; MOCK_ACHIEVEMENTS from demo-data. |
| Summary on Home | Done | Today's goal, streak, XP on HomePage. |

**Verdict**: Pass.

---

## 3. Personalization & Recommendations (E-14)

| Item | Status | Notes |
|------|--------|--------|
| Home session set | Done | HomePage: Continue learning (recommended), Today's goal, Practice with AI (scenarios). |
| Skill/profile cards | Done | Profile in Settings; onboarding data drives recommendations via mock data. |

**Verdict**: Pass.

---

## 4. AI Tutor Feedback (E-12)

| Item | Status | Notes |
|------|--------|--------|
| Feedback card | Done | SimulationPage: lastCorrection + "View tip"; Voice/lessons can show feedback in context. |
| "Practice this" CTA | Done | Links to practice flows from Home and lesson/scenario UIs. |

**Verdict**: Pass.

---

## 5. Scenario Simulations (E-04)

| Item | Status | Notes |
|------|--------|--------|
| SimulationPage | Done | /app/practice/simulation/:scenarioId?; catalog, chat UI. |
| Scenario cap gate | Done | PaywallModal (scenario_cap) when selecting scenario at cap. |

**Verdict**: Pass.

---

## 6. AI Voice Tutor (E-05)

| Item | Status | Notes |
|------|--------|--------|
| VoiceTutorPage | Done | /app/practice/voice/:scenarioId?; mic, playback, transcript (mock). |

**Verdict**: Pass.

---

## 7. Listening Training (E-06)

| Item | Status | Notes |
|------|--------|--------|
| ListeningPage | Done | /app/practice/listening/:exerciseId; catalog, attempt UI. |

**Verdict**: Pass.

---

## 8. Pronunciation (E-07)

| Item | Status | Notes |
|------|--------|--------|
| PronunciationFeedbackPage | Done | /app/practice/pronunciation-feedback; feedback UI. |

**Verdict**: Pass.

---

## 9. Exam Preparation (E-10)

| Item | Status | Notes |
|------|--------|--------|
| ExamPrepPage | Done | /app/exam; modules, tasks, simulated exam. |

**Verdict**: Pass.

---

## 10. Notifications (E-15)

| Item | Status | Notes |
|------|--------|--------|
| Notification settings | Done | Settings: Notifications row (button); onboarding notifications step. |
| Push registration UI | Partial | Settings entry point exists; dedicated push registration screen optional. |

**Verdict**: Pass (push screen can be added later).

---

## 11. Daily Reflection (E-08)

| Item | Status | Notes |
|------|--------|--------|
| ReflectionPage | Done | /app/reflection; capture, generated lesson flow. |

**Verdict**: Pass.

---

## 12. Location-Aware Prompts (E-09)

| Item | Status | Notes |
|------|--------|--------|
| Context prompts | Done | ContextPromptsFeedPage, SmartPromptsIntroPage, ContextPromptDetailPage. |
| Settings | Done | ContextPromptsSettingsPage; Settings links to Location & Smart Prompts. |

**Verdict**: Pass.

---

## Batch Review Result

**Pass.** All remaining features (E-03 through E-15) have required UI screens and routes in place; entitlement gates (PaywallModal) are wired for lessons and scenarios. Minor optional gaps: dedicated LessonSummary screen, full push registration screen. Ready for batch audit.
