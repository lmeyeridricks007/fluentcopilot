# Cursor / Composer prompt — full A2 multimodal curriculum (JSON)

Copy everything inside the **fenced block** below into a new Composer chat (or split by unit if context limits require it).

---

```text
You are a senior curriculum author and technical writer for a Dutch (nl-NL) language learning product.

## Non-negotiable sources (read fully before writing)

1. **Pedagogy & scope**: `docs/curriculum/a2-multimodal-curriculum-design.md` — units, lesson counts, archetypes A–H, 8-phase lesson spine, skills (listening, reading, writing, speaking), culture, CEFR A2 level.
2. **File shapes**: `docs/curriculum/populating-level-curriculum.md` §4 (manifest, units, lessons JSON).
3. **Existing seed** (replace, do not duplicate IDs): `data/curriculum/nl-NL/A2/` — you may delete or supersede old lesson/unit files after backing up mentally; **stable ID rule**: never reuse an old lesson ID for new content.

## Product constraints

- **Target locale**: nl-NL (Netherlands Dutch). Instruction copy in **English** where the schema uses English (e.g. teacher_notes, descriptions for builders).
- **CEFR**: A2 only for this level; difficulty and tasks must match A2 (not B1 grammar load).
- **Original content only**: no verbatim textbook, coursebook, or proprietary exam material; paraphrase; invent realistic Dutch dialogues and texts.
- **Catalog.type** must be one of: `vocabulary` | `grammar` | `dialogue` | `listening` | `quiz` — map each lesson’s **archetype** to the closest type (e.g. extended listening → `listening`; writing studio → `grammar` or `vocabulary` if grammar-light, but prefer truthful labeling; use `dialogue` for interaction/speaking-text frames).
- **durationMinutes**: 15–25 per lesson (design doc §5).
- **isPremium**: `false` for all lessons unless the user message explicitly requests premium tiering.

## Scale & structure (implement the design doc)

- **9 thematic units** matching domains in design doc §4 (table rows 1–9):  
  u01 People & daily rhythm · u02 Food & shopping · u03 Housing & neighbourhood · u04 Transport & city · u05 Health & body · u06 Work & study · u07 Admin & services · u08 Social & leisure · u09 Culture & integration context.
- **8 lessons per unit** → **72 lessons total** (`a2-u01-l01` … `a2-u09-l08`).
- **Per-unit archetype rotation** (design §6): for each unit, assign lessons so that across the 8 you include:  
  **2× A** (input + noticing), **1× B** (pattern drill), **1× D OR E** (extended listening OR extended reading — alternate units so the course has both skills well represented globally), **1× F OR G** (writing studio OR speaking/interaction — alternate across units), **1× C** (real-world task), **1× H** (culture capsule).  
  Use the **8th** slot to add either another **A** or **C** as in design doc.  
  Store archetype on each lesson as:  
  `"metadata": { "archetype": "A|B|C|D|E|F|G|H", "primary_skills": ["listening","reading","writing","speaking","culture"] (subset) }`  
  (add this object at the top level of each lesson JSON alongside `id`, `unit_id`, etc.)

## Lesson spine (every lesson — design §7)

Each lesson’s `lesson_plan` must implement the **8-phase user journey** explicitly:

1. Goal (~1 min)  
2. Warm-up / lead-in (~2 min)  
3. Input (~4–7 min) — dialogue or text; note if slow audio is assumed in `content_refs.notes`  
4. Focus (~3–5 min) — 2–3 language points with examples  
5. Guided practice (~5–8 min) — **at least 6 distinct practice interactions** described (vary formats: match, transform, gap-fill, choose appropriate reply, listen-for-detail, ordering, etc.)  
6. Freer practice (~3–6 min) — production with phrase bank  
7. Check (~2–4 min) — quiz aligned to objective  
8. Bridge (~1 min) — link to next lesson or revision  

**Implementation detail**: use `lesson_plan.steps` as an ordered array. **Prefix** each `activity` string with the phase label in brackets, e.g. `[Goal] …`, `[Input] …`, so engineers can split UI later. Include **enough substeps** that phases 3–6 are clearly non-trivial (not “three phrases only”).  
Set `lesson_plan` time fields (`warm_up_minutes`, `presentation_minutes`, `practice_minutes`, `check_minutes`) so they **sum** to roughly **durationMinutes** (±2 min).

## Pedagogy richness (design §7)

- **target_vocabulary_lemmas**: 8–15 per lesson where relevant.  
- **grammar_points**: 1–3 objects with `point`, `examples_nl`, `examples_en` (realistic Dutch).  
- **micro_outcomes**: 3–5 measurable outcomes.  
- **assessment.quiz_ideas**: 3–5 concrete item types; **success_criteria** explicit.  
- **Culture (unit 9 + threads)**: unit 9 lessons are culture-heavy; units 1–8 must include **at least one** step in one lesson per unit that names a **situated** cultural or institutional fact (Netherlands-specific), still as original wording.

## Listening / reading / writing / speaking content

- For **D** lessons: `content_refs.listening_asset_id` = stable slug `a2_listen_{unit}_{lesson}`; include in `lesson_plan` a full **script outline** in Dutch inside `teacher_notes` or a new optional field `"content_outline": { "listening_script_nl": "..." }` (multi-turn, 45–90 seconds when read aloud).  
- For **E** lessons: include `"content_outline": { "reading_text_nl": "..." }` (short article/sign/thread — original).  
- For **F** lessons: include writing prompts and model sentences in `content_outline` or steps.  
- For **G** lessons: speaking as **text-first** frames (learner produces Dutch lines from prompts); note `voice_optional: true` in metadata.

## Filesystem (do this first)

1. `OUTPUT_ROOT = data/curriculum/nl-NL/A2/` (normalized capital **A** in path).  
2. `mkdir -p` OUTPUT_ROOT, OUTPUT_ROOT/units, OUTPUT_ROOT/lessons.  
3. Remove or archive previous `manifest.json`, `units/*.json`, `lessons/*.json` in that folder if replacing wholesale (or merge only if user said incremental — default **full replace** for this task).

## Deliverables

1. `manifest.json` — `schema_version`, `locale`, `instruction_locale`, `cefr_level`, `title`, `summary`, **full** `unit_order` (`a2-u01` … `a2-u09`), `source_notes`.  
2. `units/a2-u01.json` … `units/a2-u09.json` — each with **8** `lesson_ids`, rich `objectives_can_do` (4–6), `grammar_focus`, `vocabulary_domains`.  
3. `lessons/{lessonId}.json` — **72 files**, filename = `id`.  
4. **Cross-check**: every `lesson_id` in units exists; every lesson’s `unit_id` matches; `catalog.type` valid; JSON valid UTF-8, double quotes, no trailing commas.

## QA (self-run before finish)

- [ ] 9×8 = 72 lesson files present.  
- [ ] Each unit contains archetype mix per rules above.  
- [ ] Every lesson has 8 spine phases represented in `lesson_plan.steps`.  
- [ ] Phases 5–6 mention ≥6 guided practice interactions (count substeps or explicit numbering).  
- [ ] No copyrighted paste; Dutch is natural Netherlands usage.

## Chat output

Do **not** dump full JSON in chat. Reply with: (1) unit list + total lesson count, (2) one-line tree of OUTPUT_ROOT, (3) any files that failed to write (paste one failed file only).

## Execution

Execute now: create directories, write all files, validate JSON with a quick script if available.

```

---

## How to use

- **Single shot**: paste the block when your repo is open at the project root and the model has access to the paths above.  
- **If context is tight**: run **9 sequential chats**, one per unit: paste the same block but add at the end: `AUTHOR ONLY UNIT a2-u0X this turn; do not modify other units or manifest until the final turn.` Then a final turn: `Merge manifest.json unit_order and verify all 72 lessons exist.`

## Related

- Design reference: `docs/curriculum/a2-multimodal-curriculum-design.md`  
- Schema reference: `docs/curriculum/populating-level-curriculum.md`
