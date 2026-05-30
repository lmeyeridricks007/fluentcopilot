# Feature Domain Breakdown

## Document Info

| Attribute | Value |
|-----------|--------|
| Phase | 4 – Feature Domain Breakdown |
| Status | **Final** |
| Source | feature-domain-breakdown-v1.md; audit passed |

---

## 1. Purpose and Scope

This document breaks down each major product capability into **feature domains** with: user goal, business goal, triggers, primary and alternate workflows, edge cases, permissions, business rules, functional requirements (FR), non-functional requirements (NFR), data dependencies, integration dependencies, analytics events, monetization relevance, and rollout complexity. It is implementation-oriented and references BFRs, IS-* requirements, and Architecture components.

**In scope**: Onboarding & profile, core lessons (vocabulary, grammar, flashcards, quizzes), scenario simulations, AI voice tutor, listening training, pronunciation, daily reflection, location-aware prompts, exam prep, gamification, AI feedback, entitlements & subscription.

**Out of scope**: Detailed UI wireframes (UI doc), API request/response schemas (Backend doc), schema DDL (Data doc).

---

## 2. Feature Domains Overview

| Domain | User Goal | Business Goal | Monetization |
|--------|-----------|---------------|--------------|
| FD-01 Onboarding & Profile | Complete profile and get personalized path | Collect profile for personalization; set level/goals | — |
| FD-02 Core Lessons | Learn vocab, grammar via micro-lessons | Engagement; progression | Free (capped) |
| FD-03 Scenario Simulations | Practice real-life conversations (text/voice) | Engagement; differentiation | Premium |
| FD-04 AI Voice Tutor | Speak with AI in Dutch; get feedback | Premium value; retention | Premium |
| FD-05 Listening Training | Improve listening with audio exercises | Engagement; exam prep | Premium (advanced) |
| FD-06 Pronunciation | Get pronunciation feedback on speech | Premium value | Premium |
| FD-07 Daily Reflection | Turn daily activities into a lesson | Personalization; habit | Premium |
| FD-08 Location-Aware Prompts | Get phrase suggestions near venues | Differentiation; optional | Premium/optional |
| FD-09 Exam Preparation | Prepare for A2/B1/KNM (and ONA) | Conversion; retention | Premium |
| FD-10 Gamification | Earn XP, streaks, achievements | Retention; engagement | — |
| FD-11 AI Tutor Feedback | Get feedback after lessons/conversations | Learning efficacy; trust | Free + Premium |
| FD-12 Entitlements & Subscription | Access free vs. premium; trial; pay | Revenue; conversion | Core |

---

## 3. FD-01: Onboarding & Profile

### 3.1 User Goal

Set up account, provide profile (language, level, goals, context), and receive a personalized first recommendation.

### 3.2 Business Goal

Collect attributes for personalization (BFR-005); support level and target (IS-002); set consent for optional features (BFR-009).

### 3.3 Triggers

- First launch after sign-up; or return user opening app (resume).

### 3.4 Primary Workflow

1. Sign up / log in (email or social; see Backend for auth).
2. **Profile**: Native language, known languages, country of origin, time in NL, family status, age group, occupation/industry, hobbies, daily routines.
3. **Level & goals**: Current Dutch level (A0–C1), target level (A2/B1/B2), target objective (integration exam, workplace, social).
4. **Consent**: Microphone, location, notifications, photo upload, AI use of context — each optional with clear explanation.
5. System computes/saves profile; recommends first lesson or next step.
6. User enters main app (home/dashboard).

### 3.5 Alternate Workflows

- Skip optional steps (minimal required: level, target, at least one objective).
- Edit profile later from settings.
- Withdraw consent later; features that depend on it degrade or disable.

### 3.6 Edge Cases

- User closes before completing: save partial progress; resume at last step.
- Invalid or missing required fields: validation errors; no submit until valid.

### 3.7 Permissions

- No device permissions in onboarding except optional consent flags; actual microphone/location requested when first used (e.g. first voice lesson).

### 3.8 Business Rules

- BR-2 (level drives content); BFR-005 (profile for personalization); BFR-009 (consent).
- At least: current level, target level, one goal required to get recommendations.

### 3.9 Functional Requirements

| ID | Requirement |
|----|-------------|
| FD01-FR-001 | System shall persist profile attributes (native language, level, goals, occupation, family, etc.) per user. |
| FD01-FR-002 | System shall persist consent flags per user per consent type (microphone, location, notifications, photo, AI context). |
| FD01-FR-003 | System shall allow partial save of onboarding and resume. |
| FD01-FR-004 | System shall recommend first or next lesson based on profile and level (IS-002, IS-003). |

### 3.10 NFRs

- Profile and consent data in EU (BNFR-001). Latency: onboarding save < 2s.

### 3.11 Data Dependencies

- User, profile, consent tables (Data doc). Profile service (Architecture).

### 3.12 Integration Dependencies

- Auth provider (if social login). None for profile storage (internal).

### 3.13 Analytics Events

- onboarding_started, onboarding_step_completed, onboarding_completed, consent_granted/withdrawn (per type).

### 3.14 Monetization

- None directly; enables personalization for conversion.

### 3.15 Rollout

- Low; core path. Feature-flag for optional steps if A/B testing.

---

## 4. FD-02: Core Lessons (Vocabulary, Grammar, Flashcards, Quizzes)

### 4.1 User Goal

Learn vocabulary and grammar in short, level-appropriate lessons; reinforce with flashcards and quizzes.

### 4.2 Business Goal

Deliver CEFR-aligned micro-learning (IS-007, IS-008, IS-010); enforce free-tier caps (BFR-011, BR-8).

### 4.3 Triggers

- User opens "Learn" or "Continue"; home recommends next lesson.

### 4.4 Primary Workflow

1. User sees recommended lesson(s) or browses by topic/level.
2. Selects lesson (vocabulary, grammar, or mixed).
3. Completes lesson (cards, exercises, quiz); progress saved.
4. Spaced repetition queue updated (IS-008).
5. XP/streak updated (FD-10).
6. If free and cap reached: upsell or "come back tomorrow."

### 4.5 Alternate Workflows

- Browse by topic (e.g. food, work) or exam tag.
- Follow **CEFR curriculum path** (ordered units/lessons for selected study level), **daily plan**, **weak-area practice**, and **revision** sessions when that extension is enabled — see `docs/feature-extensions/cefr-curriculum-path-overview.md`.
- Do only flashcards or only quiz if lesson allows.
- Retry failed quiz once; then show correct answers.

### 4.6 Edge Cases

- Network loss during lesson: save progress at checkpoints; resume or restart.
- Free user at daily cap: block new lesson; show upsell.

### 4.7 Permissions

- None beyond auth. Optional: notifications for reminders.

### 4.8 Business Rules

- BR-2 (level); BR-8 (free caps); IS-001 (CEFR tag), IS-007 (micro-learning), IS-008 (spaced repetition).
- Free-tier: e.g. 3–5 lessons per day or equivalent (exact number in product config).

### 4.9 Functional Requirements

| ID | Requirement |
|----|-------------|
| FD02-FR-001 | System shall serve lessons tagged with CEFR level and topic; filter by user level (IS-001, IS-003). |
| FD02-FR-002 | System shall support vocabulary and grammar lesson types with flashcards and quizzes. |
| FD02-FR-003 | System shall update spaced-repetition schedule on lesson completion (IS-008). |
| FD02-FR-004 | System shall enforce free-tier lesson/quota limits per user per period (BFR-011). |
| FD02-FR-005 | System shall record progress (completed units, score) and expose to Gamification (XP). |

### 4.10 NFRs

- Lesson load < 3s (first content). Offline: degraded message or cached last lesson (UI doc).

### 4.11 Data Dependencies

- Lessons, progress, user level, entitlements (Data doc). Lesson Engine, Entitlements (Architecture).

### 4.12 Integration Dependencies

- CDN for media. Optional: CMS for content (Architecture OQ-3).

### 4.13 Analytics Events

- lesson_started, lesson_completed, lesson_abandoned, quiz_passed/failed, free_cap_reached.

### 4.14 Monetization

- Free with cap; cap_reached drives upsell.

### 4.15 Rollout

- Core; high priority. Content pipeline and caps configurable.

---

## 5. FD-03: Scenario Simulations (Text/Chat)

### 5.1 User Goal

Practice a real-life situation (e.g. restaurant, doctor) by chatting with AI in Dutch.

### 5.2 Business Goal

Differentiation; premium engagement (BFR-002: scenario simulations premium).

### 5.3 Triggers

- User selects a scenario from list or recommendation.

### 5.4 Primary Workflow

1. User selects scenario (e.g. "Ordering at a café"); system may suggest by profile.
2. AI sets context (short prompt in UI).
3. User types reply in Dutch (or speaks if FD-04); AI responds in character; may correct gently.
4. Conversation continues for N turns or until user ends.
5. Summary and feedback (FD-11); XP awarded.
6. Free tier: limit e.g. 1–2 scenarios per week (BFR-011); premium: unlimited within fair use.

### 5.5 Alternate Workflows

- Restart scenario; choose different scenario; exit without finishing (progress saved up to last turn).

### 5.6 Edge Cases

- AI timeout or error: show "Something went wrong"; allow retry. Moderation (IS-017): filter AI output before display.
- User sends empty or inappropriate input: validate or block; do not send to LLM if policy breach.

### 5.7 Permissions

- None for text-only. Microphone if voice reply (FD-04).

### 5.8 Business Rules

- BR-2 (level); IS-009 (real-life scenarios); IS-016 (indicate AI); IS-017 (moderation). Premium or trial for unlimited; free capped.

### 5.9 Functional Requirements

| ID | Requirement |
|----|-------------|
| FD03-FR-001 | System shall provide scenario list filtered by user level and profile (occupation, goals). |
| FD03-FR-002 | System shall run conversation with LLM; inject scenario context and user level into prompt. |
| FD03-FR-003 | System shall apply safety/moderation to AI output before display (IS-017). |
| FD03-FR-004 | System shall indicate to user that partner is AI (IS-016). |
| FD03-FR-005 | System shall enforce scenario usage limits for free users (BFR-011). |
| FD03-FR-006 | System shall persist conversation summary and link to feedback (FD-11). |

### 5.10 NFRs

- First AI response < 5s; streaming optional. Rate limit per user to control cost.

### 5.11 Data Dependencies

- Scenarios, conversation sessions, turns, entitlements. AI Conversation, Lesson Engine, Entitlements.

### 5.12 Integration Dependencies

- LLM API (Integrations doc). Moderation (internal or API).

### 5.13 Analytics Events

- scenario_started, scenario_turn_sent, scenario_completed, scenario_abandoned, scenario_cap_reached.

### 5.14 Monetization

- Premium; trial grants access. Key conversion driver.

### 5.15 Rollout

- High value; depends on LLM and moderation. Feature-flag and cost monitoring.

---

## 6. FD-04: AI Voice Tutor

### 6.1 User Goal

Have a spoken Dutch conversation with AI; get corrections and feedback.

### 6.2 Business Goal

Premium differentiation; retention; speech practice at scale.

### 6.3 Triggers

- User starts "Voice conversation" or voice-enabled scenario; microphone consent required.

### 6.4 Primary Workflow

1. User taps "Start voice conversation"; system checks microphone consent and entitlement.
2. If no consent: prompt for permission (once); if no entitlement: upsell.
3. User selects topic/level (A1–C1); optional: speed, replay.
4. TTS plays AI prompt; user speaks; STT converts to text; LLM generates response; TTS plays.
5. Loop until user ends. Optionally show transcript and corrections.
6. Session summary and pronunciation/fluency feedback (FD-06, FD-11); XP.

### 6.5 Alternate Workflows

- Replay last sentence; adjust speed; type instead of speak (fallback). End early.

### 6.6 Edge Cases

- Microphone denied: show message; offer text scenario. STT/TTS failure: retry or fallback to text. High latency: loading indicator; consider streaming TTS.

### 6.7 Permissions

- Microphone (required for voice). Consent (BFR-009).

### 6.8 Business Rules

- Premium or trial only (BFR-002). Fair-use cap for "unlimited" (Business doc). IS-016 (AI indicated). Level A1–C1 (IS-003).

### 6.9 Functional Requirements

| ID | Requirement |
|----|-------------|
| FD04-FR-001 | System shall support voice conversation flow: TTS → user speech → STT → LLM → TTS. |
| FD04-FR-002 | System shall allow configurable speaking speed and replay of last utterance. |
| FD04-FR-003 | System shall gate feature by entitlement (premium/trial) and microphone consent. |
| FD04-FR-004 | System shall persist session for feedback and analytics; optional recording for pronunciation (FD-06) per consent and retention. |
| FD04-FR-005 | System shall enforce fair-use limits on premium voice sessions (Operations/Feature config). |

### 6.10 NFRs

- Latency: TTS start < 2s after LLM response; STT result < 2s after speech end. Fallback when speech services unavailable.

### 6.11 Data Dependencies

- Sessions, turns, entitlements, consent. Speech Processing, AI Conversation, Entitlements.

### 6.12 Integration Dependencies

- STT, TTS, LLM (Integrations doc). Pronunciation service if feedback in-session (FD-06).

### 6.13 Analytics Events

- voice_session_started, voice_turn_completed, voice_session_ended, voice_fallback_used.

### 6.14 Monetization

- Premium only; core paid feature.

### 6.15 Rollout

- High complexity; depends on speech APIs and latency tuning. Phased by region or user segment if needed.

---

## 7. FD-05: Listening Training

### 7.1 User Goal

Improve listening comprehension with audio exercises (e.g. announcements, dialogues); answer questions.

### 7.2 Business Goal

Exam prep (IS-004); engagement; premium content.

### 7.3 Triggers

- User selects listening exercise or exam listening practice.

### 7.4 Primary Workflow

1. User selects exercise (level, topic, or exam type).
2. Audio plays (once or configurable repeats); user may not see transcript during attempt (IS-015).
3. User answers questions (multiple choice, short answer).
4. Submit; feedback and correct answers; optional transcript after (IS-015).
5. Progress and XP updated.

### 7.5 Alternate Workflows

- Replay audio (within attempt); skip to next question if allowed. Post-attempt transcript for accessibility.

### 7.6 Edge Cases

- Audio load failure: retry or show error. No transcript during attempt to preserve listening goal (IS-015).

### 7.7 Permissions

- None beyond auth. Optional: notifications.

### 7.8 Business Rules

- IS-004 (exam alignment), IS-014/IS-015 (audio alternatives vs. listening exercise). Premium for advanced/listening-heavy content; free may have limited set.

### 7.9 Functional Requirements

| ID | Requirement |
|----|-------------|
| FD05-FR-001 | System shall serve listening exercises with audio and questions; level and exam-tagged (IS-001, IS-004). |
| FD05-FR-002 | System shall not show transcript during attempt for listening-as-goal exercises; optional after (IS-015). |
| FD05-FR-003 | System shall record score and progress; link to exam prep if applicable. |
| FD05-FR-004 | System shall enforce entitlement for premium listening content (e.g. exam-style). |

### 7.10 NFRs

- Audio stream from CDN; start playback < 3s. Accessible controls (IS-011).

### 7.11 Data Dependencies

- Listening content, attempts, progress. Lesson Engine, CDN. Entitlements.

### 7.12 Integration Dependencies

- CDN for audio. Optional: TTS for generated listening (future).

### 7.13 Analytics Events

- listening_started, listening_completed, listening_abandoned.

### 7.14 Monetization

- Basic free; advanced/exam listening premium.

### 7.15 Rollout

- Medium; content pipeline and audio hosting.

---

## 8. FD-06: Pronunciation Analysis

### 8.1 User Goal

Get feedback on pronunciation (phoneme accuracy, stress, fluency) after speaking.

### 8.2 Business Goal

Premium value; learning efficacy; IS-025 (defined standard).

### 8.3 Triggers

- After voice turn or dedicated "Pronunciation practice" exercise.

### 8.4 Primary Workflow

1. User speaks (in voice tutor or pronunciation exercise).
2. Audio sent to pronunciation service; analysis returned (scores, phoneme-level feedback).
3. UI shows score and tips (e.g. "Focus on 'g' sound"); persist score (IS-025).
4. Optional: replay and compare.

### 8.5 Edge Cases

- Service unavailable: skip feedback; show "Feedback unavailable." Very short utterance: prompt to speak longer.

### 8.6 Permissions

- Microphone; consent.

### 8.7 Business Rules

- Premium (BFR-002). IS-025 (defined standard; Backend/Speech spec). Consent and retention for audio (BR-4).

### 8.8 Functional Requirements

| ID | Requirement |
|----|-------------|
| FD06-FR-001 | System shall call pronunciation service with user audio; receive and display feedback (score, tips). |
| FD06-FR-002 | System shall persist pronunciation scores and link to user/level (IS-025). |
| FD06-FR-003 | System shall gate by entitlement and microphone consent. |
| FD06-FR-004 | System shall handle service failure gracefully (no feedback; retry option). |

### 8.9 NFRs

- Feedback within 5s of speech end. Fallback when service down.

### 8.10 Data Dependencies

- Pronunciation results, sessions. Speech Processing. Retention per Data doc (BR-4).

### 8.11 Integration Dependencies

- Pronunciation API (e.g. Azure; Integrations doc).

### 8.12 Analytics Events

- pronunciation_completed, pronunciation_skipped_failure.

### 8.13 Monetization

- Premium only.

### 8.14 Rollout

- Depends on speech backend; can ship after voice tutor (FD-04).

---

## 9. FD-07: Daily Reflection

### 9.1 User Goal

Log daily activities (photo, location, notes); get a personalized lesson generated from them.

### 9.2 Business Goal

Habit; personalization; premium engagement.

### 9.3 Triggers

- User adds reflection (e.g. "Went to supermarket"); or end-of-day prompt.

### 9.4 Primary Workflow

1. User adds one or more entries: optional photo, location, short note.
2. At defined time or on demand, system generates lesson (vocabulary, phrases) from activities (LLM + context).
3. User sees "Your day" lesson; completes exercises; progress saved.
4. Consent for photo/location and AI context (BFR-009).

### 9.5 Edge Cases

- No entries: no lesson or generic tip. Moderation for user notes and generated content (IS-017, IS-018).

### 9.6 Permissions

- Photo library (optional); location (optional). Consent for each.

### 9.7 Business Rules

- BFR-009 (consent). BR-4 (retention). Premium feature. IS-018 (user content moderation).

### 9.8 Functional Requirements

| ID | Requirement |
|----|-------------|
| FD07-FR-001 | System shall persist reflection entries (note, optional photo, location) with consent. |
| FD07-FR-002 | System shall generate lesson content from entries using LLM and user context (level, profile). |
| FD07-FR-003 | System shall apply moderation to user input and generated content (IS-017, IS-018). |
| FD07-FR-004 | System shall present "daily lesson" and record completion; entitlement gate. |

### 9.9 NFRs

- Generation async acceptable (e.g. within minutes). Retention of reflection data per Data doc.

### 9.10 Data Dependencies

- Reflections, generated lessons, consent. Profile, Lesson Engine, AI Conversation.

### 9.11 Integration Dependencies

- LLM. Storage for media (Object storage/CDN). Moderation.

### 9.12 Analytics Events

- reflection_added, daily_lesson_generated, daily_lesson_completed.

### 9.13 Monetization

- Premium.

### 9.14 Rollout

- Medium; depends on LLM and moderation; optional photo/location increases complexity.

---

## 10. FD-08: Location-Aware Prompts

### 10.1 User Goal

When near a relevant venue (café, supermarket), receive a suggested Dutch phrase.

### 10.2 Business Goal

Differentiation; optional engagement. BR-3: user can disable; consent required.

### 10.3 Triggers

- User has location and feature enabled; app detects proximity to venue type (geofence or similar).

### 10.4 Primary Workflow

1. User enables "Location tips" in settings; grants location consent.
2. When near venue (e.g. café), app shows notification or in-app card: "Try: Mag ik een cappuccino alstublieft?"
3. User may dismiss or tap to practice (optional flow).
4. Location not persisted long-term; used only for trigger (BR-4, retention).

### 10.5 Edge Cases

- Location denied: feature off. Background limits (mobile web): may only trigger when app open or on next open. Battery/privacy: explain clearly; allow disable anytime.

### 10.6 Permissions

- Location (optional). Consent (BFR-009). BR-3 (user can disable).

### 10.7 Business Rules

- BR-3 (consent; optional; disable anytime). Short retention for location (Data doc). Premium or free with limits TBD.

### 10.8 Functional Requirements

| ID | Requirement |
|----|-------------|
| FD08-FR-001 | System shall trigger location-based phrase suggestion when user is near configured venue type and consent is granted. |
| FD08-FR-002 | System shall allow user to enable/disable feature and withdraw location consent (BR-3). |
| FD08-FR-003 | System shall not persist precise location long-term; use only for trigger (retention policy). |

### 10.9 NFRs

- Location used in client or minimal server call; battery and privacy considered. May be "on next open" in mobile web if no background.

### 10.10 Data Dependencies

- Venue/geofence config; consent. Minimal location persistence.

### 10.11 Integration Dependencies

- None beyond client geolocation API. Optional: places API for venue types.

### 10.12 Analytics Events

- location_prompt_shown, location_prompt_dismissed, location_feature_enabled/disabled.

### 10.13 Monetization

- Optional premium or engagement feature.

### 10.14 Rollout

- Medium; mobile web may have limitations (background location); consider "when you open app near X" first.

---

## 11. FD-09: Exam Preparation

### 11.1 User Goal

Prepare for A2/B1 integration exam and KNM (and optionally ONA) with aligned practice.

### 11.2 Business Goal

Conversion and retention (BFR-012); IS-004, IS-005, IS-006.

### 11.3 Triggers

- User selects "Exam prep" or goal = integration exam; chooses exam type (A2, B1, KNM).

### 11.4 Primary Workflow

1. User selects exam (e.g. A2 reading, B1 listening, KNM).
2. System serves practice aligned to format (IS-005): reading passages + questions, listening + questions, speaking prompts, writing tasks, KNM topics.
3. User completes; feedback and score; progress tracked.
4. Optional: simulated full exam (timed); results summary.
5. Premium only for full exam prep modules.

### 11.5 Edge Cases

- Content not yet available for a component: show "Coming soon" or redirect to available. Exam format change: IS-006 (track and adapt).

### 11.6 Business Rules

- IS-004 (map to components/level), IS-005 (format), IS-006 (track changes). Premium for full suite.

### 11.7 Functional Requirements

| ID | Requirement |
|----|-------------|
| FD09-FR-001 | System shall provide exam-prep content mapped to reading, listening, speaking, writing, KNM (and ONA if in scope) and level A2/B1 (IS-004). |
| FD09-FR-002 | System shall use practice formats that reflect official exam where documented (IS-005). |
| FD09-FR-003 | System shall track progress per exam component and level; support simulated exam flow. |
| FD09-FR-004 | System shall gate full exam prep by entitlement (premium). |

### 11.8 Data Dependencies

- Exam content, attempts, progress. Lesson Engine. Entitlements.

### 11.9 Integration Dependencies

- Content pipeline. Optional: link to official exam info (URL).

### 11.10 Analytics Events

- exam_prep_started, exam_component_completed, simulated_exam_completed.

### 11.11 Monetization

- Premium; strong conversion driver for exam-focused users.

### 11.12 Rollout

- Content-heavy; depends on curriculum and IS-006 process.

---

## 12. FD-10: Gamification

### 12.1 User Goal

See progress (XP, streak, achievements); stay motivated.

### 12.2 Business Goal

Retention (OBJ-4); engagement.

### 12.3 Triggers

- Lesson/scenario/session completion; daily login; achievement rules.

### 12.4 Primary Workflow

1. On lesson or activity completion, Lesson Engine (or relevant service) reports to Gamification.
2. XP awarded; streak updated (consecutive days); achievements checked (e.g. "First scenario," "7-day streak").
3. User sees XP, streak, and achievements on home and post-activity.
4. Optional: leaderboard (anonymous or friends); daily challenge (BR-7: streak freeze, XP caps).

### 12.5 Business Rules

- BR-7 (defined rules for streak, XP, achievements). No pay-to-win; XP only from activity.

### 12.6 Functional Requirements

| ID | Requirement |
|----|-------------|
| FD10-FR-001 | System shall award XP and update streak on activity completion (lesson, scenario, voice, etc.). |
| FD10-FR-002 | System shall evaluate and grant achievements per defined rules; persist and display. |
| FD10-FR-003 | System shall support configurable streak rules (e.g. streak freeze, BR-7). |
| FD10-FR-004 | System shall expose XP, streak, and achievements to client (home, profile). |

### 12.7 Data Dependencies

- Gamification service; user progress, events. PostgreSQL, Redis (cache).

### 12.8 Analytics Events

- xp_awarded, streak_updated, achievement_unlocked.

### 12.9 Monetization

- Indirect; supports retention and conversion.

### 12.10 Rollout

- Core; integrate with all activity-completion flows.

---

## 13. FD-11: AI Tutor Feedback

### 13.1 User Goal

Receive clear feedback after lessons/conversations: grammar, vocabulary, pronunciation, fluency, listening.

### 13.2 Business Goal

Learning efficacy; trust (IS-016); differentiation.

### 13.3 Triggers

- End of scenario (FD-03), voice session (FD-04), or lesson (FD-02).

### 13.4 Primary Workflow

1. After activity, backend aggregates data (turns, errors, pronunciation score).
2. AI or rule-based feedback generated: strengths, areas to improve, next steps.
3. User sees feedback screen (scores, tips); optional "Practice this" CTA.
4. Feedback persisted for history and progress.

### 13.5 Business Rules

- IS-016 (AI feedback indicated). IS-017 if feedback is AI-generated. Categories: grammar, vocabulary, pronunciation, fluency, listening (Business doc).

### 13.6 Functional Requirements

| ID | Requirement |
|----|-------------|
| FD11-FR-001 | System shall generate and display post-activity feedback (grammar, vocabulary, pronunciation, fluency, listening as applicable). |
| FD11-FR-002 | System shall indicate when feedback is AI-generated (IS-016). |
| FD11-FR-003 | System shall persist feedback and link to session/lesson for history. |
| FD11-FR-004 | System shall apply moderation to AI-generated feedback text (IS-017). |

### 13.7 Data Dependencies

- Sessions, turns, pronunciation results. AI Conversation, Lesson Engine, Speech. Feedback records.

### 13.8 Analytics Events

- feedback_viewed, feedback_practice_clicked.

### 13.9 Monetization

- Free and premium; premium gets richer feedback (e.g. pronunciation detail).

### 13.10 Rollout

- With FD-02, FD-03, FD-04; incremental by feedback type.

---

## 14. FD-12: Entitlements & Subscription

### 14.1 User Goal

Understand free vs. premium; start trial; subscribe; manage subscription.

### 14.2 Business Goal

Revenue (BFR-001–BFR-004, BFR-013); enforce gating (BFR-002).

### 14.3 Triggers

- App launch (check entitlement); attempt to access premium feature (gate); user taps "Upgrade" or "Manage subscription."

### 14.4 Primary Workflow

1. On launch or feature access, client asks API for entitlement (or cached with TTL).
2. Entitlements service checks: subscription status, trial status, free-tier usage (lessons, scenarios).
3. If premium or trial: allow. If free and under cap: allow. If free and cap reached: block and show upsell.
4. User can start trial (BFR-004); at trial end, convert or revert. Payment via payment provider; webhooks update subscription state.
5. User can cancel/manage in app or via provider link.

### 14.5 Edge Cases

- Webhook delay: eventual consistency; show "Updating…" if needed. Payment failed: retry; notify user. Trial expired: revert at next check.

### 14.6 Business Rules

- BFR-001 (freemium), BFR-002 (gate), BFR-003 (subscription), BFR-004 (trial), BFR-011 (free caps), BFR-013 (conversion analytics).

### 14.7 Functional Requirements

| ID | Requirement |
|----|-------------|
| FD12-FR-001 | System shall expose current entitlement (free, trial, premium) and usage (e.g. lessons used today) to client. |
| FD12-FR-002 | System shall gate premium features by entitlement; allow trial same as premium during trial period. |
| FD12-FR-003 | System shall enforce free-tier limits (lessons/day, scenarios/week) and return clear state for upsell. |
| FD12-FR-004 | System shall support trial start and end; sync with payment provider via webhooks. |
| FD12-FR-005 | System shall record conversion funnel events: trial_started, trial_ended, payment_success, churn (BFR-013). |

### 14.8 NFRs

- Entitlement check < 500ms (cache). Webhook idempotency and retry.

### 14.9 Data Dependencies

- Subscriptions, trials, usage counts. Entitlements service. Payment provider.

### 14.10 Integration Dependencies

- Payment provider (Stripe or equivalent); webhooks (Integrations doc).

### 14.11 Analytics Events

- trial_started, trial_ended, payment_started, payment_success, payment_failed, subscription_cancelled, entitlement_check (for funnel).

### 14.12 Monetization

- Core revenue; all conversion flows.

### 14.13 Rollout

- Critical path; feature flags for trial duration and pricing.

---

## 15. Cross-Cutting: Free-Tier Caps (Summary)

| Domain | Free limit (example) | Premium |
|--------|----------------------|---------|
| FD-02 Core Lessons | 3–5 lessons/day | Unlimited |
| FD-03 Scenarios | 1–2/week | Unlimited (fair use) |
| FD-04 Voice | — | Premium only |
| FD-05 Listening | Basic set | Advanced + exam |
| FD-06 Pronunciation | — | Premium only |
| FD-07 Daily Reflection | — | Premium only |
| FD-08 Location | Optional | Optional |
| FD-09 Exam Prep | Limited | Full |
| FD-10 Gamification | Full | Full |
| FD-11 Feedback | Basic | Richer |
| FD-12 | — | Trial + subscription |

Exact numbers are product/config decisions (OQ-5 in Business doc).

---

## 16. Assumptions and Open Questions

- **Assumptions**: Caps and fair-use limits are configurable. Moderation is automated with escalation. All features respect consent and retention.
- **Open questions**: Exact free caps (FD-02, FD-03); location on mobile web (FD-08); ONA depth (FD-09). See Business and Industry docs.

---

## 17. Traceability

- BFRs: referenced in FD-01 (BFR-005, BFR-009), FD-02 (BFR-011), FD-03/04/06/07/09 (BFR-002), FD-12 (BFR-001–004, BFR-011, BFR-013).
- IS-*: referenced per domain (e.g. IS-001, IS-007, IS-008 in FD-02; IS-016, IS-017 in FD-03, FD-11).
- Architecture: Profile, Lesson Engine, AI Conversation, Speech, Gamification, Notifications, Entitlements referenced per domain.
