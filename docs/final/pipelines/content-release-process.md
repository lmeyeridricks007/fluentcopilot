# Content Release Process — Publish and Rollout

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

This document defines the **content release process**: how approved content is published, made visible to learners, and rolled out (including cache invalidation, feature flags, and optional phased rollout).

---

## 2. Scope

- **In scope**: Publish action; status update; cache and search index invalidation; optional feature flag or phased rollout; rollback.
- **Out of scope**: Review (content-review-process); deployment of application code (DevOps).

---

## 3. Publish Steps

1. **Pre-condition**: Content in approved state (or in_review with approver action); validation passed.
2. **Publish**: Set status=published; set published_at=now; increment version if not already; optional snapshot to content_versions.
3. **Invalidate**: Invalidate any cache (e.g. lesson catalog, recommendation cache) that includes this content; invalidate search index if applicable.
4. **Notify**: Optional notify recommendation service or search indexer to refresh.
5. **Audit**: Log publish (entity_type, entity_id, version, actor, timestamp).
6. **Optional**: Feature flag or rollout percentage for new content (e.g. show to 10% then 100%); or schedule publish for future time.

---

## 4. Cache and Index Invalidation

| Cache / index | Invalidation |
|---------------|---------------|
| **Lesson catalog** | Invalidate when lesson published or archived; or TTL refresh. |
| **Recommendation** | Invalidate per user when new lesson available; or global refresh. |
| **Runtime lesson cache** | Invalidate when prompt template or vocabulary used in generation changes; or TTL. |
| **Search index** | Reindex published content; remove archived. |
| **Scenario list** | Invalidate when scenario published or archived. |

---

## 5. Phased Rollout (Optional)

- **Feature flag**: New content (e.g. new scenario set) behind flag; enable for 10% → 50% → 100% based on metrics (errors, completion).
- **Schedule**: Publish at scheduled time (e.g. "go live Monday 9am"); job or manual trigger.
- **Locale**: Publish per locale; Dutch first; other locales when ready.

---

## 6. Rollback

- **Unpublish**: Set status=archived; do not delete; invalidate caches so content no longer shown. Learners in progress may complete (use version at start) or see "no longer available".
- **Restore previous version**: From content_versions; set that version as current; publish; audit.
- **Who**: Content lead or admin only; reason required in audit.

---

## 7. Failure Modes

- **DB error on publish**: Retry; if persistent, do not set published; alert.
- **Cache invalidation fail**: Retry; optional eventual consistency; monitor for stale content.
- **Partial publish**: If batch, track which published; retry failed; report.

---

## 8. Dependencies

- **content-entities.md**: status, published_at.
- **content-versioning.md**: content_versions.
- **content-governance.md**: Who can publish.
- **runtime-content-generation.md**: Cache invalidation.
