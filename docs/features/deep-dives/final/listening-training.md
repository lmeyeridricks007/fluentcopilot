# Listening Training — Deep-Dive Specification

## 1. Purpose

Listening Training provides audio-based exercises: learners listen to Dutch audio (e.g. announcements, dialogues) and answer questions. Transcript is not shown during the attempt to preserve the listening goal (IS-015); optional transcript after completion for accessibility. This spec covers FD-05: content, attempt flow, scoring, and entitlement for advanced/exam-style listening.

## 2. Core Concept

- **Listening exercise**: Audio + set of questions (multiple choice, short answer); level and exam-tagged (IS-001, IS-004); no transcript during attempt (IS-015).
- **Attempt**: Play audio (once or configurable repeats); answer questions; submit; feedback and correct answers; optional transcript after (IS-015).
- **Entitlement**: Basic listening free; advanced or exam-style listening premium (FD05-FR-004).

## 3. Why This Feature Exists

- **Exam prep**: Listening is a component of integration exams (IS-004); practice format aligns with exam.
- **Engagement**: Different modality from text-based lessons; premium content differentiator.

## 4. User / Business Problems Solved

- Learners improve listening comprehension with structured exercises.
- Business offers basic set free; advanced/exam listening as premium.

## 5. Scope

### 6. In Scope

- List listening exercises by level, topic, exam type (FD05-FR-001).
- Run attempt: load audio (from CDN); play (once or repeat); questions; submit; score and feedback; optional transcript after attempt (FD05-FR-002).
- Progress and score recorded; link to exam prep if applicable (FD05-FR-003).
- Entitlement gate for premium listening content (FD05-FR-004).
- Replay audio within attempt; skip to next question if allowed.

### 7. Out of Scope

- Content authoring and audio production (Content doc); this spec consumes listening content.
- Pronunciation (FD-06) or voice conversation (FD-04); listening is comprehension-only here.
- Full exam simulation (FD-09); listening exercises are building blocks.

## 8. Main User Personas

- **General learner**: Uses basic listening for comprehension.
- **Exam candidate**: Uses exam-style listening for A2/B1/KNM prep.
- **Accessibility**: May need transcript after attempt (IS-015).

## 9. Main User Journeys

| Journey | Steps |
|--------|--------|
| **Complete listening** | Home or Exam/Listening → Select exercise → Audio plays → Answer questions → Submit → Feedback + optional transcript → Progress + XP. |
| **Replay** | During attempt: replay audio (within rules); answer questions. |
| **Premium content** | User selects advanced/exam listening → Entitlement check → Allow or upsell. |

## 10. Triggering Events / Inputs

- **List**: GET /listening/exercises (level, topic, exam_tag); filter by entitlement for premium.
- **Start**: GET /listening/exercises/:id (content + audio URL); entitlement for premium item.
- **Submit**: POST /listening/attempts { exercise_id, answers }; score and persist; return feedback and optional transcript.
- **Replay**: Client-side; no extra API except possibly track replay count (analytics).

## 11. States / Lifecycle

- **Not started**: Exercise available in list.
- **In progress**: Attempt started; answers in progress; can submit or abandon.
- **Completed**: Submitted; score and feedback stored; progress and XP updated.
- **Abandoned**: Left without submit; optional save partial (product decision).

## 12. Business Rules

- **IS-004**: Exam alignment; listening exercises tagged for exam component and level.
- **IS-014/IS-015**: Audio alternatives for accessibility; no transcript *during* attempt for listening-as-goal; transcript *after* attempt allowed (IS-015).
- **Entitlement**: Premium for advanced/exam-style listening; free for basic set (FD05-FR-004).
- **Scoring**: Correct/incorrect per question; overall score; store for progress and exam prep dashboard.

## 13. Configuration Model

- **Exercise metadata**: Level, topic, exam_tag, audio_url, question set, replay_policy (once / N times).
- **Transcript**: Stored with exercise; shown only after attempt (or never if not provided).
- **Entitlement**: Which exercise IDs or tags require premium; config or DB flag.

## 14. Data Model

- **listening_exercises**: id, locale, external_id, cefr_level_id, topic_tags[], exam_tags[], audio_url, transcript (text, for after attempt), questions (JSONB: type, text, options, correct_answer), replay_allowed (boolean or count), is_premium (boolean), version, created_at, updated_at.
- **listening_attempts**: id, user_id, exercise_id, started_at, submitted_at, score, answers (JSONB), created_at.
- **Progress**: Aggregate from attempts (e.g. exercises completed per level); can derive from attempts or separate progress table.

## 15. Read Model / Projection Needs

- **Exercise list**: Filtered by level, topic, exam; exclude premium if not entitled or show locked.
- **Progress**: For dashboard and exam prep; “Listening: X exercises completed at A2.”

## 16. APIs / Contracts

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| GET | `/v1/listening/exercises` | List exercises | Query: level, topic, exam_tag, limit | 200 { exercises[] }; premium items marked; 403 for locked if requested by id |
| GET | `/v1/listening/exercises/:id` | Get exercise (audio URL, questions; no transcript) | — | 200 { exercise }; 403 if premium and not entitled |
| POST | `/v1/listening/attempts` | Submit attempt | { exercise_id, answers[] } | 200 { score, feedback, correct_answers, transcript? }; 400 invalid |
| GET | `/v1/listening/attempts` | User attempt history (optional) | Query: user (auth), limit | 200 { attempts[] } |

## 17. Events / Async Flows

- **listening_started**: exercise_id, user_id (analytics).
- **listening_completed**: exercise_id, user_id, score; triggers Gamification (XP) and progress; optional link to exam prep (FD-09).
- **listening_abandoned**: exercise_id (analytics).
- No async dependency for scoring; synchronous submit and response.

## 18. UI / UX Design

- **List**: Cards with title, level, topic, duration; lock icon for premium if not entitled.
- **Exercise run**: Audio player (play, pause, replay if allowed); questions below or after; submit button; no transcript until after submit.
- **Post-submit**: Score; correct answers; “Show transcript” button (IS-015); XP and progress.
- **Accessibility**: Keyboard and screen reader support; accessible audio controls (IS-011).

## 19. Main Screens / Components

- **ListeningListScreen**: Exercise list; filters; premium/locked indicator.
- **ListeningExerciseScreen**: Player; questions; submit; loading and error states.
- **ListeningResultScreen**: Score; feedback; transcript toggle; next or home.

## 20. Permissions / Security Rules

- **Authenticated**: All endpoints require auth; user only sees own attempts.
- **Entitlement**: Premium exercises return 403 or locked state if user not entitled.
- **Transcript**: Only returned after attempt submitted; never in GET exercise content before submit.

## 21. Notifications / Alerts / Side Effects

- **Gamification**: XP on completion.
- **Progress**: Update learning progress and exam prep stats (FD-09) if exam_tag present.
- **Personalization**: Completion event can feed skill profile (listening).

## 22. Integrations / Dependencies

- **Content**: Listening exercises and audio from catalog; audio URLs from CDN (Data doc).
- **Entitlements**: Check for premium exercise access.
- **Gamification**: XP on listening_completed.
- **FD-09 (Exam prep)**: Listening attempts with exam_tag feed exam progress view.
- **Personalization**: Listening completion as activity event for skill profile.

## 23. Edge Cases / Failure Cases

- **Audio load failure**: Retry; show “Couldn’t load audio. Try again.” or skip and show questions with “Audio unavailable.”
- **Submit without answers**: Validate; allow partial submit and score what’s present, or require all (product rule).
- **Premium exercise**: User bookmarks then loses premium; next GET returns 403 or locked; show upsell.
- **Replay policy**: If replay not allowed, disable replay button; if N times, count and disable after N.

## 24. Non-Functional Requirements

- **Latency**: Audio stream from CDN; start playback < 3s (FD-05). Accessible controls (IS-011).
- **Availability**: CDN for audio; exercise metadata from API/DB.

## 25. Analytics / Auditability Requirements

- **Events**: listening_started, listening_completed, listening_abandoned. Include exercise_id, user_id, score, duration.
- **Progress**: Stored for history and exam prep reporting.

## 26. Testing Requirements

- Unit: Scoring logic; entitlement check for premium.
- Integration: GET list and exercise; POST attempt; score and feedback; 403 for premium when free.
- E2E: Select exercise; play audio (mock); answer and submit; see transcript after.

## 27. Recommended Architecture

- **Lesson Engine or dedicated Listening module**: Serves listening exercises and attempts; checks Entitlements for premium; records attempts; triggers Gamification and optional exam prep progress.
- **Audio**: Stored in object storage; CDN URLs in exercise record; no transcript in response until after submit.

## 28. Recommended Technical Design

- **Questions**: Stored as JSONB (array of { type, text, options, correct_answer }); server scores on submit; return feedback and transcript in same response.
- **Idempotency**: One submitted attempt per (user_id, exercise_id) per “attempt” (allow retries as new attempts if product allows).

## 29. Suggested Implementation Phasing

- **Phase 1**: Basic exercise list and run; audio + questions; submit and score; no transcript; free set only.
- **Phase 2**: Transcript after attempt; premium exercises and entitlement; Gamification and progress.
- **Phase 3**: Exam tags and link to exam prep (FD-09); replay policy; analytics.

## 30. Summary

Listening Training delivers audio exercises with questions and no transcript during the attempt (IS-015); transcript optional after. Exercises are level- and exam-tagged; progress and score are stored; premium advanced/exam listening is gated. Implementation must enforce no-transcript-during-attempt, entitlement for premium content, and accessible audio controls.
