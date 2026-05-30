# Feature Index — AI Dutch Coach

## Purpose

This index lists all **major features** and their **sub-features** (capability modules) for fine-grained implementation documentation. Each sub-feature has a dedicated specification in `docs/features/deep-dives/sub-features/{feature-name}/{sub-feature-name}.md`.

**Source of truth**: docs/final/feature-domain-breakdown.md, business requirements, architecture, existing deep-dives.

---

## 1. Authentication

| Attribute | Value |
|-----------|--------|
| **Description** | Sign-up, login (email/social), session, logout; foundation for all authenticated flows. |
| **Priority** | P0 |
| **Dependencies** | — |

### Sub-features

| Sub-feature | Description | Spec file |
|-------------|-------------|-----------|
| sign-up | Email/password and optional OAuth registration; account creation | sign-up.md |
| login | Email/password and OAuth login; session creation | login.md |
| session-management | Session/JWT validation, refresh, attach user to request | session-management.md |
| logout | Invalidate session; client clear storage | logout.md |
| password-reset | Forgot password request and token-based reset | password-reset.md |
| oauth-integration | OAuth provider redirect and callback; account link | oauth-integration.md |

---

## 2. Onboarding & Profile (FD-01)

| Attribute | Value |
|-----------|--------|
| **Description** | Profile collection (level, goals, context), consent, first recommendation. |
| **Priority** | P0 |
| **Dependencies** | Authentication |

### Sub-features

| Sub-feature | Description | Spec file |
|-------------|-------------|-----------|
| profile-steps | Multi-step profile form (language, country, family, occupation, goals) | profile-steps.md |
| profile-persistence | Save and update profile; validation; edit from Settings | profile-persistence.md |
| consent-management | Per-type consent (microphone, location, notifications, photo, AI context); grant/withdraw | consent-management.md |
| onboarding-resume | Partial save; resume at last step; onboarding_completed flag | onboarding-resume.md |
| first-recommendation | Compute and return first/next lesson at onboarding completion | first-recommendation.md |

---

## 3. Core Lessons (FD-02)

| Attribute | Value |
|-----------|--------|
| **Description** | Vocabulary, grammar, flashcards, quizzes; CEFR-aligned micro-lessons. |
| **Priority** | P0 |
| **Dependencies** | Profile, Entitlements, Content |

### Sub-features

| Sub-feature | Description | Spec file |
|-------------|-------------|-----------|
| lesson-catalog | List lessons; filter by level, topic, exam; pagination; only published | lesson-catalog.md |
| lesson-run | Load lesson content for start/resume; steps and exercises; cap check at start | lesson-run.md |
| lesson-progress | Checkpoint and persist last_step_index; status in_progress/completed | lesson-progress.md |
| lesson-completion | Submit quiz; score; persist completed; trigger Gamification, usage, SR | lesson-completion.md |
| lesson-cap-enforcement | Free-tier daily cap; check at start; 403 free_cap_reached; usage increment on complete | lesson-cap-enforcement.md |
| quiz | Quiz block; questions; submit; retry once; pass/fail; correct answers | quiz.md |
| flashcards | Flashcard step or standalone; part of lesson or review | flashcards.md |

---

## 3A. CEFR curriculum path & revision (extension)

| Attribute | Value |
|-----------|--------|
| **Description** | Level-bound ordered curriculum (units → lessons), suggested daily plan, weak-area practice, and revision sessions; extends FD-01, FD-02, E-14 without replacing lesson runtime. |
| **Priority** | P0 (path UI phased: P0 read-only path + Today, P1 weak/revision) |
| **Dependencies** | Authentication, Profile, Core Lessons (published content + `lesson_progress`), optional Gamification |

**Specs (source of truth for this extension)**:

- **Implementation-grade deep-dive (§1–§26)**: `docs/features/deep-dives/cefr-curriculum-path.md` · **Final pointer**: `docs/features/deep-dives/final/cefr-curriculum-path.md`
- Product overview: `docs/feature-extensions/cefr-curriculum-path-overview.md`
- Impact (files, data, rollout): `docs/feature-extensions/cefr-curriculum-path-impact-assessment.md`
- Implementation checklist: `docs/implementation/features/cefr-curriculum-path.md`
- Extension sign-off: `docs/feature-extensions/final/cefr-curriculum-path-final.md`

### Sub-features (logical modules)

| Sub-feature | Description | Spec / notes |
|-------------|-------------|----------------|
| study-level-context | `active_study_level` vs profile self-assessment; settings + validation | overview §5–§6 |
| curriculum-manifest | Manifest, units, ordered lesson IDs per locale/level; CMS/JSON importer | overview §5; `docs/curriculum/populating-level-curriculum.md` |
| user-path-progress | Next lesson, unit completion derived from `lesson_progress` | overview §5, §8 |
| daily-learning-plan | Daily queue (time/count goal), idempotent completion | overview §5–§7 |
| weak-area-signals | Aggregates from quiz/exercise mistakes by topic/skill | overview §5, §8 |
| revision-sessions | Short mixed exercises from completed lesson pools (v1 = template-based) | overview §5, §13 |

---

## 4. Scenario Simulations (FD-03)

| Attribute | Value |
|-----------|--------|
| **Description** | Text/chat practice with AI in Dutch (real-life situations). |
| **Priority** | P1 |
| **Dependencies** | Profile, Entitlements, AI Conversation, Moderation |

### Sub-features

| Sub-feature | Description | Spec file |
|-------------|-------------|-----------|
| scenario-catalog | List scenarios by level and profile; scenario metadata | scenario-catalog.md |
| conversation-session | Start session; context and first message; entitlement and cap check | conversation-session.md |
| conversation-turn | User message → moderation → LLM → moderate response → persist and return | conversation-turn.md |
| conversation-moderation | Input validation; AI output moderation (IS-017) | conversation-moderation.md |
| scenario-completion | End session; summary; trigger feedback and XP; persist | scenario-completion.md |
| scenario-cap-enforcement | Free-tier scenario cap (e.g. per week); check on start | scenario-cap-enforcement.md |

---

## 5. AI Voice Tutor (FD-04)

| Attribute | Value |
|-----------|--------|
| **Description** | Spoken Dutch conversation with AI; TTS/STT/LLM. |
| **Priority** | P1 |
| **Dependencies** | Entitlements, Consent, Speech APIs, AI Conversation |

### Sub-features

| Sub-feature | Description | Spec file |
|-------------|-------------|-----------|
| voice-session | Start voice session; entitlement and microphone consent; create session | voice-session.md |
| voice-turn | Audio or text in; STT → LLM → TTS; return audio and transcript | voice-turn.md |
| voice-stt-tts | Integration with STT and TTS providers; streaming optional | voice-stt-tts.md |
| voice-completion | End session; optional pronunciation; summary; XP; fair-use count | voice-completion.md |

---

## 6. Listening Training (FD-05)

| Attribute | Value |
|-----------|--------|
| **Description** | Audio exercises, questions, no transcript during attempt. |
| **Priority** | P1 |
| **Dependencies** | Content, Entitlements, CDN |

### Sub-features

| Sub-feature | Description | Spec file |
|-------------|-------------|-----------|
| listening-catalog | List listening exercises by level, topic, exam; premium flag | listening-catalog.md |
| listening-attempt | Load exercise (audio URL, questions); submit answers; no transcript until after | listening-attempt.md |
| listening-scoring | Score attempt; persist; return feedback and optional transcript | listening-scoring.md |

---

## 7. Pronunciation (FD-06)

| Attribute | Value |
|-----------|--------|
| **Description** | Pronunciation feedback (phoneme, stress, fluency) after speech. |
| **Priority** | P1 |
| **Dependencies** | Entitlements, Consent, Speech/Pronunciation API |

### Sub-features

| Sub-feature | Description | Spec file |
|-------------|-------------|-----------|
| pronunciation-analysis | Call pronunciation API with audio; return score and tips | pronunciation-analysis.md |
| pronunciation-persistence | Store result; link to user/level; retention per BR-4 | pronunciation-persistence.md |
| pronunciation-feedback-ui | Display score and tips; optional replay; gate by entitlement and consent | pronunciation-feedback-ui.md |

---

## 8. Daily Reflection (FD-07)

| Attribute | Value |
|-----------|--------|
| **Description** | Log activities (photo/location/notes); generated “Your day” lesson. |
| **Priority** | P2 |
| **Dependencies** | Profile, Consent, LLM, Moderation, Entitlements |

### Sub-features

| Sub-feature | Description | Spec file |
|-------------|-------------|-----------|
| reflection-entries | Add and persist reflection entries (note, optional photo, location); consent | reflection-entries.md |
| reflection-lesson-generation | Trigger LLM to generate lesson from entries and profile | reflection-lesson-generation.md |
| daily-lesson-delivery | Serve generated lesson; complete and progress; premium gate | daily-lesson-delivery.md |

---

## 9. Location-Aware Prompts (FD-08)

| Attribute | Value |
|-----------|--------|
| **Description** | Phrase suggestions when near venues (e.g. café); optional. |
| **Priority** | P2 |
| **Dependencies** | Consent, Location, Venue config |

### Sub-features

| Sub-feature | Description | Spec file |
|-------------|-------------|-----------|
| location-consent | Enable/disable feature; location consent; BR-3 | location-consent.md |
| venue-config | Venue types and phrases; geofence or config | venue-config.md |
| prompt-trigger | Detect proximity; trigger when app open (or background if supported) | prompt-trigger.md |
| prompt-display | In-app card with phrase; dismiss or practice CTA | prompt-display.md |

---

## 10. Exam Preparation (FD-09)

| Attribute | Value |
|-----------|--------|
| **Description** | A2/B1/KNM (and ONA) aligned practice and simulated exams. |
| **Priority** | P1 |
| **Dependencies** | Content, Entitlements, Lesson Engine |

### Sub-features

| Sub-feature | Description | Spec file |
|-------------|-------------|-----------|
| exam-modules | List exam types and components; map to tasks | exam-modules.md |
| exam-tasks | Task content and format; level and component; premium gate | exam-tasks.md |
| exam-progress | Track completion per component; aggregate progress | exam-progress.md |
| simulated-exam | Start timed attempt; sequence of tasks; submit; score per component | simulated-exam.md |

---

## 11. Gamification (FD-10)

| Attribute | Value |
|-----------|--------|
| **Description** | XP, streaks, achievements; retention. |
| **Priority** | P0 |
| **Dependencies** | All activity-completion flows |

### Sub-features

| Sub-feature | Description | Spec file |
|-------------|-------------|-----------|
| xp-award | Award XP on activity completion; configurable per type; no pay-to-win | xp-award.md |
| streak-management | Consecutive days; update on activity; optional streak freeze | streak-management.md |
| achievements | Rules-based achievements; evaluate on completion; persist unlock | achievements.md |
| gamification-summary | Expose XP, streak, achievements to client (home, profile) | gamification-summary.md |

---

## 12. AI Tutor Feedback (FD-11)

| Attribute | Value |
|-----------|--------|
| **Description** | Post-activity feedback (grammar, vocab, pronunciation, fluency, listening). |
| **Priority** | P0 |
| **Dependencies** | Lessons, Scenarios, Voice, Session data |

### Sub-features

| Sub-feature | Description | Spec file |
|-------------|-------------|-----------|
| feedback-generation | Aggregate session/lesson data; rule-based or LLM; categories; moderate | feedback-generation.md |
| feedback-persistence | Store feedback record; link to source; history | feedback-persistence.md |
| feedback-display | Show feedback card; “Practice this” CTA; indicate AI (IS-016) | feedback-display.md |

---

## 13. Entitlements & Subscription (FD-12)

| Attribute | Value |
|-----------|--------|
| **Description** | Free vs premium, trial, subscription, gating, usage limits. |
| **Priority** | P0 |
| **Dependencies** | Payment provider, Usage tracking |

### Sub-features

| Sub-feature | Description | Spec file |
|-------------|-------------|-----------|
| entitlement-check | Resolve tier (free/trial/premium); expose to client; internal check for gating | entitlement-check.md |
| usage-tracking | Count lessons/scenarios per period; increment on complete; read for cap | usage-tracking.md |
| trial-management | Trial start and end; trial_ends_at; revert to free at end | trial-management.md |
| subscription-webhooks | Receive payment provider webhooks; update subscription state; idempotent | subscription-webhooks.md |
| cap-enforcement | Compare usage to cap; return 403 free_cap_reached; product config | cap-enforcement.md |

---

## 14. Personalization & Recommendations

| Attribute | Value |
|-----------|--------|
| **Description** | Learning path, recommendations, skill profile, spaced repetition. |
| **Priority** | P0 |
| **Dependencies** | Profile, Progress, Content, Lesson Engine |

### Sub-features

| Sub-feature | Description | Spec file |
|-------------|-------------|-----------|
| recommendations-api | GET recommendations and session set (Continue, Daily, Scenario, etc.) | recommendations-api.md |
| skill-profile | Compute and expose skill scores; weak/strong; from progress and activity | skill-profile.md |
| activity-ingestion | POST activity-event; update progress and skill profile | activity-ingestion.md |
| session-set | Curate home cards (Continue, Daily, Scenario, Weak skill, Exam, Streak, Goal) | session-set.md |
| learning-path | Daily/weekly goals; progress toward goal; optional path generator | learning-path.md |
| spaced-repetition | recordRecall; getDueForReview; “Review flashcards” recommendation | spaced-repetition.md |

---

## 15. Notifications

| Attribute | Value |
|-----------|--------|
| **Description** | In-app and push; preferences, registration; re-engagement. |
| **Priority** | P2 |
| **Dependencies** | Profile, Entitlements, Push provider |

### Sub-features

| Sub-feature | Description | Spec file |
|-------------|-------------|-----------|
| notification-settings | GET/PATCH push and in-app preferences; consent | notification-settings.md |
| push-registration | Register device token; associate with user; unregister on logout | push-registration.md |
| trigger-delivery | On trigger (streak_reminder, trial_ending, daily_lesson_ready) send push | trigger-delivery.md |

---

## File Locations

| Item | Path |
|------|------|
| **Feature index** | docs/features/deep-dives/feature-index.md (this file) |
| **Sub-feature specs** | docs/features/deep-dives/sub-features/{feature-name}/{sub-feature-name}.md |
| **Reviews** | docs/features/deep-dives/reviews/ |
| **Audits** | docs/features/deep-dives/audits/ |
| **Final** | docs/features/deep-dives/final/ |
| **Coverage report** | docs/features/deep-dives/final/coverage-report.md |
