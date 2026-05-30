# Notification Delivery (Push) — Integration Deep-Dive

**Integration**: Strategy (Web Push, FCM, APNs).  
**Version**: 1  
**Status**: Implementation-grade

---

## 1. Purpose

Specify **push notification** delivery for the AI Dutch Coach: re-engagement (streak reminder, trial ending, daily lesson ready). Covers device token registration, trigger events, payload design, and local/dev behavior. FD-15.

---

## 2. Core Concept

- **Flow**: Client registers device token (Web Push subscription or FCM/APNs token); backend stores token per user. On event (e.g. streak at risk, trial ending tomorrow), job or handler sends push via provider (Web Push API, FCM, APNs). **Source of truth**: Our DB stores user_id → tokens; provider delivers; we do not store notification content long-term (log optional).
- **Local**: No real push in local; mock or skip; optional test with browser Web Push or provider sandbox.

---

## 3. Why This Integration Exists

- **Re-engagement**: Bring users back (streak, trial, daily lesson). **Retention**: Timely nudges improve retention and conversion.

---

## 4. Business Capabilities Enabled

- **Streak reminder**: “You’re about to lose your streak. Practice now.” **Trial ending**: “Your trial ends tomorrow. Upgrade to keep access.” **Daily lesson**: “Your daily lesson is ready.”

---

## 5. Scope

### 6. In Scope

- **Registration**: POST /v1/notifications/register-push (token, platform: web | android | ios). Store in push_tokens (user_id, token, platform, created_at). **Delivery**: Job or sync on event (streak check, trial_ending job, daily_ready); build payload (title, body, optional data); call provider (Web Push with VAPID, FCM HTTP v1, APNs HTTP/2). **Preferences**: GET/PATCH /v1/notifications/settings (streak_reminder, trial_reminder, daily_ready); respect before sending.
- **Local**: Mock adapter (log or no-op); no real push. Optional: Web Push in browser with test credentials.

### 7. Out of Scope

- In-app notification center (optional). Rich media (images). Silent/data-only push for sync (optional). Marketing campaigns (separate consent).

---

## 8. Triggering Flows / Usage Points

| Trigger | Flow |
|---------|------|
| User enables notifications | Client gets permission; gets subscription (Web) or token (native); POST register-push → backend stores token. |
| Streak at risk (cron) | Job: find users with streak > 0 and no activity today, preference on → send “Streak reminder” to each token. |
| Trial ending (cron) | Job: find users with trial_ends_at = tomorrow → send “Trial ending” to each token. |
| Daily lesson ready | After reflection generation or time-based: send “Daily lesson ready” to user tokens. |

---

## 9. Inputs

- **Register**: token (string), platform (web | android | ios), optional device_id. **Send**: user_id, title, body, data (optional { screen, id }), tokens[].

---

## 10. Outputs

- **Register**: 200. **Send**: Provider returns 200/201 per token; invalid/expired tokens return 4xx; we mark token invalid or remove. **Preferences**: 200 with updated settings.

---

## 11. Data Domains Involved

- **push_tokens**: user_id, token, platform, created_at, last_used_at. **notification_settings**: user_id, streak_reminder, trial_reminder, daily_ready (booleans). **Events**: Streak check, trial_ending, daily_ready (from jobs or triggers).

---

## 12. Source of Truth Rules

- **Tokens**: Our DB is source of truth for which tokens to use; provider is delivery only. **Invalid tokens**: On 410/404 from provider, remove or mark token invalid so we do not retry.

---

## 13. Authentication Model

- **Our API**: Register and settings require auth (user_id from session). **Web Push**: VAPID keys (public in client, private in backend). **FCM/APNs**: Service account (FCM) or key/cert (APNs); backend only. **Env**: FCM_CREDENTIALS_JSON or path; APNS_KEY_ID, APNS_TEAM_ID, APNS_BUNDLE_ID, APNS_PRIVATE_KEY.

---

## 14. Authorization / Consent Model

- **User consent**: Browser or OS permission for push; we store preference (streak_reminder, etc.). **Respect preferences**: Do not send if user turned off that type. **GDPR**: Lawful basis (legitimate interest or consent); allow opt-out in settings.

---

## 15. Configuration Model

| Key | Type | Description |
|-----|------|-------------|
| VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY | string | Web Push |
| FCM_CREDENTIALS_JSON | string | Path or JSON string |
| APNS_* | string | APNs auth |
| PUSH_PROVIDER | string | web \| fcm \| apns (or multiple) |

---

## 16. Environment Strategy

| Env | Setup |
|-----|--------|
| **Local** | Mock: no real send; log “Would send push to user X”. No FCM/APNs keys required. Web Push: optional test with VAPID in browser. |
| **Staging** | Test FCM/APNs project; Web Push with same VAPID. Send to test devices only. |
| **Production** | Production credentials; respect user preferences. |

---

## 17. Data Flow Design

- **Register**: Validate token; upsert push_tokens (user_id, token, platform). **Send**: Load tokens for user_id; filter by platform if needed; for each token call provider; on 410/404 remove token; log success/fail. **Preferences**: Before send job, filter users by notification_settings (e.g. streak_reminder = true).

---

## 18. Sync / Polling / Webhook Design

- **Outbound only**: We send; no webhooks for delivery status in MVP (optional later for FCM/APNs). **Trigger**: Cron jobs (streak, trial_ending) or event (daily_ready after generation). **Async**: Send in job; do not block API.

---

## 19. Failure Handling

| Failure | Handling |
|---------|----------|
| Provider 5xx | Retry job (e.g. 3 attempts); backoff. |
| Token invalid (410/404) | Remove token from DB; do not retry. |
| Rate limit (429) | Backoff; retry job later. |
| No tokens | Skip user; log. |

---

## 20. Retry Strategy

- **Job**: 3 attempts with exponential backoff. **Per-token**: Do not retry 4xx (invalid token); retry 5xx once in same job run.

---

## 21. Rate Limiting / Quota Considerations

- **Provider**: FCM/APNs have limits; batch if needed. **Our side**: Limit per user (e.g. max 1 streak reminder per day); respect preferences.

---

## 22. Security / Compliance Requirements

- **VAPID**: Private key in env; never in client. **FCM/APNs**: Credentials in env/vault. **Payload**: No sensitive data in body (e.g. no payment info). **GDPR**: User can disable all; delete tokens on account deletion (BFR-008).

---

## 23. Auditability / Logging Requirements

- **Log**: Send attempt (user_id, type, success/fail); token removal (invalid). **Do not log**: Full token value (log last 4 chars or hash).

---

## 24. Observability / Monitoring

- **Metrics**: Send count by type; delivery success/fail; invalid token count. **Alerts**: Delivery failure rate; provider 5xx.

---

## 25. UI / UX Implications

- **Permission**: Request once; explain value (“Get streak reminders”). **Settings**: Toggle per type (streak, trial, daily). **Deep link**: data payload can include { screen: 'lesson', id } for opening app to specific screen.

---

## 26. Admin / Operations Implications

- **Test**: Send test push from admin or script to own token. **Invalid tokens**: Periodic cleanup job to remove tokens that failed 410/404.

---

## 27. API / Adapter Design

- **Interface**: PushAdapter.send(token, payload) → { success, statusCode }. **Implementations**: WebPushAdapter (VAPID), FCMAdapter, APNsAdapter, MockPushAdapter (log). **Service**: NotificationService.registerToken(userId, token, platform); sendToUser(userId, title, body, data); uses adapter by platform.

---

## 28. Event / Async Flow Design

- **Trigger**: Cron (e.g. daily at 8am for streak); trial_ending job (scheduled); after daily lesson generation. **Job**: Load users and tokens; for each user build payload; call PushAdapter per token; update last_used_at; remove invalid tokens.

---

## 29. Data Persistence Requirements

- **push_tokens**: user_id, token, platform, created_at, last_used_at. **notification_settings**: user_id, streak_reminder, trial_reminder, daily_ready. **Optional**: notification_log (user_id, type, sent_at) for analytics.

---

## 30. Local Development Setup

- **Mock**: PushAdapter no-op or log “Push: user_id, title, body”. No provider keys. **Web Push**: Use VAPID keys; subscribe in browser; trigger send from backend to test (optional). **FCM/APNs**: Use test project and test device for staging only.

---

## 31. Testing Requirements

- **Unit**: Mock adapter; assert send called with correct payload when job runs. **Integration**: With mock: register token → trigger job → assert send called for user. **E2E**: Optional; enable notifications → receive test push (staging).

---

## 32. Rollout / Feature Flag Strategy

- **Feature flag**: “push_notifications_enabled” to enable/disable sending. **Platform**: Enable Web first; FCM/APNs when native apps exist.

---

## 33. Example Scenarios

**Streak**: Cron finds users with streak > 0, no activity today, streak_reminder on → send “You’re about to lose your 5-day streak! Practice now.” **Trial**: Job finds trial_ends_at = tomorrow → send “Your trial ends tomorrow. Upgrade to keep premium access.” **Register**: Client POST { token: "...", platform: "web" } → store → 200.

---

## 34. Edge Cases

- **Multiple tokens per user**: Send to all; remove only invalid. **User opts out**: Check preferences before send. **Empty title/body**: Validate; do not send. **Very long body**: Truncate to provider limit (e.g. 200 chars).

---

## 35. Recommended Technical Design

- **NotificationService**: registerToken; sendToUser (load tokens, filter by preference, call adapter). **Jobs**: StreakReminderJob, TrialEndingJob, DailyReadyJob; each loads users and calls sendToUser. **Adapter**: Per platform; map payload to provider format.

---

## 36. Suggested Implementation Phasing

- **Phase 1**: Web Push only; register and store token; mock send in dev; one job (e.g. streak reminder). **Phase 2**: Trial and daily ready jobs; preferences; FCM/APNs when native apps. **Phase 3**: Delivery webhooks (optional); rich payload; A/B test copy.

---

## 37. Summary

**Notification delivery** is **strategy-based** (Web Push, FCM, APNs). **Registration** stores token per user; **jobs** trigger send on streak, trial ending, daily ready. **Preferences** respected; **invalid tokens** removed. **Local**: Mock adapter; no real push. Required for re-engagement (FD-15); P2 in MVP, Phase 2 acceptable.
