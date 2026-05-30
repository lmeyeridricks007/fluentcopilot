# A2 curriculum architecture (product contract)

| Attribute | Value |
|-----------|--------|
| Status | **Implementation contract** — source of truth for curriculum product decisions |
| Locale | nl-NL (instruction locale may be en) |
| Stack alignment | See `docs/curriculum/a2-grammar-spine.md`, `data/curriculum/nl-NL/A2/`, `src/demo-data/curriculum/a2Catalog.ts` |

---

## 1. Purpose of the curriculum

Deliver **adult-oriented, practical Dutch** aligned to **CEFR A2**, organised so learners build **communication ability**, **recurring grammar patterns**, and **task-ready vocabulary** without a separate “grammar course” or “vocabulary course” as the main path. Grammar and lexis are **embedded in lesson flows**; **review**, **spaced repetition**, and **optional reference** layers sit beside the path (see `review-engine.md`).

---

## 2. CEFR A2 design goals

- **Reception**: Understand short, clear speech and simple texts on familiar matters (work, housing, health, transport, social plans).
- **Production**: Handle routine exchanges with simple connected sentences; ask/answer predictable questions; describe needs and immediate plans.
- **Interaction**: Complete everyday transactions and simple service encounters with repair strategies (repeat, slower, simpler).
- **Linguistic scope**: Stable present-tense and common irregulars; separable verbs; basic modals; introduction to perfectum and simple subordination in **controlled** chunks by late A2; **no** B1 abstraction or extended argumentation as default.

---

## 3. Target learner profile

- **Adults** living in or engaging with the Netherlands (work, family, civic integration, social life).
- **Motivation**: “Use Dutch tomorrow,” not abstract linguistics.
- **Constraints**: Short sessions, mobile context, variable prior exposure; may have literacy in other languages.
- **Implication for product**: Short interaction loops, low text wall density, clear outcomes per lesson, explicit “what you can do now” can-dos.

---

## 4. Overall curriculum structure — three bands

| Band ID | Learner-facing name | Positioning |
|---------|---------------------|-------------|
| **A2.1** | Survival expansion | Routines, transactions, housing basics, polite service language |
| **A2.2** | Independence | Narrative chunks, health/work, perfectum in short sentences, purpose clauses |
| **A2.3** | Control & real-world use | Opinions, admin/register, soft requests, simple subordination, culture-in-context |

**Runtime today**: `a2_bands` + per-unit `a2_band` in `catalog.bundle.json` / `A2CatalogUnit` (`src/demo-data/curriculum/a2Catalog.ts`).

**Rule**: Every **module** (see §6) maps to **one primary band**; **recycling** of earlier-band grammar is mandatory in later modules.

---

## 5. Recommended module structure (target: ~12 modules)

**Target scale**: **~120–160 lessons**; **working default: 12 modules × ~11 lessons ≈ 132 lessons**.

**Current repo state (assumption for migration)**: **9 thematic units**, **72 lessons** generated under `data/curriculum/nl-NL/A2/` — a **dense pilot** of the spine. Expansion to 12 modules and ~132 lessons is **additive** (new unit/manifest entries + generator runs), not a breaking change to lesson IDs already published.

Each **module** should include:

| Element | Requirement |
|---------|-------------|
| **Communication theme** | One clear real-world domain (e.g. food, housing, health) |
| **Can-dos (unit)** | 3–6 observable outcomes (`objectives_can_do` on unit) |
| **Grammar threads** | 1–3 **primary** spine IDs introduced or consolidated; explicit **recycle** of prior IDs |
| **Vocabulary** | Domain lemmas + **recycle_lemmas** across lessons in module |
| **Real-life task** | At least **one** lesson archetype or capstone oriented to **task completion** (message, call script, short interaction plan) |
| **Review hooks** | Lemmas and optional **common_error_tags** surfaced for downstream review engine |

---

## 6. Recommended total lesson count and rationale

| Tier | Lessons | Rationale |
|------|---------|-----------|
| **Minimum viable A2 path** | ~100 | Covers spine once with thin task variety |
| **Recommended** | **120–160** | Enough **spiral** repetition of patterns + module-level tasks |
| **Working planning number** | **132** | 12 × 11 — easy batching for content ops |

**Spiral rule**: Each **major grammar milestone** (`docs/curriculum/a2-grammar-spine.md`) should appear in **multiple modules** — first **controlled**, then **mixed**, then **task-embedded**.

---

## 7. Full recommended module list (12 modules)

Band mapping is **primary**; some overlap at band edges is acceptable with explicit `a2_band` on unit.

| # | Module slug (example) | Primary band | Theme (short) |
|---|------------------------|--------------|----------------|
| 1 | `a2-m01-people-rhythm` | A2.1 | People, introductions, daily rhythm |
| 2 | `a2-m02-food-shopping` | A2.1 | Food, shopping, service transactions |
| 3 | `a2-m03-housing` | A2.1 | Housing, neighbours, home problems |
| 4 | `a2-m04-transport-city` | A2.2 | Transport, directions, appointments |
| 5 | `a2-m05-health-body` | A2.2 | Health, pharmacy, GP soft scenarios |
| 6 | `a2-m06-work-study` | A2.2 | Work/study rhythm, email/chat tone |
| 7 | `a2-m07-admin-services` | A2.3 | Gemeente, bank, formal requests |
| 8 | `a2-m08-social-leisure` | A2.3 | Plans, invitations, opinions (light) |
| 9 | `a2-m09-workplace-plus` | A2.3 | Meetings-lite, clarifications, delays |
| 10 | `a2-m10-media-info` | A2.3 | Reading notices, apps, simple news |
| 11 | `a2-m11-integration-culture` | A2.3 | Culture-in-context, comparison language |
| 12 | `a2-m12-bridge` | A2.3 | **Consolidation** + B1-preview hooks (optional) |

**Repo alignment**: Current units (`a2-u01` … `a2-u09`) map conceptually to rows 1–9; **m10–m12** are **expansion slots** for full product scale.

---

## 8. Sample breakdown — one module (~11 lessons)

**Module**: `a2-m02-food-shopping` (A2.1)

| Lesson # | Archetype rotation (see lesson-engine) | Primary grammar spine (example) | Task focus |
|----------|----------------------------------------|-----------------------------------|------------|
| 1 | Input / dialogue | present tense recap | recognise chunks in shop audio |
| 2 | Pattern drill | modals / requests | ask for bag, pay, allergy phrase |
| 3 | Short task | separable verbs (thin) | fix wrong order in short lines |
| 4 | Listening stretch | imperatives (service) | follow cashier instructions |
| 5 | Reading + writing | comparatives (thin) | label products, short preference |
| 6 | Speaking studio | polite **u** / **je** | short role-card |
| 7 | Real-life mini-task | integrated | write/order one sentence message |
| 8 | Culture + comparison | fixed chunks | plan + phrase for appointment |

**Note**: Exact archetype letters (A–H) today are **generator-defined** (`metadata.archetype` in bundle). The **product** requirement is **variety + task + four-skills touch** per lesson policy in `lesson-engine.md`.

---

## 9. Grammar spine across the curriculum

**Source of truth**: `docs/curriculum/a2-grammar-spine.md` + machine set in `scripts/a2_curriculum_schema.py`.

**Rules**:

1. Every lesson declares **`grammar_primary`** ∈ spine IDs (validated in generator).
2. **Language focus** steps carry **in-context** explanation (rule + Dutch examples + micro-production) — not a wall of abstract rules.
3. **Later bands** assume **A2.1** clause order and present tense are **usable** in production.
4. **Subordination** (`want/omdat`, short relatives) is **A2.3** with **recognition → short production** progression.

---

## 10. Vocabulary strategy

- **Lemma lists** per lesson: `pedagogy.target_vocabulary_lemmas` (+ optional `recycle_lemmas` on steps).
- **Domains** per unit: `vocabulary_domains[]` for authoring and search/filter (future).
- **Principle**: Teach **chunks and frames** (“*Mag ik …?*”, “*Ik wil graag …*”) not isolated word lists as the primary UI.
- **Review extraction**: Lemmas feed **review engine** items (see `review-engine.md`); flashcards remain a **secondary** surface, not the spine.

---

## 11. Real-life task strategy

- Every **module** includes at least one lesson (or clear sub-sequence) where output is **actionable**: short message, dialogue completion, plan + phrase, or “what would you say” with **criteria**.
- **Success criteria** live in `assessment.success_criteria` + step-level interactions where possible.
- **Integration scripts** summary on unit (`integration_scripts_summary`) anchors scenarios (AH, huisarts, landlord) for authors and QA.

---

## 12. Repetition / reinforcement strategy

- **Within lesson**: guided practice blocks + **four-skills wrap-up** (listening, reading, writing, speaking in one short round).
- **Across module**: same grammar ID reappears with **new context** and **higher autonomy**.
- **Across bands**: A2.1 patterns embedded in A2.2–A2.3 tasks as **fluency**, not re-teaching from zero.
- **Review layer**: SRS and mistake-driven review **outside** the main lesson timeline (`review-engine.md`).

---

## 13. Review lesson strategy

- **No mandatory “review lesson type”** as a separate catalog silo for MVP — instead:
  - **In-path**: short revision steps inside archetype H / recap steps where generator places them.
  - **Out-of-path**: **Revision** / **Review** surfaces (FD-02 extension + `CurriculumReviewPanel`, local queue today).
- **Future**: Optional **checkpoint lessons** (unit end) — 5–8 minute **mixed drill** pulling `grammar_primary` + lemmas from the unit.

---

## 14. Checkpoint / milestone strategy

| Milestone | Trigger | UX |
|-----------|---------|-----|
| **End of module** | Last lesson in `lesson_ids` | Celebrate + “weak areas” nudge + enqueue review |
| **End of band** | Last unit in `a2_bands[].unit_ids` | Band badge + optional short assessment (future) |
| **A2 complete** | All modules done | Certificate narrative + B1 entry (future) |

**Persistence**: Today progress is **demo-scenario** driven; product target is **server-side `lesson_progress`** (see guided-catalog deep-dive).

---

## 15. Naming system for modules and lessons

| Entity | Pattern | Example |
|--------|---------|---------|
| **Module (unit)** | `a2-m{nn}-{slug}` or legacy `a2-u{nn}` | `a2-m02-food-shopping` |
| **Lesson** | `{moduleId}-l{nn}` | `a2-m02-l04` |
| **Grammar spine ID** | `a2.{band}.{topic-kebab}` | `a2.1-separable-verbs` |

**Stability**: Never reuse a lesson **id** for different content; ship **new id** for replacements.

---

## 16. Rules: A2 vs too easy vs too advanced

| Criterion | Too easy (pre-A2) | A2 OK | Too advanced (B1+) |
|-----------|-------------------|-------|---------------------|
| Clause length | only words / lists | short compound sentences | long hypotaxis, nuance essays |
| Grammar | no clause structure | controlled subordination late A2 | full indirect speech, complex relatives |
| Task | recognition only | **produce** one usable utterance/message | abstract debate |
| Vocabulary | classroom-only | daily domains + light admin | specialised professional jargon default |

**Operational check**: Each lesson **must** ship **2–4 `can_do_outcomes`** testable by a lay observer in **≤2 minutes** each.

---

## 17. Content quality guardrails

1. **Original Dutch** — no pasted copyrighted coursebook text.
2. **NL-norm** first; note BE/NL only when teaching ambiguity.
3. **Inclusive scenarios** (work, family, admin, health) within scope.
4. **Generator validation** must pass (`scripts/generate_a2_nl_curriculum.py`) before bundle publish.
5. **Self-check items**: prefer **tagged** errors (`common_error_tags`) for analytics and review prioritisation.
6. **Accessibility of copy**: instructions in instruction locale; target language in activities.

---

## 18. Evolution toward B1

- **B1** introduces extended discourse, opinion argumentation, wider subordination, and formal extended writing — **new spine document** (`b1-grammar-spine.md`, future) + **new bands** (B1.1–B1.3).
- **A2 lesson IDs** remain stable; **bridge module** (m12) may preview **one** B1 pattern without assessing it for mastery.
- **Review engine** should carry **cross-level** items only when tagged with `cefr_level` (future schema).

---

## 19. Related repository artifacts

| Artifact | Role |
|----------|------|
| `docs/curriculum/a2-grammar-spine.md` | Grammar ID vocabulary |
| `docs/curriculum/populating-level-curriculum.md` | JSON field contract (A2 bundle) |
| `data/curriculum/nl-NL/A2/catalog.bundle.json` | Runtime bundle |
| `scripts/generate_a2_nl_curriculum.py` | Validate + assemble bundle |
| `src/demo-data/curriculum/a2Catalog.ts` | Strict TS mirror |
| [`post-a2-continuation.md`](./post-a2-continuation.md) | After A2 path complete: B1 vs real-life mastery vs targeted tune-up |

---

## 20. Assumptions (explicit)

- **A1 completion** or placement equivalent is **out of scope** for this doc; A2 path may later add **A1 brush-up** module.
- **Exam labels** (KNM/ONA) are **themes only** — not proprietary exam text.
- **Mobile-native shell** (Capacitor/React Native) is **not** in repo today; curriculum contract is **shell-agnostic** but **mobile-first UX** is mandatory in `lesson-engine.md` / `component-system.md`.
