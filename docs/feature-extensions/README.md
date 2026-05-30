# Feature extensions

**Purpose**: Document **new capabilities** that extend the frozen product/feature baseline (`docs/final/`, `docs/features/deep-dives/`, `docs/implementation/final/`) without replacing them.

**Workflow** (per extension):

1. **Draft** — `versions/{slug}-v1.md` (optional scratch) + `{slug}-overview.md` + `{slug}-impact-assessment.md`
2. **Review** — `reviews/{slug}-review-v1.md` → improvements → `reviews/{slug}-review-v2.md`
3. **Audit** — `audits/{slug}-audit.md` (architecture, data, security, doc cross-links)
4. **Finalize** — `final/{slug}-final.md` (approval summary, rollout, links)

**Current extensions**

| Slug | Title | Status |
|------|--------|--------|
| [cefr-curriculum-path](cefr-curriculum-path-overview.md) | CEFR level selection, curriculum path, daily plan, persisted progress, weak-area practice, revision | Final (see `final/cefr-curriculum-path-final.md`) |

**Related**

- Local curriculum JSON (interim CMS): `data/curriculum/` — see `docs/curriculum/populating-level-curriculum.md`
