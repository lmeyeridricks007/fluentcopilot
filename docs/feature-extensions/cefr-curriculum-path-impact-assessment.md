# CEFR curriculum path — impact assessment

**Slug**: `cefr-curriculum-path`  
**Last updated**: 2026-03-25

---

## 1. Files / docs likely needing updates

| Document | Update type |
|----------|-------------|
| `docs/product/user-workflows-journeys-v1.md` | New journey §4A; daily loop cross-reference |
| `docs/features/deep-dives/feature-index.md` | New feature block + sub-features |
| `docs/architecture/product-architecture-overview-v1.md` | Lesson Engine + capability map |
| `docs/implementation/data-model.md` | New §1A curriculum & path tables |
| `docs/implementation/apis.md` | New endpoints (when contracted) |
| `docs/implementation/features/core-lessons.md` | Cross-link; catalog default filter |
| `docs/implementation/features/personalization-recommendations.md` | Path-aware recommendation |
| `docs/implementation/final/implementation-index.md` | Link to extension + new feature impl doc |
| `docs/implementation/features/cefr-curriculum-path.md` | **Created** — implementation checklist |
| `docs/ui/ui-feature-implementation-plan.md` | New UI row |
| `docs/integrations/deep-dives/per-feature/feature-integration-index.md` | New row + reverse map |
| `docs/integrations/deep-dives/per-feature/core-lessons.md` | Note curriculum/CDN |
| `docs/demo-data/demo-data-feature-map.md` | Feature → demo mapping |
| `docs/demo-data/local-demo-data-usage.md` | Optional: curriculum loader note |
| `docs/curriculum/populating-level-curriculum.md` | Optional cross-link to extension |
| `docs/final/feature-domain-breakdown.md` | Optional footnote in FD-02 (not required for extension) |

---

## 2. Modules requiring extension

| Layer | Module / area | Extension |
|-------|----------------|-----------|
| **Frontend** | `LessonDiscoveryPage`, `HomePage`, onboarding/settings | Path UI, Today queue, revision entry |
| **Frontend** | Stores / TanStack Query | Queries for manifest, path state, daily plan |
| **Backend** | Lesson Engine / BFF | Curriculum read APIs; merge with published lessons |
| **Backend** | Profile | `active_study_level`, `daily_goal` |
| **Backend** | Progress | Aggregates; weak signals ingestion from quiz |
| **Content** | Importer or CMS adapter | `manifest.json` + `units/*.json` + `lessons/*.json` |
| **Analytics** | Client + server | New event names and properties |

---

## 3. Dependencies

| Dependency | Reason |
|------------|--------|
| Authentication | All path state is per-user |
| Published `lessons` rows (or loader) | Path references `lesson_id` / `external_id` |
| Existing `lesson_progress` | Source of truth for completion and resume |
| Entitlements (optional) | If revision or extra daily items are premium |
| Gamification | Optional hooks for plan/revision completion |

**Ordering**: Profile + lesson catalog stable IDs → curriculum tables → user state → UI → revision.

---

## 4. Migration impact

| Aspect | Assessment |
|--------|------------|
| **DB** | Additive migrations only for MVP; nullable FKs from units to lessons until content imported |
| **Existing users** | Backfill: set `active_study_level` = profile.current_level; first path = manifest order |
| **Lesson IDs** | If current demo uses numeric string IDs (`"1"`), align importer to map `external_id` = `a2-u01-l01` or migrate catalog |
| **Rollback** | Feature flag `curriculum_path_enabled`; fallback to flat catalog |

---

## 5. Rollout complexity

| Phase | Complexity | Notes |
|-------|------------|--------|
| **Phase A** — Read-only path UI | Low | Show units/lessons from static JSON in dev |
| **Phase B** — Persisted state + daily queue | Medium | Requires API + DB |
| **Phase C** — Weak signals | Medium | Depends on structured quiz/exercise results |
| **Phase D** — Revision generator | Medium–High | Content safety + variety |

**Overall**: **Medium** — mostly orchestration over existing FD-02 building blocks; highest risk is ID alignment and UX clarity for two level concepts.

---

## 6. Cross-reference

- [Feature overview](cefr-curriculum-path-overview.md)
- [Final sign-off](final/cefr-curriculum-path-final.md)
