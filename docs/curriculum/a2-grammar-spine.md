# A2 Dutch — grammar spine (nl-NL)

| Attribute | Value |
|-----------|--------|
| Status | **Authoring reference** — aligns units, lessons, and generator validation |
| Locale | nl-NL (instruction locale may be en) |
| Runtime | IDs referenced by `grammar_primary` on lessons and optional checks in `scripts/generate_a2_nl_curriculum.py` |

This document is the **single vocabulary of grammar milestone IDs**. Lesson `grammar_primary` must be one of these IDs (unless explicitly listed in the generator allowlist — keep empty unless a one-off exception is documented).

---

## Band overview

| Band | Learner-facing label | Grammar focus (high level) |
|------|----------------------|----------------------------|
| **A2.1** | Early A2 — routines & transactions | Present tense recap, main-clause word order, separable verbs, modals for requests, polite **u** patterns |
| **A2.2** | Mid A2 — narrative & services | **gaan** + infinitive, time/sequence connectors, perfectum recognition/production in short chunks, reflexives, **om … te** purpose |
| **A2.3** | Late A2 — opinions & admin | **want / omdat / dat**-style subordination (simple), preferences (**graag / liever**), formal register, short relative clauses (**die/dat**) — recognition-heavy where noted |

---

## Milestone IDs (ordered within band)

### A2.1 — present recap & modals

| ID | Milestone | Introduced in (guidance) | Recycled in (guidance) | Example Dutch patterns (original — not from textbooks) |
|----|-----------|--------------------------|-------------------------|--------------------------------------------------------|
| `a2.1-present-tense` | Present of common verbs (weak + high-frequency irregulars) | People & daily rhythm; Food & shopping | All later bands in short clauses | *Ik werk vier dagen.* · *Wij hebben een afspraak.* · *Ga je mee?* |
| `a2.1-main-clause-word-order` | Statement vs yes/no question order | People & daily rhythm | Perfectum and subordinate contrast (later, as recognition) | *Ik ga vanavond naar huis.* · *Ga je vanavond naar huis?* |
| `a2.1-separable-verbs` | Separable verbs in present | People & daily rhythm; Housing | Narratives, emails | *Ik sta om zeven uur op.* · *Bel je me straks terug?* |
| `a2.1-modals-requests` | **willen / kunnen / mogen** for requests and permission | Food & shopping; Health (soft) | Admin & services | *Mag ik een bon?* · *Kunt u me helpen?* |
| `a2.1-imperatives-service` | Polite imperatives in shops/service | Food & shopping | Leisure, workplace | *Geeft u mij …* · *Neemt u een mandje.* |
| `a2.1-comparatives-opinions` | Short comparisons | Food & shopping | Social & leisure | *Dit is goedkoper.* · *Ik vind vers brood lekkerder.* |
| `a2.1-er-locative` | **er is / er zijn**, place prepositions | Housing & neighbourhood | Transport, admin descriptions | *Er is een lift.* · *De sleutel ligt op de tafel.* |
| `a2.1-possessives` | **mijn / jouw / zijn / haar / ons** with nouns | Housing & neighbourhood | Family, work chat | *Onze huur is inclusief servicekosten.* |

### A2.2 — perfectum & word order in longer chunks

| ID | Milestone | Introduced in (guidance) | Recycled in (guidance) | Example patterns |
|----|-----------|--------------------------|-------------------------|------------------|
| `a2.2-motion-and-prepositions` | **naar / met / van … naar …** | Transport & city | Admin, leisure | *Ik ga met de bus naar het station.* |
| `a2.2-future-gaan` | Plans with **gaan + infinitive** | Transport & city | Social invitations | *We gaan zaterdag naar de markt.* |
| `a2.2-time-clauses-basic` | **als / wanneer** (simple main-clause sequencing first) | Transport & city | Work, stories | *Als ik laat ben, stuur ik een appje.* |
| `a2.2-reflexives-health` | **zich** verbs for health/hygiene | Health & body | Daily routine (recycle) | *Ik voel me niet goed.* |
| `a2.2-perfectum-short` | **hebben/zijn + voltooid deelwoord** in short sentences | Health & body; Work & study | Admin narratives | *Ik heb gisteren gewerkt.* · *Ben je op tijd gekomen?* (recognition → production gradually) |
| `a2.2-om-te-purpose` | Purpose with **om … te** | Work & study | Admin emails | *Ik bel om een afspraak te maken.* |

### A2.3 — subordinate clauses, opinions, consolidation

| ID | Milestone | Introduced in (guidance) | Recycled in (guidance) | Example patterns |
|----|-----------|--------------------------|-------------------------|------------------|
| `a2.3-polite-conditional` | **zou / zouden** for soft requests | Admin & services | Health, housing | *Ik zou graag een afspraak willen.* |
| `a2.3-relative-die-dat` | Short **die/dat** relative clauses (recognition → short production) | Admin & services | Housing notices | *Het formulier dat u nodig heeft …* |
| `a2.3-subordinate-want-omdat` | Reasons with **want / omdat** (simple word order) | Social & leisure | Culture unit | *Ik blijf thuis, want ik ben moe.* |
| `a2.3-preferences-graag` | **graag / liever / vind … leuk** | Social & leisure | Leisure dialogues | *Ik ga liever met de fiets.* |
| `a2.3-formal-email-register` | Openings/closings, neutral tone | Work & study; Admin | — | *Geachte mevrouw …* · *Met vriendelijke groet,* |
| `a2.3-impersonal-men` | **men / je** “one” (recognition) | Culture & integration | — | *In Nederland fietsen veel mensen.* · *Je spreekt hier rustig aan.* |
| `a2.3-culture-register` | Fixed chunks for traditions & comparison (no heavy grammar) | Culture & integration | — | *Mag ik vragen hoe jullie dat vieren?* |

---

## Authoring rules

1. Each **lesson** declares **`grammar_primary`** equal to one ID in the tables above (or an approved exception in code).
2. **Language focus** steps embed a **full mini-module** per ID (rule in English, Dutch patterns, production tasks), generated from `scripts/a2_grammar_modules.py`, plus **unit-themed** examples from the curriculum generator — not a single vague paragraph.
3. **Guided practice** ends with an **All four skills** block (listening, reading, writing, speaking) on **every** lesson so modalities are never only implied by archetype.
3. **Later bands assume** main-clause order and present tense are usable; introduce subordination only after learners have stable question/statement patterns.
4. **`recycle_lemmas`** on steps should point back to lemmas still needed for production (generator may suggest from `target_vocabulary_lemmas`).

---

## Related files

- `docs/curriculum/populating-level-curriculum.md` — JSON field documentation  
- `scripts/a2_curriculum_schema.py` — machine-readable spine ID set and helpers  
- `data/curriculum/nl-NL/A2/catalog.bundle.json` — runtime bundle (regenerated)
