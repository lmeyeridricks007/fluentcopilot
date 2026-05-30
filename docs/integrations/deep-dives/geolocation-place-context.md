# Geolocation / Place Context — Integration Deep-Dive

**Integration**: Strategy (Browser Geolocation API + optional Places API: Google or Mapbox).  
**Version**: 1  
**Status**: Implementation-grade

---

## 1. Purpose

Specify **geolocation and place context** for the AI Dutch Coach: location-aware phrase prompts (FD-08). User’s location (with consent) can tailor daily prompts (e.g. “at a café”, “at the supermarket”). Optional reverse geocode or place type from coordinates.

---

## 2. Core Concept

- **Browser Geolocation**: Client gets position (lat, lng) via navigator.geolocation; user must consent. We do not store precise location long-term (privacy); use for current session or daily prompt only. **Places (optional)**: Reverse geocode (lat/lng → address or place type) via Google Places or Mapbox; or use coarse “venue type” from our own mapping (e.g. POI categories).
- **Source of truth**: User’s device is source of position; our backend may receive coordinates or only venue type (e.g. “cafe”) for prompt generation; we do not store raw coordinates in profile (policy).

---

## 3. Why This Integration Exists

- **FD-08**: Location-aware prompts make learning contextual (“You’re at a café — practice these phrases”). **Differentiation**: Relevant, situational content.

---

## 4. Business Capabilities Enabled

- **Contextual prompts**: “Based on your location (café), here are 5 phrases to practice.” **Optional**: “Near supermarket” → different phrase set. **Privacy**: Coarse or one-time use; no location history stored.

---

## 5. Scope

### 6. In Scope

- **Client**: Request geolocation (getCurrentPosition or watchPosition once); consent required; send to backend either (lat, lng) or optional client-side reverse geocode then send venue_type only. **Backend**: Receive location or venue_type; use in prompt for daily reflection or location-aware lesson (e.g. “user at café” → LLM prompt). **Optional**: Backend reverse geocode (Google/Mapbox) if client sends coordinates; return or derive venue type; do not store coordinates in DB (or store hashed/coarse only per policy). **Consent**: Explicit “Use location for personalized prompts”; store consent flag; do not use without consent.
- **Local**: Browser geolocation can be mocked (Chrome dev tools) or skipped; backend receives test venue_type (e.g. “cafe”) for dev.

### 7. Out of Scope

- Continuous tracking. Location history. Map display. Geofencing. Multiple place types in one request (single venue type per request is enough for Phase 1).

---

## 8. Triggering Flows / Usage Points

| Trigger | Flow |
|---------|------|
| User opens daily / reflection | Client: check consent → if yes getCurrentPosition → send POST /v1/context/location { lat, lng } or { venue_type } → backend returns or derives venue_type → use in prompt for reflection/phrases. |
| Consent withdrawal | Update consent flag → backend never uses location for this user. |
| No consent | Backend uses default or no location in prompt. |

---

## 9. Inputs

- **Client**: lat, lng (optional), or venue_type (if client did reverse geocode). **Backend**: Coordinates or venue_type; user_id from auth. **Places API** (optional): lat, lng → request → response with place type or address.

---

## 10. Outputs

- **Backend**: venue_type (e.g. cafe, supermarket) or 200 with no location used. **Places**: place_type or address components. **Prompt**: Injected into LLM context (“User is at a café”).

---

## 11. Data Domains Involved

- **Consent**: profile or consent table — location_for_prompts (boolean). **Session/request**: location or venue_type in request only; not stored in user profile (policy: no location history). **Optional**: One-time cache for “current session” only (e.g. Redis key with TTL 1h) for prompt generation.

---

## 12. Source of Truth Rules

- **Consent**: Our DB. **Position**: Device; we do not store raw coordinates long-term. **Venue type**: Derived per request or from client; use only for prompt generation.

---

## 13. Authentication Model

- **Our API**: Location/context endpoint requires auth. **Browser**: Geolocation permission (user grants in browser). **Places API**: Backend uses API key (Google) or token (Mapbox); env; never in client.

---

## 14. Authorization / Consent Model

- **Consent**: Explicit “Use my location for personalized prompts”; store in profile. **No consent**: Do not call getCurrentPosition; do not send location to backend; backend uses default context. **GDPR**: Legitimate interest or consent; minimal data; no history.

---

## 15. Configuration Model

| Key | Type | Description |
|-----|------|-------------|
| LOCATION_CONSENT_REQUIRED | boolean | Must have consent to use location |
| PLACES_PROVIDER | string | google \| mapbox \| none |
| GOOGLE_PLACES_API_KEY / MAPBOX_* | string | Backend only |
| LOCATION_MAX_AGE_MS | number | Max age of position (e.g. 60000) |

---

## 16. Environment Strategy

| Env | Setup |
|-----|--------|
| **Local** | No real geolocation required; backend accepts venue_type in request (e.g. “cafe”) for testing. Browser: mock in dev tools or skip. **Places**: Optional test API key or mock (return fixed venue type). |
| **Staging** | Real geolocation in browser; Places test key; consent flow. |
| **Production** | Production Places key if used; consent required. |

---

## 17. Data Flow Design

- **Client**: User has consent → getCurrentPosition(maxAge) → send { lat, lng } or client-side reverse geocode → send { venue_type }. **Backend**: If coordinates and Places enabled → reverse geocode → get venue_type; else use venue_type from request. **Prompt**: Build reflection or phrase prompt with “User is at {venue_type}”. **No storage** of lat/lng in DB (or coarse grid only if policy allows).

---

## 18. Sync / Polling / Webhook Design

- **Sync**: Single request (get position once or send venue_type); no continuous polling. **No webhooks**.

---

## 19. Failure Handling

| Failure | Handling |
|---------|----------|
| User denies geolocation | Do not send location; backend uses default (no venue). |
| Position unavailable (timeout) | Backend receives no location; use default. |
| Places API 5xx | Fallback: use “unknown” or omit location from prompt. |
| Invalid coordinates | Return 400 or ignore; use default. |

---

## 20. Retry Strategy

- **getCurrentPosition**: No retry (user already chose). **Places API**: One retry on 5xx; then fallback.

---

## 21. Rate Limiting / Quota Considerations

- **Places**: Per-key quota; limit requests per user per day (e.g. 10) to avoid cost. **Our API**: Rate limit /context/location (e.g. 20/min per user).

---

## 22. Security / Compliance Requirements

- **HTTPS**: Geolocation only over secure context. **Consent**: Required; document in privacy policy. **No history**: Do not store precise location; use only for current prompt. **API key**: Places key in backend only.

---

## 23. Auditability / Logging Requirements

- **Log**: Request received (user_id, has_venue_type); do not log lat/lng. **Consent**: Log consent grant/withdrawal (user_id, location_for_prompts).

---

## 24. Observability / Monitoring

- **Metrics**: Location requests per day; Places API success/fail; consent rate. **Alerts**: Places API errors.

---

## 25. UI / UX Implications

- **Consent**: Clear explanation (“We’ll use your location to suggest phrases for where you are (e.g. café). We don’t store your location.”). **Denied**: App works without location; generic prompts. **Loading**: “Getting your location…” then “Here are phrases for a café.”

---

## 26. Admin / Operations Implications

- **Places quota**: Monitor usage; set per-user limit. **Consent**: Support can confirm user’s consent flag; cannot see location.

---

## 27. API / Adapter Design

- **Endpoint**: POST /v1/context/location { lat?, lng?, venue_type? }. Returns 200 (backend may return derived venue_type or nothing). **PlacesAdapter**: reverseGeocode(lat, lng) → { venue_type } (optional). **Service**: LocationService.getVenueType(lat?, lng?, venue_type?) → venue_type or null; uses PlacesAdapter if coordinates and provider set.

---

## 28. Event / Async Flow Design

- **Sync**: Single request/response. **Prompt generation**: Uses venue_type in same request (reflection) or next request; no async queue for location.

---

## 29. Data Persistence Requirements

- **Consent**: location_for_prompts in profile or consent table. **No** persistence of lat/lng or venue history (policy). **Optional**: Cache venue_type for session (Redis, TTL 1h) to avoid repeated Places calls.

---

## 30. Local Development Setup

- **Backend**: Accept venue_type in body (e.g. “cafe”); no Places key required. **Client**: Skip geolocation or use Chrome “Override geolocation” in dev tools. **Places**: Mock adapter returning “cafe” or use test key with limited quota.

---

## 31. Testing Requirements

- **Unit**: LocationService with mock PlacesAdapter; assert venue_type returned. **Integration**: POST with venue_type → prompt builder receives it. POST with lat/lng and mock Places → assert venue_type in prompt. **E2E**: Optional; grant location → assert prompt mentions venue.

---

## 32. Rollout / Feature Flag Strategy

- **Feature flag**: “location_aware_prompts_enabled” to enable/disable; “places_api_enabled” to use reverse geocode. **Consent**: Required before any location use.

---

## 33. Example Scenarios

**With consent**: Client getCurrentPosition → send (52.37, 4.89) → Backend Places → “cafe” → Prompt “User at café” → LLM returns café phrases. **Without consent**: Client does not send location; backend prompt has no venue. **Client sends venue_type**: Backend skips Places; uses “supermarket” in prompt.

---

## 34. Edge Cases

- **High accuracy timeout**: Use cached position (maxAge) or give up; default prompt. **Places returns multiple**: Pick first or “establishment” type. **Coordinates in water/abroad**: Still return a type or “unknown”; do not fail.

---

## 35. Recommended Technical Design

- **Client**: Single getCurrentPosition on “daily” or “reflection” screen; send once per session or per request; respect consent. **Backend**: Optional PlacesAdapter; LocationService.getVenueType; inject into prompt builder. **Privacy**: No DB column for coordinates; optional coarse grid (e.g. city) if product needs analytics only.

---

## 36. Suggested Implementation Phasing

- **Phase 1**: Client sends venue_type only (user picks or client uses browser geolocation + simple mapping); backend uses in prompt; consent flag. **Phase 2**: Backend reverse geocode (Places) when client sends lat/lng; no storage. **Phase 3**: Optional analytics (coarse region only) if needed.

---

## 37. Summary

**Geolocation / place context** is **strategy-based** (Browser API + optional Google/Mapbox Places). **Consent required**; **no long-term storage** of precise location. **Local**: Send venue_type only or mock position. Used for **location-aware prompts** (FD-08). Optional feature; medium priority.
