# Location-Aware Prompts — Per-Feature Integration Specification

**Feature**: FD-08 Location-Aware Prompts  
**Source**: docs/final/feature-domain-breakdown.md §10

---

## 1. Purpose

Specifies **integrations used by Location-Aware Prompts**: geolocation (browser API) and optional Places API for venue type; entitlement (optional); analytics. No long-term location storage; consent required (BR-3).

---

## 2. Feature Reference

- **Domain**: FD-08. **User goal**: When near a venue (café, supermarket), receive suggested phrase. **Integration dependencies**: Client geolocation API; optional places API for venue types.

---

## 3. Integrations Used (Summary)

| Integration | Role | Criticality |
|-------------|------|-------------|
| **Geolocation / Places** | getCurrentPosition (client); optional reverse geocode (backend or client) → venue_type for phrase selection | High (geolocation); Medium (Places) |
| **Cache / Entitlements** | Optional: gate feature by tier; respect notification/location preferences | Medium |
| **Analytics** | location_prompt_shown, location_prompt_dismissed, location_feature_enabled/disabled | High |

---

## 4. Per-Integration Detail

- **Geolocation**: Client gets position (with consent); sends lat/lng or derived venue_type to backend. Backend may call Places (reverse geocode) or accept venue_type from client. Phrase prompt built from venue_type. See [geolocation-place-context.md](../../geolocation-place-context.md). **Local**: Mock position or send venue_type only; optional Places mock.
- **Entitlements**: Optional gate (e.g. premium or free with limit). See [entitlements-subscription.md](./entitlements-subscription.md). **Local**: Redis + seed.
- **Analytics**: Events for prompts and feature toggle. See [analytics-provider.md](../../analytics-provider.md).

---

## 5. Implementation Implications

- **Backend**: Optional LocationService (reverse geocode); phrase resolver by venue_type; consent check. **DB**: consent (location_for_prompts); no persistent location. **UI**: Consent prompt; “Location tips” toggle; in-app card or notification with phrase. **Testing**: Mock geolocation/venue_type; consent on/off; no Places key in local.

---

## 6. Summary

Location-Aware Prompts uses **geolocation** (browser) and optional **Places**, **entitlements** (optional), and **analytics**. Consent and no long-term location storage are required; see [geolocation-place-context.md](../../geolocation-place-context.md).
