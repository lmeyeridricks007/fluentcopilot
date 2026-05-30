# Notifications — Per-Feature Integration Specification

**Feature**: FD-15 Notifications  
**Source**: docs/features/deep-dives/notifications.md; re-engagement (streak, trial ending, daily lesson)

---

## 1. Purpose

Specifies **integrations used by the Notifications feature**: push (Web Push, FCM, APNs) for delivery; optional email (trial reminder, receipts); entitlement/preferences (notification_settings); analytics. Covers device registration, preference management, and triggered sends (streak, trial ending, daily ready).

---

## 2. Feature Reference

- **Scope**: Re-engagement (streak reminder, trial ending, daily lesson ready); in-app notification center optional. **Integration dependencies**: Push provider; optional email; preferences in profile/DB.

---

## 3. Integrations Used (Summary)

| Integration | Role | Criticality |
|-------------|------|-------------|
| **Push (Web Push / FCM / APNs)** | Deliver push to device tokens; jobs trigger on streak at risk, trial_ends_at tomorrow, daily lesson ready | High (P2) |
| **Email** | Optional: trial-ending reminder, subscription receipt (overlap with Entitlements) | Medium |
| **Cache / Entitlements** | Read notification_settings (streak_reminder, trial_reminder, daily_ready); filter users by preference | High |
| **Analytics** | push_sent, push_failed, notification_preferences_updated | High |

---

## 4. Per-Integration Detail

- **Push**: Register token (POST /v1/notifications/register-push); jobs (StreakReminderJob, TrialEndingJob, DailyReadyJob) load users and tokens, respect settings, call PushAdapter.send. See [notification-delivery.md](../../notification-delivery.md). **Local**: Mock adapter (log only).
- **Email**: Optional trial reminder and receipts; same as [entitlements-subscription.md](./entitlements-subscription.md) and [email-provider.md](../../email-provider.md). **Local**: Mock email.
- **Entitlements/Preferences**: notification_settings (user_id, streak_reminder, trial_reminder, daily_ready); filter before send. See [entitlements-subscription.md](./entitlements-subscription.md), [cache-session-store.md](../../cache-session-store.md). **Local**: Redis + DB seed.
- **Analytics**: Events for sends and preference updates. See [analytics-provider.md](../../analytics-provider.md). **Local**: Mock.

---

## 5. Implementation Implications

- **Backend**: Notification service (register token, get/patch settings); Push adapter; jobs (cron or queue). **DB**: push_tokens, notification_settings. **UI**: Settings toggles; permission prompt; deep link from push. **Testing**: Mock push and email; assert send called with correct payload when job runs; preferences filter.

---

## 6. Summary

Notifications uses **Push** for delivery, optional **Email**, **entitlements/preferences** for filtering, and **analytics**. Full push and email detail in [notification-delivery.md](../../notification-delivery.md) and [email-provider.md](../../email-provider.md).
