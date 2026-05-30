# CMS & Content Management Integration

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

Specifies **CMS** for authored lessons, help content, guides, exam prep content, and localized content versioning. This integration is **not required for Phase 1**; document explains when it becomes required and recommended approach.

---

## 2. Why It Might Be Needed Later

- **Authored lessons**: When content team produces lessons in a CMS (rich text, media, structure) instead of DB-only. Enables non-engineers to publish and version content.
- **Help content**: Help center, FAQs, localized.
- **Exam prep**: Structured exam modules with media and questions, edited by curriculum team.
- **Localization**: Content versioned by locale (BCP 47); CMS supports multiple locales.

---

## 3. Decision Status

| Item | Status |
|------|--------|
| CMS in Phase 1 | **Not required** — lessons in PostgreSQL or static JSON |
| CMS in Phase 2 | **Optional** — when content workflow and team justify |
| Recommended provider | **When required**: Sanity or Contentful (headless, EU, API-first) |

---

## 4. When It Becomes Required

- **Condition**: Content team exists; need for visual editing, versioning, and workflow (draft → review → publish). Or: multi-language content at scale (many locales) where CMS localization features reduce custom code.
- **Trigger**: Product/Content decision: “We are moving lesson authoring to CMS as of [date].”

---

## 5. Recommended Decision for Now

- **Phase 1**: Store lesson and content in **PostgreSQL** (or JSON in DB, or static files in repo). Backend serves via API. No CMS. If content is small, this is sufficient.
- **Phase 2**: Introduce **Sanity** or **Contentful**. Content team authors in CMS; publish triggers webhook or scheduled sync; backend reads from CMS API or from our DB that is synced from CMS. Frontend does not call CMS directly (backend proxies or pre-syncs).

---

## 6. If Implemented Later: Credentials and Patterns

- **Sanity**: Project ID, dataset, API token (read) for backend; optional write token for sync job. **Contentful**: Space ID, Delivery API token (read), optional Preview token. Backend only.
- **Sync**: Webhook on publish (CMS → our backend) or cron: fetch changed content and upsert into our DB or cache. Frontend still gets content from our API.
- **Localization**: CMS entries by locale (e.g. `lesson.nl-NL`, `lesson.en`). Backend requests content for user’s locale (IS-024).
- **Versioning**: CMS maintains draft/published and history; we consume published version only.

---

## 7. Risks and Open Questions

- **Vendor lock-in**: Content is structured; export to JSON/Markdown possible. Migration: re-import into new CMS or back to DB. **Cost**: Per seat and API call. **Open question**: Exact trigger (content team size, number of lessons, or localization roadmap) for Phase 2.
