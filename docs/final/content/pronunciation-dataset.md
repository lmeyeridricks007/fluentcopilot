# Pronunciation Dataset — Targets, Phonemes, Feedback

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

This document defines the **pronunciation training dataset**: target words/phrases, phoneme structure, stress patterns, learner difficulty, example audio, scoring thresholds, and corrective feedback templates for integration with speech/pronunciation APIs.

---

## 2. Scope

- **In scope**: pronunciation_targets schema; scoring thresholds; feedback templates; linking to vocabulary; sourcing and validation.
- **Out of scope**: Speech API integration (see integrations); real-time scoring logic (backend).

---

## 3. Pronunciation Target Schema

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| id | bigint | PK | Yes |
| locale | varchar(10) | Teaching language | Yes |
| vocabulary_term_id | FK | Optional link to vocabulary_terms | Optional |
| target_word_or_phrase | varchar(255) | Text to pronounce | Yes |
| phoneme_structure | JSONB | IPA or phoneme sequence; e.g. ["l", "o:", "p", "ə", "n"] | Recommended |
| stress_pattern | varchar(100) | e.g. "primary on 1" (first syllable) | Optional |
| learner_difficulty | varchar(20) or decimal | easy, medium, hard; or 0–1 | Optional |
| example_audio_ref | varchar(500) | URL or asset_id for model audio | Recommended |
| scoring_thresholds | JSONB | { "good": 80, "acceptable": 60 } (percent) | Yes |
| corrective_feedback_templates | JSONB | [{ "condition": "stress_wrong", "template": "Put stress on the first syllable: LO-pen." }] | Yes |
| is_verified | boolean | | Yes |
| source | authored, ai_generated, imported | Yes |
| version | int | | Yes |

---

## 4. Corrective Feedback Templates

**Condition** can be: stress_wrong, phoneme_error, intonation, too_slow, too_fast, unclear. **Template** is a string with optional placeholders (e.g. {{ correct_stress }}). Backend or speech API returns condition; system selects template and fills placeholders.

**Example:**

```json
[
  { "condition": "stress_wrong", "template": "Put stress on the first syllable: {{ word_stressed }}." },
  { "condition": "phoneme_error", "template": "Try again: the sound is like {{ hint }}." }
]
```

---

## 5. Scoring Thresholds

- **good**: Score ≥ threshold (e.g. 80) → positive feedback; no correction.
- **acceptable**: Score in [acceptable, good) → gentle tip optional.
- **below_acceptable**: Score < acceptable → show corrective feedback (by condition from API).

Speech API (e.g. Azure Pronunciation Assessment) returns score and optionally dimension scores (accuracy, fluency, completeness). Map to conditions and select feedback template.

---

## 6. Sourcing and Validation

- **Source**: Authored list of high-value words/phrases; link to vocabulary_terms; AI-generated phoneme breakdown (with native verification). Example audio from TTS or recorded.
- **Validation**: target_word_or_phrase non-empty; scoring_thresholds has good and acceptable; corrective_feedback_templates non-empty; example_audio_ref valid URL or asset_id if present.
- **Scale**: 5k–20k targets per language; index (locale), (vocabulary_term_id).

---

## 7. Dependencies

- **database-schema.md**: pronunciation_targets table.
- **vocabulary-dataset.md**: Optional link via vocabulary_term_id.
- **exercise-template-system.md**: pronunciation_repeat exercise type.
- **content-entities.md**: Pronunciation target lifecycle.
