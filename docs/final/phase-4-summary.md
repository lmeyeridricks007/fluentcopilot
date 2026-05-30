# Phase 4 Summary: Feature Domain Breakdown

## What Changed

- **v1** was reviewed and audited; Document Info table format was corrected. No v2 required; v1 met threshold (95%+ confidence, all categories ≥9).

## Major Design Decisions

1. **12 feature domains** (FD-01–FD-12) cover onboarding, core lessons, scenarios, voice tutor, listening, pronunciation, daily reflection, location, exam prep, gamification, AI feedback, entitlements.
2. **Free-tier caps**: Examples (3–5 lessons/day, 1–2 scenarios/week); exact values configurable (OQ-5).
3. **Premium-only**: Voice tutor, pronunciation, daily reflection, full exam prep; scenarios unlimited (fair use) on premium.
4. **Consent and permissions**: Microphone, location, photo, notifications, AI context—each optional and withdrawable; gates for FD-04, FD-06, FD-07, FD-08.
5. **Traceability**: Every domain references BFRs, IS-* where relevant, and Architecture components.

## Remaining Open Questions

- Exact free caps (product config).
- Location behavior on mobile web (FD-08).
- ONA depth in exam prep (FD-09).
