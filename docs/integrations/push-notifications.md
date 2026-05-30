# Push Notifications Integration

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

Specifies **push notifications** for reminders, streak nudges, and re-engagement. Covers Web Push (mobile web first), optional FCM/OneSignal, consent, preferences, and backend send flow.

---

## 2. Why Needed

- Reminders to practice (FD-Notifications); streak nudges; re-engagement (lapsed users). Consent required (BFR-009).

---

## 3. Decision Status

| Item | Status |
|------|--------|
| Push for mobile web | **Required later** (Phase 2) or optional Phase 1 |
| Web Push | **Primary** (no native app dependency) |
| FCM / OneSignal | **Optional** (simplify multi-channel later) |

---

## 4. Recommended Approach

- **Web Push** via VAPID: Backend holds VAPID key pair; frontend uses public key to subscribe (Push API); backend stores subscription (endpoint + keys) and sends via web-push library. No third-party SaaS required for basic push.
- **Optional**: OneSignal or FCM for richer targeting and analytics; both support web.

---

## 5. Credentials

| Credential | Purpose | Where | Frontend-safe? |
|------------|---------|--------|----------------|
| `VAPID_PUBLIC_KEY` | Subscribe (Push API) | Frontend (build) | Yes |
| `VAPID_PRIVATE_KEY` | Sign and send push | Backend | No |

Generate with `web-push generate-vapid-keys`. Store private in vault; public in build env `VITE_VAPID_PUBLIC_KEY`.

---

## 6. Frontend Responsibilities

- **Request permission**: `Notification.requestPermission()` only after user gesture and in-app explanation (consent). If denied, do not re-prompt repeatedly.
- **Subscribe**: Use `serviceWorkerRegistration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: VAPID_PUBLIC_KEY })`. Send resulting subscription object (JSON) to backend `POST /v1/notifications/subscribe`.
- **Service worker**: Required for Web Push. In sw: handle `push` event; show notification with `registration.showNotification(title, options)`; handle `notificationclick` (e.g. focus app or open URL).
- **Unsubscribe**: Call subscription.unsubscribe(); notify backend to remove subscription.

---

## 7. Backend Responsibilities

- **Store subscription**: Save subscription JSON (endpoint, keys) per user_id. Table: push_subscriptions (user_id, endpoint, p256dh, auth, created_at).
- **Send**: Use web-push library (e.g. node-web-push) with VAPID private key; send payload (title, body, url) to endpoint. Respect user preferences (e.g. no reminder after 21:00).
- **Failure**: On 410 Gone or 404, remove subscription. Retry 5xx with backoff (provider retries also). Do not log full subscription object (privacy).

---

## 8. Consent and Preferences

- Consent flag in profile (BFR-009); user can withdraw in Settings. If withdrawn, delete subscriptions and stop sending.
- Preferences: reminder time window, streak nudge on/off. Store in DB; filter sends by preference.

---

## 9. Failure and Limits

- **Browser limits**: Some browsers throttle; no guarantee of delivery. Degraded: in-app only if push not available.
- **Mobile web**: Service worker and push support vary (Chrome Android good; Safari iOS limited for web push). Document support matrix in browser-capabilities doc.

---

## 10. Testing

- Use browser in production or staging with push enabled; send test notification. Verify permission deny path and unsubscribe.

---

## 11. Rollout

- Phase 2 or optional Phase 1. Feature-flag; enable for opted-in users. Monitor delivery and unsubscribes.
