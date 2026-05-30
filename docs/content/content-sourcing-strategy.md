# Content Sourcing Strategy — Origins and Validation

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

This document defines **where content originates** (authored curriculum, authoritative references, official exam structures, AI-assisted generation, community feedback, telemetry) and **how each source is validated** before publication.

---

## 2. Scope

- **In scope**: Source types; validation per source; ownership and attribution; when to use which source; quality gates.
- **Out of scope**: Pipeline implementation (see pipelines); governance roles (see content-governance).

---

## 3. Source Types and Use

| Source | Used for | Validation | Attribution |
|--------|----------|------------|-------------|
| **Authored curriculum** | Core lessons, core scenarios, seed vocabulary/grammar, exam tasks | Editorial + pedagogy review; native check | Internal |
| **Authoritative references** | CEFR word lists, grammar references, dictionaries | Import with schema mapping; spot-check; license | Cite reference |
| **Official exam structures** | Exam types, modules, task formats, scoring criteria | Align to official spec; no claim of official content | Per license |
| **AI-assisted generation** | Example sentences, quiz distractors, dialogue variations, reflection lessons, level adaptation | Automated validation (schema, length, safety) + sampling review; never publish unvalidated | Mark source=ai_generated |
| **Community feedback** | Corrections, suggestions (future) | Moderation; editorial decision; no direct publish | Optional credit |
| **Telemetry insights** | Which content is used; completion; difficulty signals | Aggregate only; drives expansion and tuning | No copy from users |

---

## 4. Validation by Source

### 4.1 Authored curriculum

- **Who**: Content author or curriculum lead.
- **Checks**: Pedagogy (CEFR alignment, progression); accuracy (native or expert review); style guide; no PII; no harmful content.
- **Gate**: Review approval (see content-review-process); then publish.

### 4.2 Authoritative references

- **Who**: Import script + editorial spot-check.
- **Checks**: Schema mapping correct; license allows use; spot-check translations and level; normalize to our schema.
- **Gate**: Import to draft; review sample; publish batch or per-item.

### 4.3 Official exam structures

- **Who**: Product/curriculum; legal if licensing.
- **Checks**: Format and structure match official spec; no reproduction of official items without license; scoring criteria aligned.
- **Gate**: Legal/license sign-off; pedagogy sign-off; publish.

### 4.4 AI-assisted generation

- **Who**: Automated validation (content-validation-pipeline) + optional human sampling.
- **Checks**: Output conforms to prompt_output_schema; content-quality-rules (length, no PII, no harmful); moderation API on text; pedagogy constraints from ai-content-generation-policies.
- **Gate**: Auto-approve only if quality metrics stable and policy allows; otherwise sampling review before publish. Never auto-publish high-stakes (exam answers, official scoring).

### 4.5 Community feedback

- **Who**: Moderation + editorial.
- **Checks**: No spam, no PII, no harmful; suggestion accuracy verified before applying.
- **Gate**: Editorial decision; apply as edit with attribution or reject.

### 4.6 Telemetry

- **Not a content source**: Telemetry informs which vocabulary/lessons to expand or which scenarios to add; expansion is done via authored or AI-assisted pipeline, not by copying user input as content.

---

## 5. Sourcing by Content Type

| Content type | Primary source | Secondary | Never |
|--------------|----------------|-----------|--------|
| Vocabulary | Authored + CEFR lists | AI examples (validated) | User input as lemma |
| Grammar | Authored + references | AI examples | — |
| Scenarios | Authored | AI variations (validated) | — |
| Lessons | Authored + templates | AI-generated (validated) | — |
| Exam tasks | Authored + official alignment | AI distractors (validated) | AI exam answers |
| Prompts | Authored | AI draft + human edit | Unreviewed AI prompt |
| Pronunciation | Authored + vocabulary link | TTS for audio | — |
| Cultural | Authored (experts) | — | AI-only without review |

---

## 6. Dependencies

- **content-validation-pipeline.md**: Automated checks.
- **content-review-process.md**: Human review gates.
- **content-governance.md**: Roles and approval.
- **ai-content-generation-policies.md**: AI guardrails.
- **content-quality-rules.md**: Validation rules.
