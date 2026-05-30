# Feature: Onboarding & Profile (E-02)

**Epic**: E-02 Onboarding & Profile  
**Source**: docs/features/deep-dives/onboarding-and-profile.md, feature-index

---

## Feature Purpose

Collect user profile (language, country, family context, occupation, goals, level); manage consent (microphone, location, notifications, photo, AI context); support onboarding resume; and trigger first recommendation at completion.

---

## Feature Scope

- **In scope**: Multi-step profile form (profile-steps); save/update profile (profile-persistence); consent per type grant/withdraw (consent-management); partial save and resume (onboarding-resume); first/next lesson recommendation at completion (first-recommendation).
- **Out of scope**: Content authoring; full Personalization engine (E-14).

---

## Dependencies

- E-01 Authentication.

---

## Sub-Features

profile-steps, profile-persistence, consent-management, onboarding-resume, first-recommendation.

---

## Feature Completion Checklist

- [ ] UI: Onboarding steps (language, level, goals, consent toggles); Settings profile edit; consent in settings.
- [ ] API: GET/PATCH /me or /profile; GET/PATCH /consent; onboarding_completed flag.
- [ ] Backend: Profile service; consent storage; validation; first recommendation (call Personalization or Lesson Engine).
- [ ] Database: profiles (or extended users); consent_preferences (user_id, consent_type, granted).
- [ ] Seed/demo: Default consent values; sample profile.
- [ ] Tests: Save profile, resume onboarding, consent grant/withdraw, first recommendation returned.
