# Content Expansion Telemetry Loop — Data to Backlog

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

This document defines the **content expansion telemetry loop**: how usage and quality signals (completion, difficulty, drop-off, search, requests) are collected and turned into a content backlog for authoring or AI expansion so the platform improves over time.

---

## 2. Scope

- **In scope**: What telemetry is collected; aggregation and signals; backlog generation; prioritization; no PII.
- **Out of scope**: Analytics product (see analytics spec); implementation of event pipeline (backend).

---

## 3. Telemetry Collected (Signals)

| Signal | Source | Use |
|--------|--------|-----|
| **Lesson completion rate** | progress / lesson_completions | Low completion → improve or deprioritize lesson |
| **Exercise success rate** | exercise attempts, correct/incorrect | Hard exercise → simplify or add hint |
| **Scenario usage** | scenario starts, completions | Popular scenarios → expand; unused → improve or remove |
| **Vocabulary in lessons** | lesson content + progress | High-error terms → add to reinforcement; missing terms → add to vocabulary |
| **Search or request** | "next lesson", filters, search query | Unmet demand (no result) → create content for topic/level |
| **Drop-off point** | step or exercise where user quits | Improve step or add support |
| **Difficulty rating** | Optional in-app "too easy/hard" | Calibrate level tag or content |
| **Reflection themes** | reflection entry topics (aggregated, no PII) | New scenario or lesson ideas |

All aggregated; no PII (no user id in backlog items; optional cohort by level or locale).

---

## 4. Aggregation and Signals

- **Aggregate**: By lesson_id, scenario_id, exercise_id, vocabulary_id, topic, level; compute completion_rate, success_rate, usage_count, drop_off_rate over window (e.g. 30 days).
- **Signals**: 
  - "Low completion" = completion_rate < threshold.
  - "High difficulty" = success_rate < threshold.
  - "High demand" = search or request with zero or few results.
  - "Underused" = usage_count below threshold (candidate to improve or archive).
  - "Requested topic" = topic/level from search or filter with no content.
- **Output**: List of (content_id or topic/level, signal, metric value, priority_score). Priority score = f(impact, effort); e.g. high completion impact + low effort = high priority.

---

## 5. Backlog Generation

- **Job**: Scheduled (e.g. weekly) or event-driven; reads aggregated signals; produces backlog items.
- **Backlog item**: { type: "expand_lesson" | "add_vocabulary" | "add_scenario" | "simplify_exercise" | "new_topic", content_id or topic/level, signal, priority, suggested_action }.
- **Storage**: Backlog table or issue tracker; assigned to content team or left unassigned; no user data in item.
- **Suggested action**: "Add 5 vocabulary terms for scenario X"; "Simplify exercise Y"; "Create lesson for topic Z at level A2".

---

## 6. Prioritization

- **Priority**: Impact (usage, completion impact) vs effort (authoring or generation cost). High-impact, low-effort first.
- **Owner**: Content lead or product assigns; optional link to authoring or AI pipeline (e.g. "run quiz_generation for vocabulary set V").
- **Review**: Backlog reviewed in content ops; decide create, defer, or reject.

---

## 7. No PII and Privacy

- **No user id** in backlog; no reflection text in backlog (only aggregated themes or counts).
- **Aggregates only**: Counts, rates, cohort-level (e.g. "A1 learners"); no individual behavior in backlog.
- **Retention**: Telemetry per data retention policy; aggregates can be retained longer for product improvement.

---

## 8. Automation Opportunities

- **Auto-backlog**: High-priority "add vocabulary for scenario X" could trigger AI pipeline (vocabulary_example_sentence or quiz_generation) with human review.
- **Dashboard**: Content ops dashboard showing signals and backlog; drill-down to content id.
- **Alert**: "Completion rate for lesson L dropped below X%" → notify content lead.

---

## 9. Dependencies

- **Analytics/events**: Event taxonomy and pipeline (see analytics spec).
- **content-operations-model.md**: Who consumes backlog.
- **ai-content-generation-pipeline.md**: Optional auto-expansion from backlog.
- **content-sourcing-strategy.md**: Telemetry is not a direct source of copy.
