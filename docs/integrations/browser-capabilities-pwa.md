# Browser Capabilities & PWA Integration

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

Specifies **browser APIs and PWA** for mobile-web-first delivery: permissions (microphone, geolocation, notifications, media upload), PWA installability, service worker, and limitations (background, battery, privacy). No external SaaS; implementation guidelines only.

---

## 2. Why Needed

- Product relies on **microphone** (voice tutor, pronunciation), **geolocation** (location prompts), **notifications** (push), and **media upload** (reflection photos). Must work within browser security and mobile web constraints. PWA improves install and offline shell (ARCH, UI doc).

---

## 3. Decision Status

| Item | Status |
|------|--------|
| Browser permissions | **Required now** — document and implement |
| PWA | **Required now** (optional install; offline shell or message) |
| External provider | **None** (browser APIs only) |

---

## 4. Permissions Summary

| Permission | API | When to request | If denied | Mobile web notes |
|------------|-----|-----------------|-----------|-------------------|
| **Microphone** | `navigator.mediaDevices.getUserMedia({ audio: true })` | First time user starts voice (FD-04) or pronunciation (FD-06) | Show “Voice needs microphone”; offer text path; do not re-prompt every session | HTTPS + user gesture; Safari iOS supported |
| **Geolocation** | `navigator.geolocation.getCurrentPosition()` | When user enables “Location tips” in Settings (FD-08) | Feature off; link to browser settings | HTTPS; some browsers prompt; accuracy/battery tradeoff |
| **Notifications** | `Notification.requestPermission()` | When user enables “Remind me” or push | No push; in-app only | Required for Web Push; Safari iOS limited |
| **Storage (photos)** | File input or `getUserMedia` for camera | When user taps “Add photo” in reflection (FD-07) | Note-only reflection | File input accepted; camera optional |

---

## 5. Request Pattern (Consent-First)

1. **In-app explanation** before any permission: “We need microphone to practice speaking. We won’t record without your consent.” (BFR-009.)
2. **Then** call browser API (user gesture required in most browsers).
3. **If denied**: Do not block app; show clear message and link to Settings. Do not re-ask on every visit (avoid prompt fatigue).
4. **Persist consent** in our backend (BFR-009); actual permission state is in browser; we only store “user agreed to ask” and “feature enabled.”

---

## 6. PWA Requirements

- **Manifest**: `manifest.json` with name, short_name, start_url, display (standalone or minimal-ui), icons (192, 512), theme_color, background_color. Served from same origin.
- **Service worker**: Register sw.js; cache static assets (JS, CSS, images) for offline shell. For API: do not cache POST; for GET (e.g. lesson content), optional cache-first or network-first per route. **Offline**: Show “You’re offline” for API-dependent screens; optional cache last lesson for read-only (UI doc).
- **Installability**: Criteria (manifest + HTTPS + sw + icons). “Add to Home Screen” prompt (optional); do not force. Install does not change permission behavior (still need to request microphone etc. when user uses feature).
- **Updates**: On sw update, skipWaiting + clients.claim or notify user “New version available; refresh.”

---

## 7. Background and Battery Limitations

- **Mobile web**: No long-running background (service worker is event-driven). Push: sw wakes for push event only. **Geolocation**: Prefer `getCurrentPosition` once when needed (e.g. on app open or when entering Practice) rather than `watchPosition` continuously to save battery.
- **Location-aware prompts**: May only fire “when app is open” or “on next open” near venue if we cannot run geofence in background (mobile web limitation). Document in FD-08 and geolocation doc.

---

## 8. Security and Privacy

- **HTTPS**: All permission APIs require secure context. **Same-origin**: Our app only; no third-party iframe for capture.
- **No credentials in client**: No API keys for backend services in frontend; only client-safe keys (see integration-security-secrets).

---

## 9. Testing

- Test on real devices (Chrome Android, Safari iOS) and desktop. Test permission allow/deny paths; test PWA install and offline; test service worker update. Document supported matrix (e.g. “Voice supported: Chrome, Edge, Firefox; Safari limited”).

---

## 10. Implementation Guidelines

- **Centralize permission checks**: Single “permission gate” component (UI doc); same logic for “feature needs permission X” and “request or show denied message.”
- **Feature detection**: Check `navigator.mediaDevices`, `MediaRecorder`, `PushManager`, `geolocation` before offering voice, push, or location; show “Not supported in this browser” when missing.
- **Document support matrix** in help or docs: which browsers and versions support voice, push, location, PWA install.
