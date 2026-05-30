# Scenario Taxonomy — Real-Life Situations

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

This document defines the **scenario taxonomy**: a structured set of real-life situations (café, restaurant, doctor, etc.) used for scenario-based teaching. Each scenario type includes context, goals, vocabulary, key phrases, grammar focus, cultural notes, AI roleplay instructions, difficulty, and common mistakes.

---

## 2. Scope

- **In scope**: Scenario categories and their structure; fields per scenario; use in lessons and AI simulations; scalability (thousands of scenarios).
- **Out of scope**: Specific copy per scenario (content authoring); AI provider prompts (see prompts).

---

## 3. Scenario Categories (Structured List)

| Code | Name (EN) | Typical context | CEFR range |
|------|-----------|------------------|------------|
| cafe | Café | Ordering coffee/tea; small talk | A1–B1 |
| restaurant | Restaurant | Ordering food; complaints; paying | A1–B2 |
| supermarket | Supermarket | Shopping; asking for products; checkout | A1–B1 |
| train_station | Train station | Tickets; platforms; delays | A1–B2 |
| workplace_meeting | Workplace meeting | Meetings; opinions; action items | B1–C1 |
| office_introduction | Office introduction | Introducing yourself; role; small talk | A2–B2 |
| doctor_visit | Doctor visit | Symptoms; advice; prescriptions | A2–B2 |
| pharmacy | Pharmacy | Picking up prescription; asking about medicine | A2–B1 |
| landlord_conversation | Landlord conversation | Rent; repairs; contract | A2–B2 |
| municipality_appointment | Municipality appointment | Registration; documents; procedures | A2–B2 |
| school_daycare | School / daycare | Enrolling; talking to teacher; child-related | A2–B2 |
| dating | Dating | Dating; making plans; polite conversation | B1–B2 |
| social_small_talk | Social small talk | Parties; hobbies; weather; Dutch culture | A1–B2 |
| customer_support_call | Customer support call | Phone; problem solving; follow-up | A2–B2 |
| job_interview | Job interview | Interview questions; experience; goals | B1–C1 |
| bank_post_office | Bank / post office | Banking; sending mail; forms | A2–B1 |
| public_transport | Public transport | Bus/tram; asking for help; OV-chipkaart | A1–B1 |
| housing_viewing | Housing viewing | Viewing apartment; questions to landlord | A2–B2 |
| integration_exam_prep | Integration exam prep | Practice for civic/language exam | A2–B1 |

---

## 4. Scenario Entity Structure (Per Scenario)

Each **scenario** (instance) has:

| Field | Description | Required |
|-------|-------------|----------|
| **context** | 2–4 sentences describing the situation (where, who, what the learner needs to do) | Yes |
| **goals** | List of communication/learning goals (e.g. "Order a coffee and pay", "Explain a symptom") | Yes |
| **vocabulary** | vocabulary_term_ids or list of terms to emphasize in this scenario | Recommended |
| **key_phrases** | Array of { phrase (NL), translation (optional), context } | Yes |
| **grammar_focus** | grammar_rule_ids or topics (e.g. modal verbs, past tense) | Optional |
| **cultural_notes** | Do's and don'ts; tips (e.g. "In NL, pay at counter"; "Use 'u' in formal") | Recommended |
| **ai_roleplay_instructions** | System prompt fragment: role of AI (e.g. "You are a barista"), tone, constraints, key phrases to use | Yes (for AI simulation) |
| **difficulty_level** | CEFR or composite (A1, A2, B1, ...) | Yes |
| **common_mistakes** | Array of { mistake, correction, explanation } | Optional |

---

## 5. AI Roleplay Instructions (Schema)

Stored in `ai_roleplay_instructions` JSONB. Suggested structure:

```json
{
  "role": "You are a friendly barista at a Dutch café.",
  "setting": "The learner is a customer. Keep the conversation short (2–4 exchanges).",
  "must_include": ["greeting", "order", "price", "thank you"],
  "tone": "friendly, patient",
  "language": "Dutch only unless learner asks for help in English",
  "constraints": ["Do not give vocabulary unless asked", "Use simple vocabulary at A1–A2"]
}
```

- **Purpose**: Injected into system prompt for scenario conversation; ensures consistent pedagogy and safety.
- **Versioning**: Part of scenario version; change when scenario is updated.

---

## 6. Cultural Notes (Schema)

Per scenario or in cultural_context_entries linked to scenario_id:

- **do_s**: Array of strings (e.g. "Say 'alstublieft' when ordering", "Make eye contact").
- **dont_s**: Array of strings (e.g. "Don't skip greeting").
- **notes**: Free text for nuance (e.g. "In Belgium, 'u' is more common in service contexts").

---

## 7. Scalability

- **Thousands of scenarios**: Each scenario is a row; filter by locale, scenario_category_id, difficulty_level. Index on (locale, scenario_category_id), (locale, difficulty_level). Partition by locale if needed.
- **Variants**: Same category (e.g. café) can have multiple scenarios (e.g. "Café – order only", "Café – small talk") with different difficulty or focus; same structure.
- **Localization**: New teaching language = new scenario rows with same category codes; translate context, goals, key_phrases, cultural_notes.

---

## 8. Use in Lessons and Runtime

- **Static lesson**: Lesson can reference scenario_id; lesson content includes scenario context and key_phrases; exercise can be "practice with AI" linking to same scenario.
- **Runtime**: User selects scenario → load scenario row → use ai_roleplay_instructions + key_phrases + vocabulary in conversation prompt; no lesson row required for pure conversation, or create a "scenario session" linked to scenario_id.
- **Recommendation**: Recommend scenarios by level and category; "You haven't tried 'doctor_visit' yet" or "Practice café again".

---

## 9. Dependencies

- **database-schema.md**: scenarios table, scenario_categories table.
- **content-entities.md**: Scenario entity definition.
- **prompt-template-catalog.md**: Roleplay prompt template that consumes ai_roleplay_instructions.
- **cultural-context-dataset.md**: Cultural notes can live in scenario or in cultural_context_entries.
