# Language consistency — FluentCopilot product rules

This document defines how **English (UI shell)** and **Dutch (target language)** appear together without cognitive noise.

## Principles

1. **One language per surface** — Navigation, instructions, labels, and helper copy for a given screen or block use **English** unless the whole experience is intentionally localized.
2. **Dutch is the learning target** — Phrases, dialogue, and vocabulary lines learners produce or study are **Dutch**.
3. **English help is a separate layer** — Translations and glosses appear as a **secondary line**, **toggle**, or **dedicated help** — not mixed inside the same sentence as Dutch labels like “Jij:” / “Doel:”.

## Where English is used

- App chrome: Home, Learn, Practice, Exams, Account (when shown).
- Scenario flow labels: “Guided scenario”, “Your role”, “Your goal”, “Enter the conversation”, “Prepare what to say”, “Show English meaning” / “Hide English meaning”.
- Buttons and system messages: Send, Hint, Phrases, More help, errors, empty states.
- Scenario titles and scene setup copy in JSON may stay **English** for environment-based scenarios (e.g. “At the café”, “Train station”).

## Where Dutch is used

- Lines the learner **says or hears** in practice: assistant bubbles, suggested replies, phrase list **primary** text.
- Curriculum content, listening scripts, and exam items that are **authentically Dutch** by design.

## Forbidden patterns

- Mixed labels in one block, e.g. “Jij: You’re a traveller”, “Doel: Ask where…”.
- Dutch subtitles on an otherwise English instructional screen without a deliberate NL-localized layout.
- Vague translation toggles (“Hide EN”) when the rest of the shell is English — use **“Show English meaning”** / **“Hide English meaning”**.

## Phrase prep UX

- Default: **Dutch first** in phrase sheets.
- English gloss: user-controlled via **Show English meaning** (off by default for immersion; learners can turn it on).

## Future localization

- When adding full **nl-NL** or other locales, translate **entire** flows (shell + instructions) per locale; do not mix EN instructional chrome with NL labels ad hoc.
- Keep **target language** (Dutch) content stable; localize **instruction** and **navigation** together.

## Related

- Scenario visuals: `docs/product/scenario-image-prompts.md`
- Image registry: `src/lib/practice/scenarioImageRegistry.ts`
