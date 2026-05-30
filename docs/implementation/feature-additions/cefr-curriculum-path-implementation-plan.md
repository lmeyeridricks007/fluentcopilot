# Implementation plan: CEFR curriculum path (E-16)

**Feature slug**: `cefr-curriculum-path`  
**Status**: Approved for execution (see `final/cefr-curriculum-path-implementation-final.md`)  
**Deep-dive**: `docs/features/deep-dives/cefr-curriculum-path.md`

---

## 1. Document map

| Artifact | Purpose |
|----------|---------|
| [cefr-curriculum-path-epic.md](cefr-curriculum-path-epic.md) | Epic scope, dependencies, workstreams |
| [cefr-curriculum-path-stories.md](cefr-curriculum-path-stories.md) | User stories + acceptance criteria |
| [cefr-curriculum-path-tasks.md](cefr-curriculum-path-tasks.md) | Frontend, backend, DB, integration, jobs |
| [cefr-curriculum-path-qa-scenarios.md](cefr-curriculum-path-qa-scenarios.md) | QA test scenarios |
| [cefr-curriculum-path-demo-data.md](cefr-curriculum-path-demo-data.md) | Seeds and mocks |

---

## 2. Dependencies (cross-epic)

| Epic | Blocking? | Notes |
|------|-----------|--------|
| E-01 Auth | Yes | All routes authenticated |
| E-02 Profile | Yes | Default level; Settings surface |
| E-03 Core Lessons | Yes | `lessons`, `lesson_progress`, cap |
| E-13 Entitlements | Yes | Cap; optional revision limits |
| E-14 Personalization | No (MVP) | Optional BFF merge |
| E-11 Gamification | No | Optional bonus events |

---

## 3. Phased delivery

| Phase | Goal | Stories | Exit |
|-------|------|---------|------|
| **P0a** | Schema + import | CUR-01, CUR-02 | Manifest in DB; path API returns data in Postman |
| **P0b** | Study context + Path UI | CUR-03, CUR-04 | User changes level; Path tab works |
| **P0c** | Today + Home | CUR-05 | Home shows queue; taps open lesson |
| **P1a** | Attempts + weak | CUR-06, CUR-07 | Weak list populates |
| **P1b** | Revision | CUR-08, CUR-09 | Session + submit; no usage increment |
| **P1c** | Flag + analytics + optional onboarding/BFF | CUR-10, CUR-11, CUR-12 | Rollout safe |

---

## 4. Definition of done (epic)

- [ ] All P0 stories meet acceptance criteria on staging.
- [ ] All tasks in `cefr-curriculum-path-tasks.md` for shipped phases marked done in tracker.
- [ ] Migrations applied; rollback documented.
- [ ] `docs/implementation/apis.md` §1A matches implemented behaviour; **OpenAPI / Postman collection** updated for new routes.
- [ ] QS-CUR-01–10 passed or waived with ticket.
- [ ] Demo users/scenarios from `cefr-curriculum-path-demo-data.md` work locally.
- [ ] Feature flag verified on/off.
- [ ] No P0 security issues (IDOR on path/attempts).

---

## 5. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| `external_id` mismatch | CUR-D04 validation script in CI |
| Cap confusion | Copy on Today cards; QA QS-CUR-05 |
| Performance on path | CUR-B09 cache; index review |

---

## 6. Iteration workflow (this plan)

1. **Create** — v1 artifacts (this folder).  
2. **Review v1** — `reviews/cefr-curriculum-path-impl-review-v1.md`.  
3. **Improve** — gaps closed in stories/tasks.  
4. **Review v2** — `reviews/cefr-curriculum-path-impl-review-v2.md`.  
5. **Audit** — `audits/cefr-curriculum-path-impl-audit.md`.  
6. **Finalize** — `final/cefr-curriculum-path-implementation-final.md`.

---

## 7. Version history

| Version | Note |
|---------|------|
| v1 | `versions/cefr-curriculum-path-impl-v1.md` |
