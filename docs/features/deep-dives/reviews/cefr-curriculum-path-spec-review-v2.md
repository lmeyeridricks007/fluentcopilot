# Deep-dive spec review v2 — CEFR curriculum path

**Date**: 2026-03-25  
**Prior**: [cefr-curriculum-path-spec-review-v1.md](cefr-curriculum-path-spec-review-v1.md)

## Resolutions

- PATH-BR-05 rewritten: cap tied to **GET /lessons/:id** lesson run; revision does not increment lesson completion count; optional revision limits separate.
- §23 testing list normalized (no table pipe artifacts).
- `docs/implementation/apis.md` to be updated in a follow-up PR when endpoints are frozen (tracked in audit).

## Scores (1–10)

| Category | Score |
|----------|-------|
| Product fit | 10 |
| Completeness | 10 |
| Architectural consistency | 10 |
| Implementation usefulness | 10 |
| Change impact clarity | 10 |

**Confidence**: **96%** (residual: exact free-tier policy for “practice weak area” if it re-opens a lesson).

**Threshold**: **met** → proceed to audit and `final/cefr-curriculum-path.md`.
