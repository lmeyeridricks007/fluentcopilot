# Location-Aware Prompts — Deep-Dive Specification

## 1. Purpose

Location-Aware Prompts suggest Dutch phrases when the user is near a relevant venue (e.g. café, supermarket). The feature is optional, requires explicit location consent, and can be disabled anytime (BR-3). Location is not persisted long-term; used only for trigger (retention policy). This spec covers FD-08: triggers, consent, UX, and integration with Profile and optional places data.

## 2. Core Concept

- **Trigger**: User has location and feature enabled; app detects proximity to a configured venue type (geofence or similar).
- **Prompt**: In-app card or notification: e.g. “Try: Mag ik een cappuccino alstublieft?”
- **Privacy**: Consent required (BFR-009); user can disable anytime (BR-3); location not stored long-term (FD08-FR-003).

## 3. Why This Feature Exists

- **Differentiation**: Unique “in the moment” learning; optional engagement.
- **Compliance**: BR-3 ensures user control and consent; short retention supports privacy.

## 4. User / Business Problems Solved

- Learners get contextually relevant phrases when they might use them.
- Business offers optional engagement without compromising privacy expectations.

## 5. Scope

### 6. In Scope

- Trigger phrase suggestion when user is near configured venue type and consent granted (FD08-FR-001).
- User can enable/disable feature and withdraw location consent (BR-3) (FD08-FR-002).
- No long-term persistence of precise location; use only for trigger (FD08-FR-003).
- Venue types: e.g. café, supermarket, pharmacy; configurable list and phrases per type.
- UX: In-app card or notification when trigger fires; user may dismiss or tap to practice (optional flow).
- Analytics: location_prompt_shown, location_prompt_dismissed, location_feature_enabled/disabled.

### 7. Out of Scope

- Full navigation or maps; only “near venue” detection and phrase display.
- Persisting location history; only ephemeral use for trigger.
- Offline geofencing (optional future); assume network for venue lookup or client-side geofence config.

## 8. Main User Personas

- **Engaged learner**: Enables “Location tips” for contextual practice.
- **Privacy-focused**: Disables or never enables; core app still works.

## 9. Main User Journeys

| Journey | Steps |
|--------|--------|
| **Enable** | Settings → Location tips → On; grant location consent (if not already). |
| **Receive prompt** | App open (or on next open if no background); near café → Card: “Try: [phrase]”; dismiss or tap to practice. |
| **Disable** | Settings → Location tips → Off; or withdraw location consent; no more prompts. |

## 10. Triggering Events / Inputs

- **Enable/disable**: User toggles in Settings; PATCH /consent or PATCH /settings (location_tips_enabled, location consent).
- **Proximity**: Client has location (from OS); compares to venue config (geofence radii or places API); when inside, request phrase for venue type (optional API: GET /location/prompt?venue_type=cafe&lat=&lng= or client-only config).
- **Display**: Client shows phrase (from API or bundled config); user dismisses or taps; analytics sent.

## 11. States / Lifecycle

- **Disabled**: Feature off or location consent denied; no prompts.
- **Enabled**: Consent granted; app can evaluate proximity when open (or on next open in mobile web if no background).
- **Prompt shown**: Card/notification visible; user dismisses or interacts.
- **No long-term state**: Location not stored; only “last prompt” or “dismissed” for UX (e.g. don’t re-show same phrase for same venue within N minutes) — optional, can be client-only.

## 12. Business Rules

- **BR-3**: Consent required; user can disable anytime; feature optional.
- **Retention**: Do not persist precise location long-term; use only for trigger (FD08-FR-003).
- **Premium or free**: TBD (FD-08); optional premium or free with limits; document in product config.

## 13. Configuration Model

- **Venue types**: List (café, supermarket, pharmacy, etc.); each has phrase(s) or phrase_key for i18n.
- **Geofence**: Radius per venue type (e.g. 100 m) or use places API to detect “at place.” Config in client or from API (e.g. GET /location/venue-config).
- **Phrases**: Stored per venue type and locale; or phrase keys; optional level (e.g. A1 phrase for café).
- **Cooldown**: Optional; don’t show same venue type within N minutes (client or server).

## 14. Data Model

- **Server**: Optional venue_config (venue_type, phrase_key or phrase_text, locale, level); or phrases bundled in client. No table for user location.
- **Consent**: location_tips_enabled (boolean) and location consent in Profile/consents (FD-01).
- **Analytics**: location_prompt_shown (venue_type, user_id); location_prompt_dismissed; location_feature_enabled/disabled. No lat/lng in analytics (or only coarse “region” if needed for product).

## 15. Read Model / Projection Needs

- **Settings**: Client needs location_tips_enabled and location consent to show toggle and evaluate trigger.
- **Phrases**: Per venue type; can be static config or API that returns phrase for venue_type (and optional level/locale) without receiving precise location (e.g. client sends venue_type only after local geofence fires).

## 16. APIs / Contracts

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| GET | `/v1/location/venue-config` | Optional: list venue types and phrase keys or phrases | Query: locale, level? | 200 { venue_types: [{ type, phrase_key or phrase }] } |
| GET | `/v1/location/prompt` | Optional: get phrase for venue type (client sends type after detecting proximity) | Query: venue_type, locale?, level? | 200 { phrase, phrase_key }; 403 consent/feature off |
| PATCH | `/v1/settings` or consent | Enable/disable location tips; location consent | { location_tips_enabled: bool } or consent | 200 |

**Alternative**: All phrases in client bundle; no server call for phrase; only consent and analytics to server. Then API is minimal: PATCH consent/settings; POST analytics (prompt_shown, dismissed).

## 17. Events / Async Flows

- **location_prompt_shown**: venue_type, user_id (analytics).
- **location_prompt_dismissed**: venue_type, user_id (analytics).
- **location_feature_enabled** / **location_feature_disabled**: user_id (analytics).
- No critical async; trigger is client-side or single request when proximity detected.

## 18. UI / UX Design

- **Settings**: Toggle “Location tips”; explanation “Get phrase suggestions when you’re near a café, supermarket, etc.”; link to privacy; if toggle on, request location permission (OS) and set consent.
- **Prompt**: Card or notification: “You’re near a café. Try: [phrase].” Dismiss (X) or “Practice” (optional: open practice flow).
- **Battery/privacy**: Explain clearly; “We only use location when the app is open to show tips. You can turn this off anytime.”
- **Mobile web**: If no background location, “We’ll show tips when you open the app near a supported place.”

## 19. Main Screens / Components

- **Settings**: LocationTipsToggle; consent text; link to privacy.
- **LocationPromptCard**: In-app card with phrase and venue type; dismiss; optional “Practice” CTA.
- **Optional**: LocationPermissionPrompt (OS); only when user enables feature.

## 20. Permissions / Security Rules

- **Consent**: Backend does not store location; if API receives location (e.g. for server-side geofence), do not persist; use only to return phrase and discard.
- **User scope**: Only user’s own settings and analytics; no sharing of location.
- **BR-3**: Backend must respect location_tips_enabled and location consent; return 403 for prompt if disabled or consent withdrawn.

## 21. Notifications / Alerts / Side Effects

- **In-app**: Card when prompt triggers; no required push (push would require background location or separate trigger).
- **Disable**: When user disables, stop evaluating location; no further prompts until re-enabled.

## 22. Integrations / Dependencies

- **Profile / Consent**: location consent and location_tips_enabled (FD-01); read for gate and settings.
- **Optional**: Places API (e.g. Google Places) for “at venue” detection; or static geofence config (lat/lng per venue type) — client or server.
- **i18n**: Phrases per locale; BCP 47.
- **No dependency on Entitlements** if feature is free; if premium, check entitlement before returning phrase.

## 23. Edge Cases / Failure Cases

- **Location denied**: Feature off; show “Enable location in device settings to get tips” if user enabled toggle but OS denied.
- **Background limits (mobile web)**: No background location; only trigger when app opens; “When you open the app near a café, we’ll show a phrase.”
- **No venue config**: If server returns empty config, client shows nothing or fallback phrase.
- **Consent withdrawn**: Immediately stop showing prompts; backend returns 403 if client still requests prompt.
- **Battery**: Document that location use is minimal (only when app open); allow disable anytime.

## 24. Non-Functional Requirements

- **Privacy**: Location used in client or minimal server call; no long-term storage (FD08-FR-003).
- **Battery**: Minimize location checks; e.g. throttle or only when app in foreground.
- **Mobile web**: May be “on next open” only if no background; document in UX.

## 25. Analytics / Auditability Requirements

- **Events**: location_prompt_shown, location_prompt_dismissed, location_feature_enabled, location_feature_disabled. Include venue_type, user_id; no precise location in events.
- **Audit**: Consent and disable events for compliance (BR-3).

## 26. Testing Requirements

- Unit: Consent and feature flag check; phrase selection by venue_type.
- Integration: GET venue-config; GET prompt (with consent); 403 when disabled; PATCH settings.
- E2E: Enable in settings; mock “near café”; see card; dismiss; disable and confirm no prompt.

## 27. Recommended Architecture

- **Client-heavy**: Geofence or proximity logic in client; optional server only for phrase config and analytics. Reduces server handling of location.
- **Server**: If used, endpoint returns phrase for venue_type (and locale/level); does not store location; validates consent and feature enabled.

## 28. Recommended Technical Design

- **Phrases**: Either static JSON in client (venue_type → phrase_key) or GET /location/prompt?venue_type=X; prefer minimal server and no location sent to server for privacy.
- **Geofence**: Client uses OS location; compare to list of (venue_type, lat, lng, radius) from config or hardcoded; when inside, show phrase. Config can be fetched once (GET /location/venue-config with no location).

## 29. Suggested Implementation Phasing

- **Phase 1**: Settings toggle and consent; client-only phrase list for 2–3 venue types; show card when mock or simple “near” (e.g. fixed test coordinate); analytics.
- **Phase 2**: Real geofence with config; optional GET /location/prompt; “Practice” CTA; mobile web “on next open” messaging.
- **Phase 3**: More venue types; optional places API; A/B test for engagement.

## 30. Summary

Location-Aware Prompts suggest Dutch phrases when the user is near a venue type (e.g. café), with consent and user control (BR-3). Location is not persisted long-term. Implementation can be client-heavy (geofence + local or minimal API for phrases) to protect privacy. Enable/disable and consent are in Settings; analytics track shown/dismissed and feature on/off. Implementation must enforce consent and no long-term location storage.
