# Phase 2 Summary: Industry Standards & Best Practices

## What Changed Across Versions

### v1 → v2

- **ONA (Oriëntatie op de Nederlandse Arbeidsmarkt)** added to exam types and alignment; product may support ONA-related scenarios; full ONA portfolio scope is roadmap-dependent (OQ-2).
- **Application of standards (§2.3)**: How standards flow into content pipeline, exam prep, moderation, accessibility, and i18n.
- **BCP 47**: IS-024 added for locale/language codes (UI, content versioning, APIs).
- **Pronunciation**: IS-025 added; assessment must use a defined, documentable standard (phoneme set/scoring); implementation in Backend/Speech spec.
- **IS-014/IS-015 clarified**: Non-listening audio requires alternatives; listening practice uses audio as primary, transcript optional after attempt or as documented.
- **IS-017 clarified**: Automated moderation with escalation path (e.g. flagging, human review) defined in Operations/Content policy.
- **IS-006**: Explicit “monitor via public sources (e.g. government/DUO).”
- **References**: CEFR, WCAG 2.1, Dutch government/DUO, BCP 47.
- **Assumption**: Official exam formats are publicly documented enough to align practice tasks.

---

## Major Design Decisions

1. **CEFR** as the single level framework for content and user level; product supports A0–C1.
2. **Dutch exams**: Align to reading, listening, speaking, writing, KNM; ONA in scope as scenarios/roadmap.
3. **Accessibility**: WCAG 2.1 AA; for listening exercises, transcript/caption optional or post-attempt to preserve listening goal.
4. **Moderation**: Automated first; escalation path for edge cases (documented in Operations/Content policy).
5. **Locale**: BCP 47 for all locale/language identification.
6. **Pronunciation**: Defined standard required; details in Backend/Speech spec.

---

## Remaining Open Questions

- OQ-1: Exact vs. “inspired by” exam question types.
- OQ-2: KNM/ONA content depth; full ONA portfolio in scope?
- OQ-3: Listening exercises: optional transcript after attempt vs. never.
