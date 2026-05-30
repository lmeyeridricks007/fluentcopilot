# Frontend Implementation Plan

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

This document provides an **execution-ready frontend implementation plan** for the AI Language Coach: React + Vite setup, app shell and routing, state architecture, design system, screen-by-screen order, onboarding, lesson UI, AI simulation and voice/audio UI, permissions flows, PWA/mobile web, accessibility, localization readiness, analytics instrumentation, frontend test plan, performance, browser/device support, feature flags, and premium gating UI.

---

## 2. Scope

- **In scope**: All client-side UI work from Phase A through E; order of implementation; dependencies on backend and design; acceptance and done criteria per area.
- **Out of scope**: Backend API implementation; visual design assets (only tokens and component specs); native app (readiness only).

---

## 3. Assumptions

- Backend API contracts (or OpenAPI) are agreed before or in parallel with UI implementation.
- Design tokens and base components are defined in Phase A; full design system can evolve in B.
- Mobile web first: primary viewport 375px–428px; tablet and desktop are responsive.
- No native app in Phase A–D; React Native readiness is structural (e.g. API client, state) not implementation.

---

## 4. React + Vite Setup Strategy

| Step | Work item | Done criteria |
|------|-----------|----------------|
| 1 | Create Vite + React + TypeScript project; configure path aliases (@/components, etc.) | Build succeeds; TS strict |
| 2 | Add Tailwind; configure content paths; add design token file (CSS variables or Tailwind theme) | Tailwind classes work; tokens in one place |
| 3 | Add React Router v6; define route tree (auth vs app routes) | Navigation between placeholder screens works |
| 4 | Add env handling (VITE_*); ensure no backend secrets in frontend | Env example documented; build uses env |
| 5 | Add error boundary at app root; optional Sentry init | Uncaught errors caught; optional report |
| 6 | Add feature flags SDK (e.g. LaunchDarkly, PostHog); one flag evaluable | Flag value available in context or hook |
| 7 | Add API client (fetch or axios) with base URL, auth header, and request/response interceptors | Authenticated requests work; 401 triggers logout redirect |

---

## 5. App Shell and Routing

| Route group | Routes | Phase | Implementation order |
|-------------|--------|-------|------------------------|
| **Public** | `/`, `/login`, `/signup` | A | After auth API; first screens |
| **Auth redirect** | `/` → login or home by auth state | A | With auth |
| **Onboarding** | `/onboarding` (multi-step) | B | With profile API |
| **App** | `/home`, `/learn`, `/learn/:id`, `/practice`, `/practice/scenario/:id`, `/practice/voice`, `/practice/listening/:id`, `/exam`, `/exam/:component/:id?`, `/profile`, `/settings`, `/reflection` | B–E | Per phase below |
| **404** | `*` | A | With shell |

**Layout:** One `AppLayout` for authenticated routes: header (optional), main content, bottom nav (Home, Learn, Practice, Exam, Profile). Nested `<Outlet />` for child routes. Lazy-load route chunks where beneficial (e.g. `/practice/*`, `/exam/*`).

---

## 6. State Architecture

| Concern | Approach | Phase |
|---------|----------|-------|
| **Auth** | Context or store (user, session); persist token/session id (cookie or secure storage); clear on logout | A |
| **Server state** | React Query (TanStack Query) or SWR for API data; cache keys by resource (e.g. lessons, profile, progress) | A |
| **UI state** | Local state (useState) or small context (e.g. onboarding step, modal open) | B |
| **Feature flags** | Provider from SDK; hook `useFeatureFlag(key)` | A |
| **Entitlement** | Fetched with profile or dedicated endpoint; context or hook `useEntitlement()` for gating | D |
| **Form state** | Controlled components or React Hook Form for onboarding, settings, reflection | B |

No global Redux unless complex shared state emerges; prefer server state + local/context.

---

## 7. Design System Setup

| Item | Phase A | Phase B | Notes |
|------|---------|---------|--------|
| **Tokens** | Colors, typography (font family, sizes, weights), spacing scale, radii, shadows | Add motion tokens if needed | Single source (CSS vars or Tailwind theme) |
| **Base components** | Button, Input, Card, Layout (container, stack), Link, Spinner | Label, Checkbox, Radio, Select, Modal, BottomSheet | Used across all screens |
| **Typography** | Heading levels (h1–h4), body, caption | — | Semantic and a11y |
| **Icons** | Icon set (SVG sprite or component library) | — | Consistent size and color |
| **Lesson/chat components** | — | LessonCard, MessageBubble, OptionList, ProgressBar | Phase B |
| **Voice/audio components** | — | — | Phase C: Waveform, PlayButton, MicButton, TranscriptLine |
| **Accessibility** | Focus visible; contrast (WCAG AA); touch targets ≥44px | Audit key flows | Phase A baseline |

Storybook optional but recommended for base components by end of Phase A.

---

## 8. Screen-by-Screen Implementation Order

### Phase A

| Order | Screen | Dependencies | Done criteria |
|-------|--------|--------------|----------------|
| 1 | Login | Auth API (POST login) | Submit → session; redirect to home or onboarding |
| 2 | Sign up | Auth API (POST signup) | Submit → account; redirect to onboarding or login |
| 3 | App shell + placeholder Home | Auth check; routing | Authenticated user sees shell and Home placeholder |
| 4 | Logout | Auth API (POST logout or clear token) | Clears session; redirect to login |

### Phase B

| Order | Screen | Dependencies | Done criteria |
|-------|--------|--------------|----------------|
| 5 | Onboarding (multi-step) | Profile/onboarding API | Steps: profile, level, goals, consent; submit each; redirect to home |
| 6 | Home | Recommendations API; progress/gamification | Streak, XP, next lesson, quick actions (Learn, Practice) |
| 7 | Learn (lesson list) | Lessons API | List/filter by level/topic; tap → lesson run |
| 8 | Lesson run (guided) | Lesson API (GET lesson, POST progress) | Steps/cards; next/back; submit; result and XP |
| 9 | Flashcards (in lesson or standalone) | Lesson API | Flip; next/back; track correct/incorrect |
| 10 | Quiz (in lesson) | Lesson API | Questions; submit; score and feedback |
| 11 | Profile | Profile API; gamification | Display profile; edit link to settings; streak/XP |
| 12 | Settings | Profile, consent API | Edit profile; consent toggles; help link |
| 13 | Practice hub | — | Entry to Scenario, Voice, Listening (Phase C) |
| 14 | Exam hub (Phase B minimal) | — | Entry to exam prep (Phase E extended) |

### Phase C

| Order | Screen | Dependencies | Done criteria |
|-------|--------|--------------|----------------|
| 15 | Scenario list | Scenarios API | List scenarios; tap → scenario run |
| 16 | Scenario run (chat) | Conversation API (start, turn, end) | Messages; input; send; AI reply; end session |
| 17 | Voice tutor | Voice API (start, turn, end); mic permission | Mic on/off; send audio; play TTS; transcript; end |
| 18 | Listening exercise | Listening API; audio playback | Play audio; questions; submit; feedback |
| 19 | Pronunciation feedback | Voice/pronunciation API | Score and tips; optional replay |
| 20 | Permission gates (mic, location) | Browser APIs; consent | Prompt for permission; fallback message if denied |
| 21 | Fallback UI (e.g. "Voice unavailable; use text") | Feature flag or error from API | Shown when speech/LLM fails; link to scenario |

### Phase D

| Order | Screen | Dependencies | Done criteria |
|-------|--------|--------------|----------------|
| 22 | Entitlement gate | Entitlements API | When free user taps premium feature: modal with upsell CTA |
| 23 | Upsell / paywall | Stripe Checkout link or embed | Copy and CTA; redirect to Stripe; return URL handling |
| 24 | Settings: subscription | Entitlements; Stripe customer portal link | Show plan; manage subscription link |
| 25 | Notification preferences | Notifications API | Toggle email/push; save |
| 26 | Post-payment / post-trial | Return URL from Stripe | Thank you or "trial started"; refresh entitlement |

### Phase E

| Order | Screen | Dependencies | Done criteria |
|-------|--------|--------------|----------------|
| 27 | Daily reflection | Reflection API | Add entry (text/photo); view generated lesson |
| 28 | Location prompt (optional) | Location API or client geolocation | Trigger phrase when enabled and location available |
| 29 | Exam prep (extended) | Exam API | Reading, listening, speaking, writing, KNM modules |

---

## 9. Onboarding Flow Implementation

| Step | UI | API | Validation |
|------|-----|-----|------------|
| 1 | Profile (name, optional avatar) | PATCH /v1/profile or POST /v1/onboarding | Required: name |
| 2 | Level (CEFR or self-assess) | Same or step | Required: level |
| 3 | Goals (e.g. integration exam, daily practice) | Same | At least one |
| 4 | Consent (analytics, marketing, optional data sharing) | PATCH /v1/consent | Checkboxes; store per purpose |
| 5 | Done | Redirect to /home | Onboarding complete flag in profile |

Store current step in local state; persist on each step; allow back; on refresh, resume from last completed step or redirect to home if done.

---

## 10. Lesson UI Implementation

| Element | Implementation | Notes |
|---------|----------------|-------|
| **Lesson list** | Grid or list; filter by level/topic; skeleton load | Use React Query; cache invalidation on progress |
| **Lesson run** | Stepper or card stack; progress bar | One lesson = multiple steps (e.g. intro → vocab → quiz) |
| **Cards** | Front/back flip (CSS or lib); tap to flip | Track which seen; optional "know" / "don't know" |
| **Quiz** | Single/multiple choice; submit per question or batch | Disable after submit; show correct/incorrect |
| **Result** | Score; XP earned; "Next lesson" or "Retry" | POST progress on completion |
| **Accessibility** | Keyboard nav; aria labels; focus order | Screen reader friendly |

---

## 11. AI Simulation (Scenario) UI Implementation

| Element | Implementation | Notes |
|---------|----------------|-------|
| **Chat container** | Scrollable message list; scroll to bottom on new message | MessageBubble for user vs assistant |
| **Input** | Text area + Send; optional voice input (Phase C) | Disable while waiting for AI |
| **Turn flow** | User sends → loading indicator → AI message appears | Optimistic or wait for response |
| **End session** | Button "End"; confirm; redirect to practice hub or home | POST conversation/end |
| **Error** | Retry or "Use text" fallback message | From API 503 or timeout |
| **Moderation** | If API returns moderated content, show generic message | No raw unsafe content |

---

## 12. Voice / Audio UI Implementation

| Element | Implementation | Notes |
|---------|----------------|-------|
| **Mic permission** | Request on first use; PermissionGate component | Fallback: "Enable mic" or "Use text" |
| **Record** | getUserMedia + MediaRecorder; send chunk or full blob to backend | Per integration spec (upload vs stream) |
| **Playback** | Audio element; src from TTS URL or blob | Play, pause, replay; speed control optional |
| **Transcript** | Show user and assistant text; optional live STT display | Scroll with conversation |
| **Waveform** | Optional visualization (e.g. wavesurfer or simple bars) | Phase C or E |
| **Pronunciation** | Score and tips component after turn or dedicated exercise | From pronunciation API response |
| **Listening** | Audio player; question list below; submit answers | No transcript until after submit (or never for assessment) |

---

## 13. Permissions Flows

| Permission | When to ask | Fallback | Implementation |
|------------|-------------|----------|-----------------|
| **Microphone** | Before first voice or recording | Show "Enable in settings" or "Use text scenario" | PermissionGate; getMedia; handle denied |
| **Location** | Before location-aware prompts (Phase E) | Skip location prompts; rest of app works | Optional; consent in settings |
| **Notifications** | When user opts in (e.g. in settings) | No push; email only | Request permission; send subscription to backend |

Store consent in profile/backend; do not rely only on browser permission for GDPR.

---

## 14. PWA / Mobile Web Considerations

| Item | Phase | Done criteria |
|------|-------|----------------|
| **Viewport and meta** | A | width=device-width; theme-color; no zoom issues |
| **Touch targets** | A | Min 44px; spacing between tappable elements |
| **Service worker** | D or E | Cache static assets; optional offline "You're offline" page |
| **Install prompt** | D or E | Optional "Add to home screen" for supported browsers |
| **Safe area** | A | Insets for notched devices (env(safe-area-inset-*)) |

---

## 15. Accessibility

| Area | Phase | Action |
|------|-------|--------|
| **Focus** | A | Visible focus ring; logical tab order |
| **Contrast** | A | WCAG AA (4.5:1 text; 3:1 large text) |
| **Labels** | A–B | All inputs have labels; aria-label where needed |
| **Landmarks** | A | main, nav, header where applicable |
| **Screen reader** | B | Key flows (onboarding, lesson, scenario) tested with SR |
| **Motion** | B | Prefer reduced motion respected (media query) |

---

## 16. Localization Readiness

| Item | Phase | Notes |
|------|-------|--------|
| **i18n library** | B | react-i18next or similar; bundle per locale if needed |
| **Locale in API** | A | Accept-Language or X-Locale header; store in profile |
| **RTL** | E | Not required for Dutch; document if adding Arabic etc. |
| **Copy** | B | Strings in JSON or CMS; no hardcoded user-facing text in code |

Phase B: Dutch only; structure for multiple locales (keys, not translated content).

---

## 17. Analytics Instrumentation

| Event | When | Phase | Owner |
|-------|------|-------|--------|
| page_view | Route change (key screens) | A | Frontend |
| signup_started, signup_completed | Sign up flow | A | Frontend |
| login_completed | Login success | A | Frontend |
| onboarding_step_* | Each onboarding step | B | Frontend |
| lesson_started, lesson_completed | Lesson run | B | Frontend |
| scenario_started, scenario_completed | Scenario | C | Frontend |
| voice_session_started, voice_session_completed | Voice | C | Frontend |
| upsell_viewed, upsell_clicked | Paywall | D | Frontend |
| subscription_started (backend) | Stripe webhook | D | Backend |

Use same taxonomy as in analytics-and-observability-implementation-plan.md.

---

## 18. Frontend Test Plan

| Type | Scope | Phase |
|------|--------|-------|
| **Unit** | Utils, hooks, pure components | A |
| **Component** | Base components (Button, Input, etc.) with Testing Library | A |
| **Integration** | Auth flow (login, signup) with mock API | A |
| **E2E** | Onboarding, lesson run, scenario run (critical paths) | B, C |
| **A11y** | axe-core or similar on key screens | B |
| **Visual regression** | Optional; key screens | D |

Run in CI on every PR; E2E on main or nightly.

---

## 19. Performance Plan

| Item | Action |
|------|--------|
| **Bundle** | Code-split by route; lazy load Practice and Exam |
| **Images** | Optimize; use srcset for responsive; optional WebP |
| **Fonts** | Subset; preload critical font |
| **API** | Cache with React Query; avoid over-fetching |
| **Core Web Vitals** | Monitor LCP, FID, CLS; target "Good" |

---

## 20. Browser / Device Support

| Target | Notes |
|--------|--------|
| **Chrome, Safari, Firefox (last 2 versions)** | Primary |
| **iOS Safari 14+** | Critical for mobile web |
| **Android Chrome** | Critical for mobile web |
| **Desktop** | Responsive; not primary |
| **No IE** | Not supported |

---

## 21. Feature Flag Hooks

- `useFeatureFlag(key: string): boolean | string` — from provider SDK.
- Use for: rollout (e.g. voice_tutor_rollout), experiment (e.g. onboarding_v2), kill switch (e.g. disable_voice).
- Default: flags off or default value when SDK not loaded (SSR or error).

---

## 22. Premium Gating UI

| Pattern | When | Implementation |
|---------|------|----------------|
| **Gate component** | Wraps premium-only entry (e.g. "Start voice session") | Check entitlement; if free, show modal with upsell CTA instead of starting |
| **Upsell modal** | Cap reached or premium feature tapped | Copy + primary CTA (Start trial / Subscribe); dismissible |
| **Inline upsell** | In list (e.g. "Unlock all lessons") | CTA to paywall or checkout |
| **Settings** | Subscription management | Link to Stripe portal; show plan name and status |

Backend must enforce; frontend gate is UX only.

---

## 23. Dependencies

- Backend: Auth, profile, lessons, progress, scenario, voice, entitlements APIs (see backend-implementation-plan).
- Design: Tokens and component spec (design system).
- Integrations: Feature flags SDK; analytics SDK; Stripe (client-side only for checkout link or embed).

---

## 24. Risks

- API contract drift: Mitigation — OpenAPI or shared types; contract tests.
- Large bundle: Mitigation — Code split; tree-shake; audit with bundle analyzer.

---

## 25. Open Questions

- Storybook: yes/no and host.
- E2E runner: Playwright vs Cypress.
- Exact Stripe client integration: redirect vs embedded checkout.

---

## 26. Readiness and Done Criteria

- **Phase A done:** Login/signup work; shell and routing; design tokens and base components; feature flags and API client.
- **Phase B done:** Onboarding, home, lesson list and run, profile, settings; progress and gamification visible.
- **Phase C done:** Scenario and voice UIs; listening and pronunciation; permission and fallback flows.
- **Phase D done:** Entitlement gates and upsell; notification prefs; subscription in settings.
- **Phase E done:** Reflection and location UIs; exam prep extended; performance and a11y polish.
