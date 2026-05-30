# QA scenarios: CEFR curriculum path (E-16)

**Source**: `docs/features/deep-dives/cefr-curriculum-path.md`, stories CUR-01–CUR-12  
**Related**: `docs/implementation/qa-scenarios.md` (append cross-reference)

---

## Regression guards

- Completing a lesson still updates XP/streak (E-11) and `lesson_progress` (E-03) exactly as before.
- Free user at cap still receives 403 on **new** lesson start from Path/Today.
- Resume in-progress lesson never blocked by cap.

---

## Functional scenarios

### QS-CUR-01 — Path visible with manifest

| Step | Action | Expected |
|------|--------|----------|
| 1 | Enable `curriculum_path_enabled`; seed A2 manifest + lessons | — |
| 2 | Log in as user with default study level A2 | — |
| 3 | Open Learn → Path | Units and lessons render; first lesson `not_started` or `in_progress` |
| 4 | GET `/v1/curriculum/path` | `next_lesson` matches first incomplete in manifest order |

### QS-CUR-02 — Today queue ordering

| Step | Action | Expected |
|------|--------|----------|
| 1 | User has `in_progress` on lesson 2, lesson 1 completed | — |
| 2 | GET `/v1/curriculum/today` | First item `role=continue` for lesson 2 |
| 3 | User has no in_progress; lessons 1–3 not started | Items are next N per `daily_lesson_target` |

### QS-CUR-03 — Study level change

| Step | Action | Expected |
|------|--------|----------|
| 1 | Complete 2 lessons on A2 path | — |
| 2 | PATCH level to B1 (manifest exists) | 200; path reload shows B1 units |
| 3 | Switch back to A2 | Previous completions still shown |

### QS-CUR-04 — Invalid / missing manifest

| Step | Action | Expected |
|------|--------|----------|
| 1 | PATCH study level to X9 (invalid) | 400 |
| 2 | Level valid but no published manifest | Empty path + user-facing copy OR 404 per API spec |

### QS-CUR-05 — Cap from Today

| Step | Action | Expected |
|------|--------|----------|
| 1 | Free user at daily cap | — |
| 2 | Tap Today item (new lesson) | 403 modal; item cannot start |
| 3 | Tap Today item (resume in_progress) | 200; lesson loads |

### QS-CUR-06 — Exercise attempts

| Step | Action | Expected |
|------|--------|----------|
| 1 | Complete quiz with 2 wrong, 1 right | POST attempts recorded |
| 2 | GET weak-areas before threshold | Empty or tag not listed |
| 3 | Repeat wrongs until ≥ threshold | Tag appears in weak-areas |

### QS-CUR-07 — Revision happy path

| Step | Action | Expected |
|------|--------|----------|
| 1 | User completed ≥1 lesson with exercises | — |
| 2 | POST revision session | 200 + exercises |
| 3 | Submit all correct | Session completed; attempts have `revision_session` |
| 4 | Check usage_counts | `lessons_completed_count` unchanged |

### QS-CUR-08 — Revision not enough content

| Step | Action | Expected |
|------|--------|----------|
| 1 | New user, no completed lessons | POST revision returns 422/404 with message |

### QS-CUR-09 — Feature flag off

| Step | Action | Expected |
|------|--------|----------|
| 1 | Disable flag | Path tab hidden; Today hidden |
| 2 | Hit API directly (if exposed) | 404 or gateway block |

### QS-CUR-10 — Content gap (CUR-02)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Manifest references unpublished lesson | App shows error for slot or skips; `next_lesson` still defined if later valid lesson exists |

---

## Non-functional checks

- Path GET p95 within NFR target (deep-dive §21) under load test with Redis warm.
- No PII leakage: user A cannot read user B path/attempts (403/404).

---

## Exit criteria for QA sign-off

- [ ] All scenarios QS-CUR-01–10 pass on staging.
- [ ] Smoke E-03 catalog + complete still passes.
- [ ] Analytics events received in test sink (if enabled).
