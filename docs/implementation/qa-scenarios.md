# QA Scenarios

**Source**: docs/features/deep-dives, implementation stories and tasks

Test scenarios per feature area: happy path, error scenarios, edge cases, permission checks, integration failures. Enough for manual QA and to derive automated test cases.

---

## 1. Core Lessons

### 1.1 Happy path: Full lesson flow

| Step | Action | Expected |
|------|--------|----------|
| 1 | GET /v1/lessons?level=A1&limit=20 | 200; lessons[] with at least one A1 lesson; total ≥ 1. |
| 2 | GET /v1/lessons/42 (free user, under cap) | 200; lesson content with steps and exercises; progress null or existing. |
| 3 | POST /v1/progress/lesson { lesson_id: 42, step_index: 0, completed: false } | 200 { saved: true }. |
| 4 | POST /v1/progress/lesson { lesson_id: 42, step_index: 1, completed: false } | 200. |
| 5 | POST /v1/progress/lesson { lesson_id: 42, step_index: 4, completed: true, score: 85 } | 200; saved, completed, score, xp_awarded, streak_updated. |
| 6 | GET /v1/progress/lessons | 200; one completed lesson (42) with score 85. |
| 7 | GET /v1/entitlements | usage.lessons_today incremented (e.g. 1); lessons_cap = 5. |

### 1.2 Error: Free user at cap

| Step | Action | Expected |
|------|--------|----------|
| 1 | Use user with usage = 5 today (or set usage_counts to 5). | — |
| 2 | GET /v1/lessons/99 (new lesson, no in_progress) | 403; body error.code = "free_cap_reached"; usage.lessons_today = 5, lessons_cap = 5. |
| 3 | UI shows cap modal / upsell; no lesson content. | — |

### 1.3 Resume: No cap check

| Step | Action | Expected |
|------|--------|----------|
| 1 | User has lesson_progress for lesson 42 with status=in_progress, last_step_index=2. | — |
| 2 | GET /v1/lessons/42 | 200; progress.last_step_index = 2; no 403 even if usage = 5. |
| 3 | Client resumes from step 2. | — |

### 1.4 Idempotent complete

| Step | Action | Expected |
|------|--------|----------|
| 1 | POST /v1/progress/lesson { lesson_id: 42, completed: true, score: 90 } (first time) | 200; xp_awarded; usage incremented. |
| 2 | POST /v1/progress/lesson { lesson_id: 42, completed: true, score: 90 } (same user, again) | 200; same or existing score; no second XP; no second usage increment. |
| 3 | GET /v1/entitlements | lessons_today unchanged from step 1. |

### 1.5 Edge: Invalid lesson / not published

| Step | Action | Expected |
|------|--------|----------|
| 1 | GET /v1/lessons/99999 | 404. |
| 2 | GET /v1/lessons/:id for lesson with status=draft | 404 (catalog and detail only return published). |

### 1.6 Edge: Progress corruption (last_step_index > steps length)

| Step | Action | Expected |
|------|--------|----------|
| 1 | lesson_progress has last_step_index = 99; lesson has 5 steps. | — |
| 2 | GET /v1/lessons/42 | 200; backend clamps or treats as 0; client can resume from start or clamped step. No 500. |

### 1.7 Permission: Unauthenticated

| Step | Action | Expected |
|------|--------|----------|
| 1 | GET /v1/lessons (no token) | 401 or 200 with no progress badges (product choice). |
| 2 | GET /v1/lessons/42 (no token) | 401. |
| 3 | POST /v1/progress/lesson (no token) | 401. |

### 1.8 Integration: Gamification down

| Step | Action | Expected |
|------|--------|----------|
| 1 | Mock Gamification.award to return 503 or timeout. | Completion still persisted; 200 returned; xp_awarded may be null; optional retry job enqueued. No 500 to client. |

---

## 2. Entitlements & Subscription

### 2.1 Happy path: GET entitlements

| Step | Action | Expected |
|------|--------|----------|
| 1 | GET /v1/entitlements (free user) | 200; tier = "free"; usage.lessons_today, lessons_cap; manage_url null. |
| 2 | GET /v1/entitlements (trial user) | tier = "trial"; trial_ends_at set. |
| 3 | GET /v1/entitlements (premium) | tier = "premium"; subscription_ends_at; manage_url present. |

### 2.2 Trial start

| Step | Action | Expected |
|------|--------|----------|
| 1 | POST /v1/entitlements/trial/start (first time) | 200; trial_ends_at = now + 7 days. |
| 2 | GET /v1/entitlements | tier = "trial". |
| 3 | POST /v1/entitlements/trial/start (same user again) | 400 (trial already used). |

### 2.3 Webhook: Subscription updated

| Step | Action | Expected |
|------|--------|----------|
| 1 | Send Stripe subscription.updated (or invoice.paid) for user with subscription. | 200 from webhook endpoint. |
| 2 | GET /v1/entitlements for that user | tier = "premium"; subscription_ends_at updated; cache invalidated. |
| 3 | Send same event id again (idempotent) | 200; no duplicate update. |

### 2.4 Webhook: Invalid signature

| Step | Action | Expected |
|------|--------|----------|
| 1 | POST /v1/webhooks/payments/stripe with wrong signature | 401. |

### 2.5 Trial expired

| Step | Action | Expected |
|------|--------|----------|
| 1 | trials.ends_at in the past for user; run trial-expiry job or next GET. | GET /v1/entitlements returns tier = "free". |

---

## 3. Authentication (Reference)

- **Signup**: POST signup → 201 or 200; then GET /me returns user.
- **Login**: POST login → 200 with token/session; GET /v1/lessons with token → 200.
- **Logout**: POST logout → 200; subsequent GET /me or /lessons with same token → 401.
- **Invalid token**: GET /v1/lessons with expired or malformed token → 401.

---

## 4. Cross-Feature

### 4.1 Lesson complete → usage and cap

| Step | Action | Expected |
|------|--------|----------|
| 1 | Free user completes 5th lesson today (POST complete). | usage.lessons_today = 5. |
| 2 | Same user GET /v1/lessons/43 (new lesson). | 403 free_cap_reached. |

### 4.2 Lesson complete → Gamification and Personalization

| Step | Action | Expected |
|------|--------|----------|
| 1 | POST complete with score 80. | 200; xp_awarded and streak_updated in response (or from Gamification). |
| 2 | Personalization receives activity-event (lesson_completed). | Recommendation or session set can include “next lesson” or “Continue”. |

---

## 5. Summary Matrix

| Area | Happy path | Error / edge | Permission | Integration |
|------|------------|--------------|------------|-------------|
| Core Lessons | Full flow, resume, list | Cap 403, 404, idempotent complete, corrupt progress | 401 no token | Gamification down |
| Entitlements | GET, trial start, webhook | Trial already used, invalid webhook, trial expired | — | — |
| Auth | Signup, login, logout | Invalid token | 401 | — |

Use these scenarios to write E2E tests (e.g. Playwright, Cypress) and API integration tests (e.g. Jest + supertest).
