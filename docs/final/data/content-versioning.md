# Content Versioning — Rules and Lifecycle

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

This document defines **versioning rules** for lessons, scenarios, exercises, prompts, vocabulary, grammar, pronunciation, and exam content: how versions are created, stored, and how updates affect existing users and runtime generation.

---

## 2. Scope

- **In scope**: Version semantics (linear or major/minor); storage (content_versions table, version column); draft vs published; impact on learners (in-progress vs new sessions); rollback.
- **Out of scope**: Source control for content files (e.g. Git); API versioning (backend doc).

---

## 3. Versioning Model

| Content type | Version storage | Strategy |
|--------------|-----------------|----------|
| **Lesson** | version INT on lessons; snapshot in content_versions | Increment on any edit; new row or update with version+1; published_at on first publish |
| **Scenario** | version INT; content_versions for history | Same as lesson |
| **Exercise** | version INT; optional content_versions | Increment when payload or template ref changes |
| **Vocabulary / Grammar / Pronunciation** | version INT; content_versions optional | Increment on edit; verified state can require new version |
| **Prompt template** | version INT; immutable after active | New version = new row or new version_number; old version retained for audit |
| **Exam task** | version INT | Same as lesson |

**Rule**: Never overwrite a version that has been published. New edit → new version number; optionally copy to content_versions as snapshot before overwriting current (if not keeping full history in main table).

---

## 4. Version Numbering

- **Linear integer**: 1, 2, 3, ... per entity. Simple; sortable.
- **Optional major.minor**: Major = breaking (e.g. structure_schema change); minor = content-only. Prefer linear unless product needs semantic version for content.

**Recommendation**: Linear integer; `version` column on each content table; `content_versions` table stores (entity_type, entity_id, version_number, snapshot_payload, created_at, created_by).

---

## 5. Draft vs Published

| State | Meaning |
|-------|---------|
| **draft** | Editable; not visible to learners; not used in recommendations or runtime generation |
| **in_review** | Submitted for review; not yet published |
| **published** | Visible to learners; used in catalog, recommendations, and runtime; can have multiple versions (current = highest version with status published) |
| **archived** | No longer shown in catalog; historical completions still valid; can be restored to published |

**Current version**: For each entity, "current" is the row with highest `version` where `status = 'published'` (or single row per id if only one version per id and version number is on separate version table). Draft and in_review are not "current" for learner-facing queries.

---

## 6. Impact on Existing Users

| Scenario | Behavior |
|----------|----------|
| **Learner has lesson in progress** | Option A: Continue with version they started (store lesson_version_id in progress). Option B: Always use current version (simpler; may change content mid-session if rare). **Recommendation**: Store version at session start; complete using that version. |
| **Learner has not started** | Always serve current published version. |
| **Recommendation engine** | Always use current published version for "next lesson" and catalog. |
| **Runtime-generated lesson** | Generated from current vocabulary, scenario, prompt templates; cache key can include template/prompt version to invalidate when prompt changes. |
| **Content deprecated (archived)** | Remove from catalog and recommendations; do not delete progress or completion history. |

---

## 7. Rollback

- **Rollback to previous version**: Copy snapshot from content_versions back to main table (or set current pointer to previous version_number); set status to published. Requires content_versions to store full snapshot.
- **Who can rollback**: Per content-governance; typically admin or content lead; audit log required.

---

## 8. Retention of Versions

- **content_versions**: Retain all version snapshots for audit and rollback. Retention policy: indefinite for published versions; optional purge of draft-only versions after 1 year.
- **Main table**: Keep only current row per entity (or current + previous if dual-row strategy). No retention limit on version number.

---

## 9. Localization and Versioning

- Each locale has its own row (or entity_id) for lesson/scenario/vocabulary. Versioning is per entity (per locale). Changing Dutch lesson does not change English variant.
- Translation workflow: When adding a new locale for existing content, create new entity with version 1; link via external_id or parent_content_id if needed.

---

## 10. Dependencies

- **database-schema.md**: content_versions table.
- **content-entities.md**: Entity states and lifecycle.
- **content-governance.md**: Who can publish, archive, rollback.
