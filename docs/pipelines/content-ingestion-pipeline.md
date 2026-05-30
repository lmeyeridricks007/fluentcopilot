# Content Ingestion Pipeline — Manual and Import

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

This document defines the **content ingestion pipeline**: how manually authored or imported content (vocabulary, grammar, scenarios, lessons, exercises) enters the system, is validated, and reaches draft state for review.

---

## 2. Scope

- **In scope**: Inputs (authoring UI, CSV/JSON import); validation steps; draft creation; failure modes; automation opportunities.
- **Out of scope**: Review and publish (see content-review-process, content-release-process); AI generation (see ai-content-generation-pipeline).

---

## 3. Inputs

| Input type | Source | Format |
|------------|--------|--------|
| **Manual authoring** | CMS or admin UI | Form → API → DB |
| **CSV import** | Vocabulary, grammar lists | CSV with column mapping |
| **JSON import** | Lessons, scenarios, bulk content | JSON matching schema |
| **Reference import** | CEFR lists, licensed data | Script + mapping config |

---

## 4. Pipeline Steps

1. **Receive**: Ingest file or API payload; validate format (CSV columns, JSON schema).
2. **Map**: Map source fields to our schema (locale, lemma, cefr_level_id, etc.); resolve IDs (cefr_level by code, scenario_category by code).
3. **Validate**: Run content-validation-pipeline (schema, length, safety, refs). Per-item or batch.
4. **Create draft**: Insert or update rows with status=draft; set source=authored or imported; set version=1 or increment.
5. **Report**: Return success count, validation errors per row, and error file for failed rows.
6. **Optional**: Notify reviewer or add to review queue.

---

## 5. Validation Checkpoints

- **Pre-ingest**: File encoding (UTF-8); row count within limit; required columns present.
- **Per-row**: Schema validation; length; safety (no PII, moderation); refs exist (cefr_level_id, scenario_category_id). See content-quality-rules and content-validation-pipeline.
- **Post-ingest**: Optional duplicate check (e.g. same lemma+locale); conflict resolution (skip, overwrite, or new version).

---

## 6. Failure Modes

| Failure | Behavior |
|---------|----------|
| **Invalid format** | Reject entire file; return error. |
| **Validation errors on subset** | Create valid rows; return list of failed rows with reasons; optional partial rollback. |
| **Ref not found** | Fail row; report "cefr_level X not found"; do not create. |
| **Duplicate** | Per policy: skip, overwrite (new version), or error. |
| **DB error** | Rollback batch; return error; retry with smaller batch optional. |

---

## 7. Automation Opportunities

- **Scheduled import**: Cron to pull from external source (e.g. CEFR list URL) and run ingestion.
- **Webhook**: CMS webhook on "submit" to trigger validation and draft create.
- **Bulk mapping UI**: Admin UI to upload CSV and map columns once; save mapping for reuse.
- **Idempotency**: Same file hash or import_id → skip or version; avoid duplicate rows.

---

## 8. Outputs

- **DB**: New or updated rows in vocabulary_terms, grammar_rules, scenarios, lessons, exercises (status=draft).
- **Report**: Count created, count failed, error details (row index, field, message).
- **Optional**: Audit log (import_id, source_file, actor, timestamp).

---

## 9. Dependencies

- **content-validation-pipeline.md**: Validation steps.
- **content-quality-rules.md**: Rules.
- **database-schema.md**: Target tables.
- **content-entities.md**: Entity states.
