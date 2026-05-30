# Notifications — Deep-Dive Specification

## 1. Purpose

Notifications cover in-app and push notifications: preferences, registration of push token, and delivery of re-engagement and contextual messages (e.g. streak reminder, “Your daily lesson is ready,” trial ending). Consent for notifications is collected in onboarding (FD-01); this spec covers settings, registration, and integration with triggers from Personalization, Entitlements, and other modules.

## 2. Core Concept

- **Preferences**: User can enable/disable push and optionally in-app notification categories (e.g. reminders, tips, offers); stored per user (BFR-009: consent for notifications).
- **Registration**: Client registers device push token with backend; backend stores token and associates with user; used by push provider (FCM, APNs, or web push).
- **Delivery**: Backend or worker sends push via provider when trigger fires (e.g. streak_reminder from Personalization, trial_ending from Entitlements, daily_lesson_ready from Daily Reflection).
- **In-app**: In-app messages (e.g. banner, modal) can be driven by same triggers or by API response (e.g. “Your trial ends in 2 days” on GET /entitlements).

## 3. Why This Feature Exists

- **Retention**: Reminders and re-engagement (streak, daily goal) bring users back (OBJ-4).
- **Conversion**: Trial ending and “premium feature” nudges support conversion.
- **Consent**: Notifications are optional; user controls (BFR-009).

## 4. User / Business Problems Solved

- Users stay informed and reminded without intrusive defaults.
- Business improves retention and conversion through timely messaging.

## 5. Scope

### 6. In Scope

- **Settings**: GET/PATCH /notifications/settings (push_enabled, in_app_enabled, categories or simple on/off); consent stored in Profile (FD-01) or here.
- **Registration**: POST /notifications/register-push { token, platform (web|ios|android) }; store and associate with user; unregister on logout or optional “disable push.”
- **Triggers**: Integration points for other modules to request send: streak_reminder (Personalization), daily_lesson_ready (Daily Reflection), trial_ending (Entitlements), optional payment_failed (Entitlements). Notifications service or worker consumes trigger and sends via provider if user has push enabled and consent.
- **In-app**: Optional in-app message API or embedded in existing APIs (e.g. GET /entitlements returns trial_ends_at; client shows banner). No separate “in-app notification” queue required for MVP if in-app is just UI driven by API data.
- **Preferences and consent**: Withdraw notification consent in Settings; stop sending push; remove or retain token per policy (e.g. delete token on withdraw).

### 7. Out of Scope

- Rich push payloads (images, actions) — product decision; basic title/body in scope.
- In-app notification center (list of past notifications) — optional future.
- Email notifications (separate channel; referenced only as optional).
- Building push provider (FCM/APNs); integrate with existing provider.

## 8. Main User Personas

- **Engaged learner**: Enables push for reminders and streak.
- **Privacy-conscious**: Disables push; may use in-app only or none.
- **Trial user**: Receives “Trial ending” push or in-app if enabled.

## 9. Main User Journeys

| Journey | Steps |
|--------|--------|
| **Enable push** | Onboarding or Settings → Enable notifications (consent) → OS prompt → User grants → Client POST register-push with token → Backend stores. |
| **Receive push** | Trigger fires (e.g. streak_reminder) → Backend/worker looks up user tokens and consent → Send via provider → User sees push; taps → Open app (deep link optional). |
| **Disable** | Settings → Notifications off → PATCH settings; optional DELETE token or mark inactive; no more push. |
| **In-app** | User opens app → GET /entitlements returns trial_ends_at → Client shows “Your trial ends in 2 days” banner. |

## 10. Triggering Events / Inputs

- **Settings change**: User toggles in Settings; PATCH /notifications/settings.
- **Register**: Client gets token from OS (FCM/APNs/web); POST /notifications/register-push.
- **Triggers**: From other modules (event or internal API): e.g. Personalization “send streak_reminder for user_id X”; Entitlements “trial_ending user_id X”; Daily Reflection “daily_lesson_ready user_id X.” Notifications service checks consent and settings; sends push for enabled users.
- **In-app**: No push; client reads API (e.g. GET /entitlements, GET /recommendations) and renders banner/message based on data.

## 11. States / Lifecycle

- **Consent**: Granted or withdrawn; stored in Profile or notifications_settings; withdrawal stops push and optionally removes tokens.
- **Token**: Stored per user per device; valid until unregister or provider invalidates; multiple tokens per user (multi-device) allowed.
- **Trigger**: One-time send (e.g. “Trial ends tomorrow”); no persistent “notification” entity unless building notification center.

## 12. Business Rules

- **BFR-009**: Explicit consent for notifications; user can withdraw in Settings.
- **Respect preferences**: Do not send push if push_enabled = false or consent withdrawn.
- **Frequency**: Optional rate limit (e.g. max 1 streak reminder per day) to avoid spam; product config.
- **Deep link**: Push payload can include target (e.g. /home, /lessons/:id); client opens to that route on tap.

## 13. Configuration Model

- **Categories**: Optional (reminders, tips, offers); or simple on/off for push and in-app.
- **Triggers**: Mapping of trigger type to message template (title, body); i18n by locale.
- **Rate limits**: Per user per trigger type (e.g. streak_reminder once per day); config.
- **Provider**: FCM, APNs, web push endpoint and credentials; env or config.

## 14. Data Model

- **notification_settings**: user_id, push_enabled (boolean), in_app_enabled (boolean), consent_granted_at, consent_withdrawn_at (nullable), updated_at.
- **push_tokens**: user_id, token (string), platform (web|ios|android), created_at, last_used_at (optional). Unique (user_id, token) or (user_id, platform) if one token per platform. Soft delete on logout or disable.
- **Consent**: May live in Profile.consents (notifications) (FD-01); Notifications service reads for send decision.
- **Optional**: notification_log (id, user_id, trigger_type, sent_at, opened_at) for analytics and rate limit.

## 15. Read Model / Projection Needs

- **Settings**: GET /notifications/settings for client to show toggles and respect on send.
- **Send path**: For trigger, load user’s push_tokens and notification_settings; if enabled, send via provider; optional log for rate limit and analytics.

## 16. APIs / Contracts

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| GET | `/v1/notifications/settings` | Get notification preferences | — | 200 { push_enabled, in_app_enabled } |
| PATCH | `/v1/notifications/settings` | Update preferences | { push_enabled?, in_app_enabled? } | 200 { updated } |
| POST | `/v1/notifications/register-push` | Register device token | { token, platform } | 200 or 204; 400 invalid |
| DELETE | `/v1/notifications/register-push` | Unregister token (logout) | { token } or current user tokens | 204 |
| (Internal) | Trigger send | Other modules call Notifications to send | { user_id, trigger_type, payload? } | Async; no HTTP contract |

**Trigger types**: streak_reminder, daily_goal_reminder, trial_ending, daily_lesson_ready, payment_failed (optional), welcome (post signup, optional). Payload: optional deep_link, custom title/body override.

## 17. Events / Async Flows

- **Trigger**: Personalization, Entitlements, Daily Reflection (or cron) emit or call “send notification for user X, type Y”; Notifications service queues or sends; checks consent and rate limit.
- **Optional**: notification_sent, notification_opened (from client or provider callback) for analytics.
- **Consent withdrawn**: Profile or Notifications updates consent; next trigger for user skips send; optional token cleanup.

## 18. UI / UX Design

- **Settings**: “Push notifications” toggle; “In-app messages” toggle; explanation “We’ll send reminders and tips”; link to privacy. If OS denied, “Enable in device settings.”
- **Push**: Title and body from template; tap opens app (and optional deep link).
- **In-app**: Banner or modal driven by API data (e.g. trial_ends_at); dismissible; “Subscribe” or “Later.”

## 19. Main Screens / Components

- **NotificationSettingsScreen**: Toggles for push and in-app; save; consent text.
- **Push registration**: On app load or after consent, call provider SDK to get token; POST register-push. On logout, DELETE register-push or clear token.
- **In-app banner**: Component that reads entitlement or recommendation data and shows “Trial ending” or “Streak at risk”; CTA and dismiss.

## 20. Permissions / Security Rules

- **Authenticated**: Settings and register-push require auth; user only manages own settings and tokens.
- **Send**: Only backend or worker can trigger send; validate user_id and trigger_type; do not expose send API to client.
- **Token**: Store token securely; do not log; use for send only.

## 21. Notifications / Alerts / Side Effects

- **Push**: User receives on device when trigger fires and consent enabled.
- **Withdraw**: No more push; optional in-app still on (product decision).
- **Provider errors**: Invalid token → remove token; retry logic for transient failures.

## 22. Integrations / Dependencies

- **Profile / Consent (FD-01)**: Notification consent; read for send decision; withdraw updates Settings.
- **Personalization**: Streak reminder and daily goal triggers (when to send); Personalization may call Notifications API or publish event.
- **Entitlements**: Trial ending, payment failed; trigger send.
- **Daily Reflection (FD-07)**: Daily lesson ready → trigger “Your day lesson is ready.”
- **Push provider**: FCM, APNs, web push; credentials and API for send.
- **Optional**: Analytics for sent and opened.

## 23. Edge Cases / Failure Cases

- **OS permission denied**: Client cannot get token; show “Enable in device settings”; do not send until token available.
- **Token invalid**: Provider returns invalid; remove token from DB; user re-enables to get new token.
- **Consent withdrawn**: Immediately stop sending; optional delete tokens.
- **Rate limit**: Do not send same trigger type more than N times per period; avoid spam.
- **Multi-device**: User has multiple tokens; send to all or last used; optional “quiet hours” or “do not disturb” (future).

## 24. Non-Functional Requirements

- **Latency**: Send within minutes of trigger (async queue acceptable); registration < 500ms.
- **Availability**: Provider dependency; log and retry on failure; do not block trigger source (fire-and-forget or queue).
- **Privacy**: No PII in push payload if possible; deep link only; body from template.

## 25. Analytics / Auditability Requirements

- **Events**: notification_sent (trigger_type, user_id); notification_opened (optional). For funnel and engagement.
- **Audit**: Consent and settings changes; token add/remove for support.

## 26. Testing Requirements

- Unit: Settings update; token store; consent check before send; rate limit.
- Integration: POST register-push; GET/PATCH settings; mock trigger send (with test token or stub provider).
- E2E: Enable notifications in Settings; trigger (e.g. streak reminder mock); receive push in test environment.

## 27. Recommended Architecture

- **Notifications service**: Owns notification_settings and push_tokens; exposes GET/PATCH settings, POST/DELETE register-push. Internal: send(user_id, trigger_type, payload); loads tokens and settings; calls push provider; optional queue (e.g. Redis or job queue) for async send.
- **Triggers**: Personalization, Entitlements, Daily Reflection call Notifications.send() after their logic (e.g. “user has no activity today and streak > 0” → send streak_reminder). Or event-driven: publish “streak_reminder” event; Notifications subscriber consumes and sends.

## 28. Recommended Technical Design

- **Provider**: Use Firebase Cloud Messaging (FCM) for web and Android; APNs for iOS; web push for PWA. One interface (e.g. send(token, title, body, data)); adapter per provider.
- **Templates**: Server-side template per trigger_type and locale; e.g. streak_reminder: “Don’t break your streak! You’re at {streak} days.”
- **Idempotency**: Register-push upsert by (user_id, token); multiple tokens per user for multi-device.

## 29. Suggested Implementation Phasing

- **Phase 1**: GET/PATCH settings; POST register-push; store tokens; consent from Profile; no send (stub).
- **Phase 2**: Integrate push provider; send on trigger (e.g. streak_reminder from cron or Personalization); rate limit.
- **Phase 3**: All trigger types (trial_ending, daily_lesson_ready, payment_failed); in-app banner from API data; analytics (sent, opened).

## 30. Summary

Notifications provide user-controlled push and in-app messaging. Settings and push token registration are exposed via API; consent is stored and respected. Other modules (Personalization, Entitlements, Daily Reflection) trigger sends for streak reminder, trial ending, daily lesson ready, etc. Implementation must respect consent and preferences, integrate with push provider, and avoid blocking trigger sources (async send). In-app messaging can be driven by existing API data (e.g. trial_ends_at) without a separate notification queue for MVP.
