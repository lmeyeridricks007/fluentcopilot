# A2 Dutch — multimodal curriculum design (review draft)

## Document info

| Attribute | Value |
|-----------|--------|
| Status | **Review** — product / pedagogy; not yet tied to JSON schema version |
| Locale | Target: **nl-NL** (Netherlands Dutch); instruction layer can stay EN |
| Audience | Adults (L2); integration-oriented and general learners |

---

## 1. Why this document exists

The current **A2 path in the app** is a **thin demo**: a small set of catalog lessons mapped into units, with **guided lesson screens** that still behave like short phrase lists. That is **not** a complete A2 programme.

This document describes **how a complete A2 track should work** before more content or engineering investment:

- **Scale** (rough lesson counts and time).
- **Skills** (listening, reading, writing, speaking) plus **culture**.
- **Life domains** (where Dutch is used).
- **Lesson shape** (what a single “lesson” should contain so it feels like a **guided journey**, not three flashcards).

**Out of scope here**: exact wording of exercises, audio scripts, or CMS field names.

---

## 2. Design principles

1. **Every major topic is multimodal** — over the **unit**, the learner must **hear**, **read**, **say/write**, and **reuse** language in a new context (not necessarily all four inside every single 12-minute card).
2. **Culture is explicit** — short, accurate **Netherlands-focused** notes (norms, institutions, daily life), never stereotypes; optional contrast Flanders only when it avoids confusion.
3. **Spiral difficulty** — same functions (e.g. asking clarification, apologising) reappear with new vocabulary.
4. **User-friendly path** — clear **objective → input → guided practice → freer practice → check**; learner always knows **why** they are doing a step.
5. **Variation** — multiple exercise **templates** per skill (not one MC pattern repeated 20×).

---

## 3. Skill dimensions (how they show up in product)

| Skill | In-app manifestations (examples) |
|-------|-------------------------------------|
| **Listening** | Short monologues/dialogues; comprehension questions; “what did they say?”; slow vs natural speed later in level. |
| **Reading** | Signs, messages, short posts, forms, timetables; gist + detail questions. |
| **Writing** | Guided completion (SMS, email, form field), then short free production with phrase bank + model. |
| **Speaking** | Repeat/chunk, structured dialogue (fixed frames), describe picture, role-play prompt; can start with **text-first** if voice not available. |
| **Culture** | “Did you know?” + **situated** practice (e.g. `huisarts` vs pharmacy, `gemeente` basics, birthdays, directness). |

**Rule of thumb for a **full A2 unit** (see §6): across its lessons, each skill should be **touched multiple times**; no unit is “only vocabulary cards.”

---

## 4. Life domains (thematic coverage)

For **Netherlands-oriented A2**, plan units so that **major life areas** appear. Example set (8–10 units — adjust after review):

| # | Domain (unit theme) | Examples of situations |
|---|---------------------|-------------------------|
| 1 | People & daily rhythm | Introductions, routines, time, plans |
| 2 | Food & shopping | Supermarket, market, paying, preferences |
| 3 | Housing & neighbourhood | Rent, neighbours, repairs, rules |
| 4 | Transport & city | OV, directions, delays, appointments |
| 5 | Health & body | GP, pharmacy, mild symptoms, advice |
| 6 | Work & study | Colleagues, simple email, schedules |
| 7 | Admin & services | Gemeente, bank/post, phone scripts |
| 8 | Social & leisure | Invitations, hobbies, opinions (simple) |
| 9 | **Culture & integration context** | Holidays, school/daycare touchpoints, etiquette (explicit unit + threads elsewhere) |

**Dutch culture** appears as: (a) **dedicated short lessons** inside unit 9 and (b) **2–4 minute “culture notes”** embedded in other units (institution names, what to expect, polite norms).

---

## 5. Proposed scale for a “complete” A2 path (for review)

These numbers are **planning targets**, not promises for v1 shipping.

| Layer | Proposal | Rationale |
|-------|----------|-----------|
| **Units** | **8–10** thematic units | Covers life domains without overlap bloat. |
| **Lessons per unit** | **6–9** catalog lessons | Lets each unit cycle skills and deepen topic. |
| **Total catalog lessons (A2)** | **~56–80** | Comparable in *range* to many blended A2 syllabi when each lesson is 15–25 min learner time. |
| **Learner time per lesson** | **15–25 minutes** typical | Includes multiple steps, not one screen. |
| **Total guided time (order of magnitude)** | **~20–35 hours** on-path lessons | Plus revision, scenarios, exam prep elsewhere. |

**Comparison to today’s demo**: the repo’s first JSON pass was **6 units × 4 lessons = 24** lightweight metadata files; the **UI path** further maps only a **subset** of **seed** catalog IDs — so the product **looks** sparse. This design targets **roughly 2–3× more lessons** than the first JSON batch, with **richer internals** per lesson.

---

## 6. Lesson types (mix within each unit)

Rotate **archetypes** so the path does not feel monotonous:

| Archetype | Primary skill lean | Role in unit |
|-----------|-------------------|--------------|
| **A. Input + noticing** | Listening + reading | Dialogue/text + comprehension + short grammar/vocab focus |
| **B. Pattern drill** | Speaking/writing (guided) | Controlled practice, substitutions, mini-dialogue frames |
| **C. Real-world task** | Mixed | “Fix this message”, “Choose appropriate reply”, small role-card |
| **D. Extended listening** | Listening | Longer audio (45–90s A2), tasks in stages |
| **E. Extended reading** | Reading | Short article, infographic, or thread |
| **F. Writing studio** | Writing | Model → gap → short free text with checklist |
| **G. Speaking / interaction** | Speaking | Structured output; later voice-ready |
| **H. Culture capsule** | Culture + any skill | 1 input + 1 application task |

**Per unit**, a practical pattern is:

- **2×** Input+noticing (A)  
- **1×** Pattern drill (B)  
- **1×** Listening emphasis (D) **or** Reading emphasis (E)  
- **1×** Writing studio (F) **or** Speaking (G)  
- **1×** Real-world task (C)  
- **1×** Culture capsule (H) — can be merged with another lesson if short  

That is **7 lesson slots**; add an extra **A** or **C** if you want 8–9.

---

## 7. Standard lesson flow (“user-friendly guide”)

Each **catalog lesson** should follow a **visible spine** in the UI (section headers, progress), e.g.:

| Phase | Duration (indicative) | Purpose |
|-------|------------------------|---------|
| 1. **Goal** | 1 min | “After this you can …” (one can-do). |
| 2. **Warm-up / lead-in** | 2 min | Activate prior words; simple question. |
| 3. **Input** | 4–7 min | Dialogue or text **with** support (gloss, slow audio optional). |
| 4. **Focus** | 3–5 min | 2–3 language points (grammar/pragmatics) with **examples + contrast**. |
| 5. **Guided practice** | 5–8 min | **Varied** tasks (match, transform, choose appropriate, gap-fill, listen-for-detail). |
| 6. **Freer practice** | 3–6 min | Short production (written or spoken frame) using **phrase bank**. |
| 7. **Check** | 2–4 min | Quiz **aligned** to lesson goal; optional self-rating. |
| 8. **Bridge** | 1 min | “Next lesson builds …” / link to scenario or revision. |

**“Only a couple of phrases” is insufficient** for phases 3–6: each lesson should carry **enough input** (8–15 useful chunks at A2, depending on lesson) and **at least 6–12** distinct practice interactions before the quiz.

**Variation** means: alternate **task formats** and **interaction types** (not only translation MC).

---

## 8. Culture & “areas of life”

- **Culture** is not a bolt-on: tie it to **tasks** (“how do you greet a neighbour?”, “what do you say at the doctor’s desk?”).  
- **One unit** (suggested #9) aggregates **cross-cutting** topics: holidays, directness, typical small-talk boundaries, practical institutions (names only, no exam copying).  
- Avoid **proprietary exam text**; keep scenarios **original** but realistic.

---

## 9. Mapping to CEFR A2 (sanity check)

Learners finishing this path (plus app practice elsewhere) should be able to:

- Handle **routine** transactions and social exchanges **with support**.  
- Understand **simple** authentic texts/audio on **familiar** topics.  
- Produce **short connected** writing/speech on familiar matters.

The **catalog depth** (§5) supports that **if** lesson internals match §7; metadata alone is not enough.

---

## 10. Phased authoring (after you approve this doc)

| Phase | Deliverable |
|-------|-------------|
| **P1** | Lock **unit list** + **lesson count per unit** + archetype sequence. |
| **P2** | Author **content_payload** / blueprint steps per archetype (templates). |
| **P3** | Produce **media** (listening), **validation** pass, beta learner test. |
| **P4** | Wire **importer** + app; retire thin demo mapping. |

---

## 11. Open questions for your review

1. **Target total lessons**: closer to **56** (lean) or **80** (broad)?  
2. **Speaking**: mandatory **voice** in A2 path, or **text speaking** acceptable for v1?  
3. **Exam alignment**: should any units be **tagged** for KNM/ONA-style themes without copying exams?  
4. **Premium split**: which archetypes (e.g. extended listening, voice) are **premium-only**?  
5. **Revision**: should culture capsules be **spaced** into revision decks automatically?

---

## 12. Related docs

- `docs/curriculum/populating-level-curriculum.md` — JSON file layout and `lesson_plan` fields.  
- `docs/features/deep-dives/cefr-curriculum-path.md` — product/path behaviour (ordering, today, revision).  
- `data/curriculum/nl-NL/A2/` — first **skeleton** content batch (to be expanded per this design).  
- **`docs/curriculum/prompts/full-a2-multimodal-curriculum-authoring-prompt.md`** — copy-paste **Composer prompt** to generate the full multimodal A2 JSON curriculum per this design.

---

**Next step (your review):** confirm §5 counts, §6 mix, and §7 lesson spine; then we can derive a **concrete unit–lesson table** (titles + archetypes only) as the next artifact.
