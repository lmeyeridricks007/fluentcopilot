# Guided scenario — mobile-first conversational refactor

Implementation-oriented notes for the FluentCopilot **Guided Scenario** flow after the chat-first, pinned-composer redesign.

## Problems in the previous long-scroll design

- **Prompt and reply were vertically separated**: users scrolled between scenario copy, the active line, hints, phrase lists, and the composer.
- **No persistent reply surface**: the input lived far below context blocks, breaking conversational rhythm.
- **Help was stacked**: hints, phrases, and “more help” consumed vertical space instead of opening on demand.
- **Limited listening practice**: no first-class replay for the model line.
- **Typing-only bias**: no structured path to answer by voice.
- **Worksheet feel**: the screen read as a lesson document, not a rehearsal / chat trainer.

## New information architecture

| Zone | Responsibility |
|------|----------------|
| **Sticky header** (`ScenarioStickyHeader`) | Back, scenario title, short subtitle, optional progress widget |
| **Compact goal** | One-line “Doel · …” control; full goal only when expanded |
| **Scrollable thread** (`GuidedConversationThread`) | Prior + current turns; last assistant turn visually emphasized; per-line **Luister** |
| **Fixed composer** (`GuidedStickyComposer`) | Starters, type/speak, helper row, **Verstuur** — always above safe area + tab offset |
| **Sheets** | Phrases (`PhraseAssistSheet`), hint (`GuidedHelpBottomSheet`), extended tools (`GuidedHelpBottomSheet` + `GuidedCalmSupportRow`) |
| **Prep** (`ScenarioPrepCompact`) | Scene card, mode stepper blurb, **Start de scène**, **Zinnen bekijken** |
| **Result** | Unchanged product surface: `PracticeFeedbackScreen` after `phase === 'complete'` |

## Phase model

1. **Preparation** (`intro` / `phrases`): compact scene summary; optional phrase sheet (checkpoint `phrases` auto-opens sheet); **Start de scène** runs entitlement check and `START_CHAT`.
2. **Active scene** (`chat`): thread + pinned composer; no long-form lesson stack.
3. **Wrap-up** (`complete`): feedback presenter (confidence, XP, coaching, next actions).

## Pinned composer

- `GuidedStickyComposer` is **`position: fixed`** at the bottom of the viewport (`max-w-lg` centered), with bottom margin to clear the app tab bar (`mb-[calc(3.5rem+env(safe-area-inset-bottom))]`).
- The chat scroll region uses **bottom padding** (`pb-[min(48vh,320px)]`) so the last bubbles are not hidden behind the composer.
- **Starters** are horizontal chips above the composer; tap fills the field (editable before send).

## Text vs voice reply

- **Typen / Spreken** segmented control when `allowCustom` is true.
- **Spreken** uses `useNlSpeechRecognition` (browser Speech Recognition, Dutch). Flow: record → optional **Zet in tekstveld** → edit → **Verstuur**, or type mode for direct typing.
- `onSend(modality)` passes `'typing' | 'voice'` into `submitReply`; first-response analytics maps **`voice` → `speaking`** for `trackScenarioFirstResponse`.

## Listening support

- `useGuidedTurnAudio` wraps **Web Speech API** TTS (`nl-NL`) with `play` / `playSlower` (lower rate) / `stop`.
- Each assistant bubble has **Luister**; composer row adds **Luister** / **Langzamer** for the **current** assistant line.
- Playback stops when the active assistant message id changes (new turn).

## Helper tools (on demand)

- **Hint**: opens bottom sheet with turn hint text (if any).
- **Zinnen**: phrase bank sheet; pick appends to composer (including **prep** so lines can be preloaded before **Start**).
- **Meer**: sheet with Easier (boost + opens hint + phrases), `GuidedCalmSupportRow` (repeat, another way, redo, key phrase, meaning, simpler, natural), plus inline cards for repeat text / simpler / natural when relevant.

## Component map (suggested)

| Component | Role |
|-----------|------|
| `ScenarioStickyHeader` | Sticky app bar |
| `ScenarioPrepCompact` | Prep body + CTAs |
| `GuidedModeProgressStepper` | Guided → Semi → Free copy |
| `GuidedConversationThread` | Chat bubbles + listen |
| `GuidedStickyComposer` | Fixed composer + modes + tools |
| `PhraseAssistSheet` | Phrase list sheet |
| `GuidedHelpBottomSheet` | Generic sheet shell for hint / more |
| `useGuidedTurnAudio` | TTS hook |

## Future enhancements

- **Server or bundled TTS** for consistent Dutch voices and offline support (replace reliance on `speechSynthesis` quality per OS).
- **True voice submit** path (send audio or ASR server-side) if product requires replies without typing.
- **Starter “use this”** one-tap send after optional micro-edit.
- **ConversationProgress** in header: simplify or merge with subtitle to reduce crowding on small phones.
- **Haptics / motion** polish for record, send, and step complete (where Capacitor or PWA allows).
- **Sheet safe-area** token audit (`safe-area-pb`) vs Tailwind config.

## Acceptance checklist (implementation)

- [x] Prompt + thread scroll; composer stays fixed; generous bottom padding on thread.
- [x] Listen + slower replay for current line; per-bubble listen.
- [x] Type and speak paths; send records modality for first response.
- [x] Help via sheets, not stacked blocks.
- [x] Starters adjacent to composer.
- [x] Prep / active / result phases distinct.
