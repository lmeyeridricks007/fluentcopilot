# Geolocation & Place Context Integration

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

Specifies **geolocation** and optional **place context** for location-aware phrase prompts (FD-08): when user is near a café, supermarket, etc., suggest a Dutch phrase. Privacy-sensitive; user can disable (BR-3).

---

## 2. Why Needed

- FD-08: Location-aware learning prompts. Optional feature; requires consent (BFR-009). Location not persisted long-term (Data doc).

---

## 3. Decision Status

| Item | Status |
|------|--------|
| Browser geolocation | **Required now** (for feature) |
| Place API (Google/Mapbox/Foursquare) | **Optional later** (enrich “near what”) |

---

## 4. Architecture

- **Client**: Uses `navigator.geolocation.getCurrentPosition()` (or watchPosition for live). Request only after user enables “Location tips” in Settings and grants browser permission. Send position (lat, lng, accuracy) to backend only when needed (e.g. “get phrase for nearby”) or evaluate locally (see below).
- **Backend**: Option A: Client sends lat/lng; backend returns phrase for “café” or “supermarket” (backend has geofence/place type logic or calls Places API). Option B: Client has static list of place types and geofences; client checks distance; if near, show phrase from static list (no backend call). Prefer **Option B for privacy** (no location sent to server) or Option A with minimal logging (do not store lat/lng).
- **Place type**: If no Places API: use coarse geofences (e.g. “within 100 m of a known café” — requires curated list) or simple “near me” phrase. With Places API: reverse geocode or nearby search to get “café”/“supermarket”; then return phrase.

---

## 5. Credentials

- **Browser geolocation**: No key (browser API). HTTPS required.
- **Places API** (if used): Google Places API key (restrict by referrer/API); backend only if server-side; or client key restricted to our domain. **Not required** for Phase 1 if using client-only or static phrases.

---

## 6. Frontend Responsibilities

- **Permission**: Request only when user toggles “Location tips” on. Explain: “We’ll suggest phrases when you’re near a café or shop. We don’t store your location.” If denied, feature off; link to browser settings.
- **Battery**: getCurrentPosition once when app opens or when user enters “Practice” (not continuous watch) to avoid battery drain. Option: only when app in foreground.
- **Degradation**: If geolocation unavailable (HTTP, denied, timeout), show “Location tips unavailable” and do not send location.

---

## 7. Backend Responsibilities (if Option A)

- **Endpoint**: e.g. POST /v1/location/phrase (lat, lng). Return { place_type, phrase } or 204 if no match. Do **not** store lat/lng; use only for immediate lookup. Log only “phrase requested” (no coords).
- **Geofence/place**: Use in-memory or DB list of areas (polygon or radius) and type; or call Places API (nearby) with strict quota. Prefer static list for Phase 1.

---

## 8. Privacy and Compliance

- **Consent**: Explicit; withdrawable (BR-3). Short retention: do not persist location (Data doc). Lawful basis: consent.
- **GDPR**: Location is personal data; minimize; document in privacy policy.

---

## 9. Failure Modes

- Timeout: 10 s timeout for getCurrentPosition; then “Location unavailable. Try again.”
- Denied: Feature off; do not re-ask every session (avoid prompt fatigue).

---

## 10. Testing

- Browser with location mock (Chrome DevTools); test allow/deny. Verify no location in server logs if Option B or if Option A with no-log policy.
