# Deep-dive spec audit — CEFR curriculum path

**Date**: 2026-03-25  
**Spec**: `docs/features/deep-dives/cefr-curriculum-path.md`

## Consistency checks

| Check | Result |
|-------|--------|
| vs `docs/features/deep-dives/final/core-lessons.md` (progress, cap, quiz) | Pass — extends, does not replace |
| vs `docs/implementation/data-model.md` §1A | Pass — tables match |
| vs `docs/feature-extensions/cefr-curriculum-path-overview.md` | Pass — same scope boundaries |
| vs codebase routes (`src/app/app/*`) | Pass — screen list accurate (Next.js App Router) |
| vs `docs/final/feature-domain-breakdown.md` FD-02 alternate workflow | Pass |

## Follow-ups (non-blocking)

- [x] Route table appended to `docs/implementation/apis.md` §1A (schemas remain in deep-dive §14).
- [ ] Add OpenAPI fragment or link when API gateway exposes routes.

**Verdict**: **Pass** — spec may be marked final for engineering use.
