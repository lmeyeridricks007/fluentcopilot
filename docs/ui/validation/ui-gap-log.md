# UI Gap Log

**Purpose**: Record gaps between documentation/specs and actual UI implementation.

**Format**: ID, feature/module, screen/component, issue description, expected vs actual, likely cause, severity, recommended fix.

---

## GAP-001

| Field | Value |
|-------|--------|
| **Feature** | Settings (cross-cutting) |
| **Screen/Component** | SettingsPage |
| **Issue** | Notifications, Email preferences, Microphone, Privacy policy, Export my data, Delete account, Help & support buttons have no onClick or navigation. |
| **Expected** | Each row either navigates to a dedicated screen or opens a modal/sheet with relevant content or placeholder. |
| **Actual** | Plain `<button>` with no handler; click does nothing. |
| **Likely cause** | Placeholder UI; handlers not implemented. |
| **Severity** | Medium (dead CTAs; spec says "Notification settings, push registration UI") |
| **Recommended fix** | Add onClick: navigate to placeholder routes (e.g. /app/settings/notifications) or show toast/placeholder modal; document as "Coming soon" where no backend. |

---

## GAP-002

| Field | Value |
|-------|--------|
| **Feature** | Personalization & Home (E-14) |
| **Screen/Component** | HomePage |
| **Issue** | When recommended lessons list is empty, "Continue learning" section is hidden and there is no empty state. |
| **Expected** | Either show EmptyState ("No lessons yet — start exploring") with CTA to /app/learn, or always show section with empty message. |
| **Actual** | `{recommended.length > 0 && (...)}` — nothing shown when empty. |
| **Likely cause** | Demo data usually has recommendations; empty case not handled. |
| **Severity** | Low (demo data typically populated) |
| **Recommended fix** | Add else branch with EmptyState + "Browse lessons" button linking to /app/learn. |

---

## GAP-003

| Field | Value |
|-------|--------|
| **Feature** | Listening Training (E-06) |
| **Screen/Component** | ListeningPage, routes |
| **Issue** | Route is /app/practice/listening/:exerciseId but there is no catalog/list of exercises; page does not use exerciseId. User cannot discover exercises. |
| **Expected** | Either a list route /app/practice/listening with catalog, then click to /app/practice/listening/:id; or redirect /app/practice/listening to catalog. |
| **Actual** | Direct navigation to listening requires an exerciseId; Home and nav don't link to a list. Single generic exercise content regardless of id. |
| **Likely cause** | Single mock exercise; catalog not built. |
| **Severity** | Medium (broken discovery flow) |
| **Recommended fix** | Add ListeningCatalogPage or make ListeningPage handle no exerciseId: show list of mock exercises; link each to /app/practice/listening/:id. Use exerciseId in page to vary content or title. |

---

## GAP-004

| Field | Value |
|-------|--------|
| **Feature** | Core Lessons (E-03) |
| **Screen/Component** | LessonDiscoveryPage, GuidedLessonPage |
| **Issue** | No loading or skeleton state when "loading" lesson list or lesson detail. |
| **Expected** | Per UI completion criteria: "UI reflects loading states (skeletons or loading indicators)." |
| **Actual** | Data is synchronous mock; no loading state shown. |
| **Likely cause** | Mock is sync; when replaced with API, loading state will be needed. |
| **Severity** | Low (current mock is sync; good to add for consistency/spec) |
| **Recommended fix** | Add optional loading state (e.g. Skeleton or LoadingScreen) when using async API; for mock, can skip or add brief simulated delay + skeleton for spec compliance. |

---

## GAP-005

| Field | Value |
|-------|--------|
| **Feature** | Notifications (E-15) |
| **Screen/Component** | Settings — Notifications |
| **Issue** | Spec mentions "Notification settings, push registration UI" but there is no dedicated notifications settings screen. |
| **Expected** | Either a full screen for notification preferences and push registration or documented placeholder. |
| **Actual** | Settings has a Notifications row with no handler. |
| **Likely cause** | Not implemented; P2 feature. |
| **Severity** | Low (P2) |
| **Recommended fix** | Add route /app/settings/notifications and NotificationSettingsPage (toggles + push CTA placeholder); wire Settings Notifications button to navigate there. |

---

## GAP-006

| Field | Value |
|-------|--------|
| **Feature** | Settings (cross-cutting) |
| **Screen/Component** | SettingsPage — Privacy & data, Help |
| **Issue** | Privacy policy, Export my data, Delete account, Help & support have no actions. |
| **Expected** | At least navigation to placeholder or in-app message (e.g. "Coming soon" or external link for privacy policy). |
| **Actual** | Buttons do nothing. |
| **Severity** | Medium (user expectation; compliance for privacy/delete) |
| **Recommended fix** | Privacy policy: link to /app/settings/privacy or external URL. Export/Delete: navigate to placeholder page or modal with disclaimer. Help: navigate to /app/settings/help or open mailto/support link. |

---

## Summary

| Severity | Count |
|----------|--------|
| Medium | 3 (GAP-001, GAP-003, GAP-006) — **Fixed** |
| Low | 3 (GAP-002, GAP-004, GAP-005) — GAP-002, GAP-005 **Fixed**; GAP-004 deferred |

**Status**: All medium and applicable low gaps addressed in Validation Run 1. See ui-fix-log.md and validation-run-1-review.md.
