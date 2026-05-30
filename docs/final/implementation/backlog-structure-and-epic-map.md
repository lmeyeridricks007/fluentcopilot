# Backlog Structure and Epic Map

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

This document defines **backlog structure**, **epic/feature/story** breakdown strategy, and **prioritization** so that work can be organized in a project board (Jira, Linear, GitHub Projects, etc.) and delivered in the right order.

---

## 2. Scope

- **In scope**: Epic and feature list per phase; story breakdown guidance; prioritization rules; dependency tags.
- **Out of scope**: Individual story text; story points (use relative complexity L/M/H if needed).

---

## 3. Hierarchy

| Level | Definition | Example |
|-------|------------|---------|
| **Epic** | Large deliverable spanning multiple features; often maps to a phase or a major capability | "Phase A: Foundation", "Core learner experience", "AI and speech experience" |
| **Feature** | User-facing or system capability; shippable increment | "Onboarding flow", "Lesson run (guided + quiz)", "Voice tutor" |
| **Story / Task** | Single unit of work; one owner; testable | "Implement POST /v1/auth/signup", "Onboarding step 2: level and goals UI" |
| **Sub-task** | Optional; for large stories | "Add validation", "Add error state" |

---

## 4. Epic Map by Phase

| Epic | Phase | Features (summary) | Priority |
|------|-------|-------------------|----------|
| **E-A: Foundation** | A | Repo & env; Auth; CI/CD; Data model; Design system; Observability; Feature flags | Must-have |
| **E-B: Core learner experience** | B | Onboarding; Profile; Lesson engine; Lesson UI; Progress; Gamification; Home & recommendations | Must-have |
| **E-C: AI and speech** | C | LLM & scenario; Scenario UI; Speech (STT/TTS/pronunciation); Voice UI; Listening UI; Moderation & fallbacks | Must-have |
| **E-D: Premium and growth** | D | Stripe & entitlements; Gating & upsell; Notifications; Analytics funnel; Hardening; GDPR; Launch content | Must-have |
| **E-E: Expansion** | E | Daily reflection; Location; Exam prep; Content ops; Multi-language readiness; Cost/performance | Should-have / Later |

---

## 5. Feature List (Phase A)

| Feature ID | Feature | Stream | Depends on | Complexity |
|------------|---------|--------|------------|------------|
| F-A1 | Repo structure and env setup | DevOps | — | L |
| F-A2 | Auth API (signup, login, session) | Backend | F-A1 | M |
| F-A3 | Auth UI (login, signup, logout) | Frontend | F-A2 (contract) | M |
| F-A4 | Data model: users, profiles, consent | Data | F-A1 | L |
| F-A5 | CI/CD and staging deploy | DevOps | F-A1, F-A2 | M |
| F-A6 | Design system base (tokens, components) | Frontend | F-A1 | M |
| F-A7 | App shell and routing | Frontend | F-A6 | M |
| F-A8 | Observability baseline (logging, Sentry) | Backend, Frontend, DevOps | F-A1 | L |
| F-A9 | Feature flags integration | Integrations, Frontend, Backend | F-A1 | L |
| F-A10 | Secrets and .env.example | DevOps, Backend | F-A1 | L |

---

## 6. Feature List (Phase B)

| Feature ID | Feature | Stream | Depends on | Complexity |
|------------|---------|--------|------------|------------|
| F-B1 | Profile and onboarding API | Backend | F-A2, F-A4 | M |
| F-B2 | Onboarding UI (multi-step) | Frontend | F-B1 | M |
| F-B3 | Lesson schema and seed data | Data | F-A4 | M |
| F-B4 | Lesson engine API | Backend | F-B3 | M |
| F-B5 | Lesson UI (list, run, flashcards, quiz) | Frontend | F-B4 | H |
| F-B6 | Progress API | Backend | F-B4, F-A4 | M |
| F-B7 | Gamification (XP, streak) | Backend | F-B6 | M |
| F-B8 | Home and recommendations | Frontend, Backend | F-B6, F-B4 | M |
| F-B9 | Consent in onboarding and settings | Frontend, Backend | F-B1, F-A4 | L |

---

## 7. Feature List (Phase C)

| Feature ID | Feature | Stream | Depends on | Complexity |
|------------|---------|--------|------------|------------|
| F-C1 | LLM adapter and moderation | Integrations, Backend | F-B4 | H |
| F-C2 | Scenario API (list, start, turn, end) | Backend | F-C1 | H |
| F-C3 | Scenario UI (chat) | Frontend | F-C2 | M |
| F-C4 | Speech adapter (STT, TTS, pronunciation) | Integrations, Backend | F-B4 | H |
| F-C5 | Voice session API | Backend | F-C4 | M |
| F-C6 | Voice UI (mic, playback, transcript) | Frontend | F-C5 | H |
| F-C7 | Listening API and UI | Backend, Frontend | F-C4 | M |
| F-C8 | Pronunciation feedback UI | Frontend | F-C5 | M |
| F-C9 | Fallbacks and error handling | Backend, Frontend | F-C2, F-C5 | M |

---

## 8. Feature List (Phase D)

| Feature ID | Feature | Stream | Depends on | Complexity |
|------------|---------|--------|------------|------------|
| F-D1 | Stripe integration (products, Checkout, webhook) | Integrations, Backend | F-C2 | H |
| F-D2 | Entitlement service and usage tracking | Backend | F-D1 | H |
| F-D3 | Entitlement gating (backend) | Backend | F-D2 | M |
| F-D4 | Upsell and paywall UI | Frontend | F-D3 | M |
| F-D5 | Email (verification, receipts, reminders) | Integrations, Backend | F-A2 | M |
| F-D6 | Optional Web Push | Integrations, Backend, Frontend | F-D2 | M |
| F-D7 | Analytics funnel events | Integrations, Frontend, Backend | F-D2 | L |
| F-D8 | Production env and hardening | DevOps | F-D1 | M |
| F-D9 | Monitoring and alerting | DevOps | F-D8 | M |
| F-D10 | GDPR export and delete | Backend, Data | F-A4 | M |
| F-D11 | Launch content and moderation ops | Content | F-B3, F-C1 | M |

---

## 9. Story Breakdown Guidance

- **One story = one deliverable** that can be demoed or tested (e.g. "User can sign up" or "Lesson API returns list by level").
- **Acceptance criteria** on each story: reference Phase exit criteria or stream-specific done criteria.
- **Dependency tag**: Label stories that block others (e.g. "blocks: F-B5") so that ordering is clear.
- **Complexity**: Use L/M/H for capacity planning; H = may need to split or pair.
- **Definition of done**: Code merged; tests pass; reviewed; no P0 bugs; meets acceptance criteria.

---

## 10. Prioritization Rules

1. **Phase order**: All Phase A before any Phase B; all B before C; etc.
2. **Within phase**: Follow dependency map (e.g. Auth before onboarding; Lesson API before Lesson UI).
3. **Stretch**: If time-box is hit, defer "nice-to-have" features to next phase (e.g. OAuth to B; advanced gamification to D).
4. **Bugs and tech debt**: Prioritize P0/P1 before new features; allocate a portion of capacity to debt if needed.

---

## 11. Backlog Maintenance

- **Refinement**: Before each phase, refine features into stories; estimate or size; order by dependency.
- **Phase kick-off**: Confirm epic and feature list for the phase; add to board; assign owners.
- **Gate**: When phase gate is met, close epic and archive or move to "Done"; open next phase epic.
- **Open decisions**: Link stories to open-decisions-log where a decision blocks the story (e.g. "Trial length: 7 vs 14 days" blocks F-D1 configuration).
