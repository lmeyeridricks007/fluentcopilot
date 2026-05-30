# Populating a Level Curriculum (Local JSON)

## Document info

| Attribute | Value |
|-----------|--------|
| Status | **Active** for nl-NL A2 (strict bundle + generator); other levels remain draft |
| Storage | Local JSON files in-repo (interim); migrate later to CMS / API |
| Product context | Dutch learning app; CEFR levels (e.g. A0–C1); aligns with core lessons & exam prep domains |

---

## 1. Purpose

This document explains **how to design and fill a curriculum for one CEFR level** (for example **A2** or **B1**) using **local JSON files** as the source of truth. It also includes a **ready-to-paste Cursor prompt** so an agent can research level-appropriate scope, draft unit structure, and produce structured lesson metadata and lesson-plan outlines in the same JSON shape.

**Later**: the same logical schema can move to a dedicated content service or headless CMS without changing the pedagogical structure—only the loader and IDs.

---

## 2. Relationship to the codebase

| Area | Role |
|------|------|
| `src/demo-data/types.ts` — `DemoLesson` | Minimal lesson card fields the UI list uses today (`id`, `title`, `description`, `level`, `topic`, `type`, `durationMinutes`, `isPremium`). |
| `src/demo-data/factories/lessonFactory.ts` | Example in-code seeds; JSON curriculum can **replace or feed** this factory once wired. |
| `src/content-engine/types/artifacts.ts` — `LessonBlueprint`, `VocabularyItem`, etc. | Richer future shape for generated or imported content; optional `cefr_level`, `locale`, `topic`. |

**Production path (nl-NL A2 today)**:

| Area | Role |
|------|------|
| `data/curriculum/nl-NL/A2/` | Per-lesson/per-unit JSON plus `manifest.json`; edited by authors or agents. |
| `python3 scripts/generate_a2_nl_curriculum.py` | Merges sources into `catalog.bundle.json`, runs **validation** (steps, grammar spine, four-skills block, self-checks, tags). |
| `data/curriculum/nl-NL/A2/catalog.bundle.json` | Single bundle the frontend imports. |
| `src/demo-data/curriculum/a2Catalog.ts` | **Strict TypeScript types** matching generator output; `getA2LessonRecordById` drives guided lesson, flashcards, quiz copy, review queue. |

Learn flows **do not** fall back to legacy mock lesson bodies: if a lesson id has no catalog record or breaks schema, the UI shows an explicit error. Non-A2 path models in `src/features/curriculum/types.ts` may return an empty path until other levels use the same bundle pattern.

---

## 3. Suggested repository layout

Keep level data **namespaced by locale and level** so you can add `en` teaching notes later or multiple dialects without collision.

```text
data/curriculum/
  nl-NL/
    A2/
      manifest.json           # level summary + ordered unit ids
      units/
        u01-daily-routines.json
        u02-shopping-services.json
      lessons/
        a2-u01-l01.json       # one file per lesson (or embed in unit — see §4)
    B1/
      manifest.json
      units/
      lessons/
```

**Naming**

- **Stable IDs**: `a2-u01-l01` (level-unit-lesson). Avoid renumbering after publish; use new IDs for new lessons.
- **Locale folder**: `nl-NL` for target language content; use BCP 47 style.

---

## 4. JSON shapes

### 4.1 `manifest.json` (per level)

Describes the level and points at units. Optional `source_notes` for human authors.

```json
{
  "schema_version": 1,
  "locale": "nl-NL",
  "instruction_locale": "en",
  "cefr_level": "A2",
  "title": "A2 Dutch — Practical everyday use",
  "summary": "Can-do focus: transactions, simple narratives, familiar topics.",
  "unit_order": ["a2-u01", "a2-u02"],
  "a2_bands": [
    {
      "band": "A2.1",
      "label": "Early A2 — survival expansion",
      "unit_ids": ["a2-u01", "a2-u02"]
    }
  ],
  "exam_alignment_notes": "Optional: KNM/ONA/A2 exam themes if relevant.",
  "source_notes": "Author, date, syllabus references (no copyrighted paste)."
}
```

**`a2_bands` (required for nl-NL A2 in the app)**

- Ordered bands for path UI and optional sequential unlock. Each entry: `band` (`"A2.1"` \| `"A2.2"` \| `"A2.3"`), human `label`, and `unit_ids` in path order.
- Must be consistent with each unit’s `a2_band` (every unit id appears under exactly one band).

### 4.2 `units/*.json`

One unit = a theme (several lessons). Links to lesson IDs.

```json
{
  "id": "a2-u01",
  "cefr_level": "A2",
  "locale": "nl-NL",
  "a2_band": "A2.1",
  "title": "Daily life & routines",
  "summary": "Time, habits, simple plans, household vocabulary.",
  "objectives_can_do": [
    "Describe daily routine in simple sentences",
    "Make and respond to simple invitations for familiar activities"
  ],
  "integration_scripts_summary": "Short AH checkout + neighbour chat patterns (see lessons).",
  "grammar_focus": ["present tense", "frequency adverbs", "simple connectors"],
  "vocabulary_domains": ["time", "home", "leisure"],
  "lesson_ids": ["a2-u01-l01", "a2-u01-l02", "a2-u01-l03"]
}
```

**Unit fields (nl-NL A2 bundle — all required in `A2CatalogUnit`)**

- **`a2_band`**: `"A2.1"` \| `"A2.2"` \| `"A2.3"` — progression UI and optional sequential unlock.
- **`objectives_can_do`**: 3–6 CEFR-style can-do strings (English instruction locale is fine).
- **`integration_scripts_summary`**: one line summarising real-life scripted scenarios (supermarket, GP, landlord, gemeente, etc.).
- **`grammar_focus`**, **`vocabulary_domains`**, **`lesson_ids`**: as in the example; ids must resolve to lesson files.

### 4.3 `lessons/*.json` (catalog + plan)

Each lesson file must satisfy **`A2CatalogLesson`** in `src/demo-data/curriculum/a2Catalog.ts` once merged into the bundle. The `catalog` block maps to list cards (`DemoLesson`); `pedagogy` and `lesson_plan` power the guided flow, flashcard lemmas, and “Quick check” quiz copy.

**`catalog.type`** (union): `vocabulary` \| `grammar` \| `dialogue` \| `listening` \| `quiz`.

**Required top-level lesson fields (nl-NL A2)**

- **`metadata`**: `archetype` (see §4.5), `primary_skills` (string[]), optional `voice_optional`.
- **`catalog`**: `title`, `description`, `topic`, `type`, `durationMinutes`; optional `isPremium`.
- **`pedagogy`**: `objective`, **`can_do_outcomes`** (2–4 strings, learner-facing “After this lesson …”), **`grammar_primary`** (id from `docs/curriculum/a2-grammar-spine.md`), **`grammar_primary_label`** (short human label for UI), `prior_lesson_ids`, `target_vocabulary_lemmas`, `grammar_points[]`, `micro_outcomes`.
- **`lesson_plan`**: `warm_up_minutes`, `presentation_minutes`, `practice_minutes`, `check_minutes`, **`steps`** (see below).
- **`assessment`**: **`quiz_ideas`** (≥1 string; the app uses this for the lesson quiz screen — empty lists show an empty state), `success_criteria`.
- **`provenance`**: `author`, `last_updated`, `sources_consulted`.

**Optional on the lesson record** (allowed by TypeScript; omit if unused): `content_outline`, `content_refs`.

**`lesson_plan.steps` (nl-NL A2 generator rules)**

- Exactly **8** steps per lesson in the shipped corpus.
- Every step: **`step`** (1-based), **`learner_title`**, **`skill_focus`**, **`activity`** (substantive text; validator enforces minimum length).
- **Step 4 (index 3)**, archetype ≠ `H`: activity must include embedded **“Today’s grammar”** deep-dive; optional **`illustration`** with `src` (app path under `public/` or `https://`) and `alt`.
- **Step 5 (index 4)**: **four-skills block** — activity must include **“All four skills”** and numbered sub-parts (e.g. `1 —` …) so listening / reading / speaking / writing all appear **in text** for that step.
- **Step 7 (index 6)**: **`interaction`** with `kind: "self_check_quiz"` and ≥4 **`items`**; many items should set **`common_error_tags`** for weak-spot filtering.
- Optional per step: `teacher_notes`, `visual_ascii`, `illustration`, `interaction` (other kinds on earlier steps), `example_response`, **`listening_level`**, **`recycle_lemmas`**, **`common_error_tags`** (on self-check items).

Abbreviated shape (not a complete valid lesson — use generated lessons as reference):

```json
{
  "id": "a2-u01-l01",
  "unit_id": "a2-u01",
  "cefr_level": "A2",
  "locale": "nl-NL",
  "metadata": {
    "archetype": "B",
    "primary_skills": ["speaking", "writing"]
  },
  "catalog": {
    "title": "My day — present tense",
    "description": "…",
    "topic": "Daily life",
    "type": "grammar",
    "durationMinutes": 21,
    "isPremium": false
  },
  "pedagogy": {
    "objective": "…",
    "can_do_outcomes": ["…", "…"],
    "grammar_primary": "a2.1-present-tense",
    "grammar_primary_label": "Present tense",
    "prior_lesson_ids": [],
    "target_vocabulary_lemmas": ["opstaan", "ontbijt"],
    "grammar_points": [{ "point": "…", "examples_nl": ["…"], "examples_en": ["…"] }],
    "micro_outcomes": ["…"]
  },
  "lesson_plan": {
    "warm_up_minutes": 2,
    "presentation_minutes": 7,
    "practice_minutes": 9,
    "check_minutes": 3,
    "steps": []
  },
  "assessment": {
    "quiz_ideas": ["…", "…"],
    "success_criteria": "…"
  },
  "provenance": {
    "author": "human_or_agent",
    "last_updated": "2026-03-25",
    "sources_consulted": ["…"]
  }
}
```

### 4.4 Strict schema reference

The **authoritative** field list and optionality for the bundled app are the interfaces in **`src/demo-data/curriculum/a2Catalog.ts`**. After editing JSON under `data/curriculum/nl-NL/A2/`, run:

```bash
python3 scripts/generate_a2_nl_curriculum.py
```

That refreshes **`catalog.bundle.json`** and runs validation. Fix any assertion errors before committing.

### 4.5 Syllabus realism: archetype, four skills, and possible next steps

- **Archetype rotation (`A`–`H`)** — The generator assigns an **`metadata.archetype`** per lesson (pattern varies by unit/lesson index). It drives **`catalog.type`**, **`primary_skills`**, timing split (`warm_up_minutes` …), and the **overall flavour** of the lesson (e.g. more listening-weighted vs writing-weighted). It does **not** disappear just because step 5 lists all four skills in prose.
- **Four-skills block (step 5)** — Guarantees that **every** lesson touches **listening, reading, speaking, and writing** in **text** within one combined step. That is **coverage**, not **exam parity**: it does not replace a **dedicated listening exam** section, **timed writing**, or proctored speaking assessment.
- **If you want closer to “equal time” or school-style clarity** — Possible product/content evolutions (not required for schema compliance today):
  - **Rebalance** `warm_up_minutes` / `presentation_minutes` / `practice_minutes` / `check_minutes` (and copy inside steps) so modalities that matter more for your syllabus get more clock time.
  - **Split step 5 in the UI** — Implemented: `GuidedLessonPage` parses the `\n---\n` + **All four skills** tail and renders **Listen / Read / Write / Speak** panels (see `fourSkillsStepUtils.ts` + `FourSkillsPanels.tsx`) while keeping one JSON step. Alternatively, split into multiple JSON steps if you change the generator contract.

---

## 5. Authoring workflow

1. **Lock scope** — Choose `cefr_level` and `locale`; list exam or integration goals if applicable (see product docs: exam prep, onboarding levels).
2. **Write `manifest.json`** — Title, summary, ordered `unit_order`, required **`a2_bands`** for A2.
3. **Draft units** — Each unit: required fields in §4.2; stable `lesson_ids`.
4. **Author lessons** — For each lesson: `metadata`, `catalog`, full `pedagogy` (including **`grammar_primary_label`**), **8-step** `lesson_plan`, non-empty **`assessment.quiz_ideas`**, `provenance`.
5. **Validate** — Run `python3 scripts/generate_a2_nl_curriculum.py` (bundle + assertions). Fix ID cross-references and schema issues.
6. **Typecheck / build** — `npx tsc --noEmit` and `npm run build` after bundle changes so `a2Catalog.ts` and JSON stay aligned.

---

## 6. Quality checklist

- **CEFR fit**: Vocabulary and tasks match **target level** (not mixed B2 structures in an A2 file unless marked extension).
- **Netherlands Dutch**: Prefer NL norms; note BE/NL differences only when teaching ambiguity.
- **Inclusive & practical**: Scenarios reflect diverse learners (work, family, admin, health) where product scope allows.
- **Original wording**: Do not copy paste from copyrighted coursebooks; paraphrase and create your own examples.
- **Stable IDs**: Never reuse an ID for a different lesson.

---

## 7. Full Cursor prompt (copy-paste ready)

Use this in a **new Cursor chat** or **Composer** as-is. Defaults are already filled; only change the **Inputs** block if you want another level, locale path, or focus.

```text
You are a curriculum author for a Dutch (nl-NL) language learning product. The app uses CEFR levels (A0–C1), micro-lessons (vocabulary, grammar, dialogue, listening, quiz), and will move content to a CMS later; for now use local JSON only. Follow the shapes and layout in: docs/curriculum/populating-level-curriculum.md (§3–§4).

## Inputs (defaults — edit only if you need something else)

- TARGET_LEVEL: A2
- TARGET_LOCALE: nl-NL
- INSTRUCTION_LOCALE: en
- OPTIONAL_FOCUS: general level (if the user message specifies themes or exams, use that instead)
- OUTPUT_ROOT: data/curriculum/nl-NL/A2/

## Mandatory first step — filesystem

Before writing any JSON:

1. Ensure **OUTPUT_ROOT** exists. Create every missing segment of the path (equivalent to `mkdir -p`).
2. Under OUTPUT_ROOT, ensure these directories exist: **`units/`** and **`lessons/`**. Create them if missing.
3. If **TARGET_LOCALE** or **TARGET_LEVEL** in the Inputs block differs from the path, set OUTPUT_ROOT to `data/curriculum/{TARGET_LOCALE}/{TARGET_LEVEL}/` (normalized, e.g. B1 not b1 in the folder name) and still create `units/` and `lessons/` there.

Do not ask the user to create folders manually.

## Your tasks

1. **Research & scope (brief)**  
   - Summarize **CEFR expectations** for TARGET_LEVEL for an adult L2 learner (productive/receptive).  
   - If OPTIONAL_FOCUS is not “general level”, align units and can-dos to that focus (e.g. KNM/ONA-relevant situations in original wording only — no proprietary exam text).

2. **Design curriculum structure**  
   - Propose **5–8 thematic units** for TARGET_LEVEL and OPTIONAL_FOCUS.  
   - For each unit: title, summary, 3–6 **can-do objectives**, grammar focus list, vocabulary domains, and **lesson_ids** (stable lowercase IDs, e.g. a2-u01-l01).

3. **Author every lesson**  
   For each lesson ID, build one JSON object per §4.3: `metadata` (archetype A–H pattern as in doc/generator, `primary_skills`), `catalog` (DemoLesson-compatible), full `pedagogy` including **`grammar_primary`** (spine id) and **`grammar_primary_label`**, `lesson_plan` with **8 steps** (step 4 grammar embed for non-H, step 5 “All four skills” numbered block, step 7 `self_check_quiz` with ≥4 items and `common_error_tags` on many items), `assessment` with **non-empty** `quiz_ideas`, `provenance`. Optional: `content_refs`.  
   - Realistic **Dutch** in `grammar_points` and steps; difficulty must match TARGET_LEVEL.  
   - `catalog.type` ∈ vocabulary | grammar | dialogue | listening | quiz.  
   - `durationMinutes`: align with lesson weight (typical low 20s for generated A2).  
   - `isPremium`: false unless OPTIONAL_FOCUS or the user explicitly requests premium tiering for specific lessons.

4. **Write files in the workspace (primary deliverable)**  
   - `{OUTPUT_ROOT}/manifest.json` — §4.1 including **`a2_bands`**; `unit_order` must list all unit ids.  
   - `{OUTPUT_ROOT}/units/{unitId}.json` — one file per unit (§4.2); filename matches `id` field (e.g. `a2-u01.json`).  
   - `{OUTPUT_ROOT}/lessons/{lessonId}.json` — one file per lesson (§4.3); filename matches `id` field.  
   - Cross-check: every `lesson_id` in each unit has a matching lesson file; each lesson’s `unit_id` matches its unit file’s `id`.  
   - From repo root run `python3 scripts/generate_a2_nl_curriculum.py` and fix any validation errors.

5. **Constraints**  
   - No verbatim copyrighted textbook or exam material; original Dutch and prompts only.  
   - Prefer **Netherlands Dutch**.  
   - Valid JSON: UTF-8, double quotes, no trailing commas.

## Chat output (short only)

In the chat, reply with:  
1. A brief rationale (≤15 lines): level scope + unit list + file paths created.  
2. A one-line tree listing **OUTPUT_ROOT**, `manifest.json`, `units/*`, `lessons/*`.

Do **not** dump full JSON in chat unless a file write failed; if a write fails, paste the failed file’s contents once and say which path failed.

Execute now: create directories if needed, then write all files.
```

---

## 8. Optional next steps (engineering)

- **`scripts/generate_a2_nl_curriculum.py`** already validates nl-NL A2 JSON and writes `catalog.bundle.json`; extend or mirror for other levels.
- Add `scripts/curriculum/validate-curriculum.ts` (or JSON Schema) if you want editor-time checks without running the Python pipeline.
- Map `lesson_plan` / `pedagogy` to `LessonBlueprint` when the content pipeline is live.
- UI: **step-5 four-skills panels** are implemented (§4.5); **minute rebalance** or exam-style tasks remain optional if you want stricter time parity.

---

## 9. Related docs

- `src/demo-data/curriculum/a2Catalog.ts` — strict TypeScript mirror of `catalog.bundle.json`  
- `docs/demo-data/local-demo-data-usage.md` — how demo data loads today  
- `docs/final/feature-domain-breakdown.md` — FD-02 Core Lessons, FD-09 Exam Preparation  
- `docs/implementation/features/core-lessons.md` — feature expectations  
- `docs/feature-extensions/cefr-curriculum-path-overview.md` — product extension: level selection, path UI, daily plan, progress, weak areas, revision  
- `docs/curriculum/a2-multimodal-curriculum-design.md` — **review draft**: full A2 scope (skills, culture, lesson count, multimodal lesson spine)  
- `docs/curriculum/a2-grammar-spine.md` — A2.1–A2.3 grammar milestone IDs for `grammar_primary` and generator validation  
