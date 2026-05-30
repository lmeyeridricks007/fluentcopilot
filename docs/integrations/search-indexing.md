# Search & Content Indexing Integration

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

Specifies **search** for lesson discovery, phrasebook, or content indexing. This integration is **not required for Phase 1**; document explains when it becomes required and recommended approach.

---

## 2. Why It Might Be Needed Later

- **Lesson discovery**: When lesson catalog grows (100s+), users may search by topic, level, or keyword. Currently, recommendations and browse-by-topic may suffice.
- **Phrasebook / glossary**: Future “search phrases” or “find lesson containing X” benefits from full-text search.
- **Exam prep**: Search within exam content by topic.

---

## 3. Decision Status

| Item | Status |
|------|--------|
| Search in Phase 1 | **Not required** — use DB LIKE or simple filter |
| Search in Phase 2 | **Optional** — when catalog and discovery justify |
| Recommended provider | **When required**: Algolia (hosted, EU) or Meilisearch (self-hosted, EU) or Typesense |

---

## 4. When It Becomes Required

- Product decision: “We need search when we have N lessons or when user feedback asks for search.” Typically Phase 2 when content team has 200+ lessons or multiple languages.
- **Condition**: Catalog size, discovery metrics (e.g. “couldn’t find”), or roadmap for phrasebook/search UI.

---

## 5. Recommended Decision for Now

- **Phase 1**: No external search service. Implement lesson list with filters (level, topic, exam tag) and pagination from PostgreSQL. Optional: simple full-text in PostgreSQL (`tsvector`) for admin or internal use only.
- **Phase 2**: Introduce Algolia or Meilisearch; index lessons (id, title, level, topic, excerpt); sync on content publish. Frontend: search component calls our API; backend queries search provider. Credentials: backend-only API key (search key for backend; frontend may get read-only key if provider supports public search key with restrictions).

---

## 6. If Implemented Later: Credentials and Patterns

- **Algolia**: Application ID + Search-Only API Key (can be frontend if restricted to index + security tags). Admin API key backend only for indexing.
- **Meilisearch**: Master key backend; public search key (optional) for frontend with index restriction.
- **Data**: Index only non-PII (lesson metadata, titles, excerpts). No user data in index.
- **Sync**: On lesson create/update/delete, update index (webhook from CMS or job from DB).

---

## 7. Risks and Open Questions

- **Vendor lock-in**: Search APIs are portable (index → query). Migration: re-index in new provider. **Cost**: Per search or per record; monitor at scale. **Open question**: Exact trigger (N lessons, or specific feature request) for Phase 2.
