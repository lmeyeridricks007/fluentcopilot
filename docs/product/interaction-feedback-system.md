# Interaction & feedback system (FluentCopilot)

Practical reference for **sound**, **motion**, **guided conversation pacing**, and **accessibility** hooks. Tone: calm, premium, mobile-native — not arcade gamification.

## Architecture

| Layer | Location | Role |
|--------|-----------|------|
| **Sound cues** | `src/lib/interaction/appSounds.ts` | Procedural Web Audio; cue IDs; debounce per cue |
| **Reduced / calm** | `src/lib/interaction/prefersReducedInteraction.ts` | System `prefers-reduced-motion`, `data-fc-motion`, `motionCalm` pref |
| **Device prefs** | `src/lib/device/devicePrefs.ts` | `subtleSoundsEnabled`, `motionCalm` (persisted) |
| **Legacy tap API** | `src/lib/device/deviceFeedback.ts` | `playOptInTapSound()` → `playAppSound('tap')`; mission chime uses `streak_extend` |
| **Motion tokens** | `tailwind.config.js` | `fc-*` keyframes + `motion-safe:` variant |
| **HTML sync** | `src/components/interaction/MotionPreferenceSync.tsx` | Sets `document.documentElement.dataset.fcMotion` |
| **Count-up** | `src/hooks/useCountUp.ts` | XP-style number ease; respects reduced interaction |
| **Typing row** | `src/components/interaction/CoachTypingIndicator.tsx` | Partner “typing” placeholder |

## Sound cues (`AppSoundCue`)

| Cue | Typical use |
|-----|----------------|
| `tap` | Generic micro-tick (via `playOptInTapSound`) |
| `primary_action` | High-intent primary (e.g. start guided scene) |
| `nav_tab` | Tab / segmented control |
| `scenario_submit` | Guided send |
| `partner_turn` | Before partner line reveal |
| `answer_strong` / `answer_ok` / `answer_weak` | Reserved for outcome emphasis (feedback screen maps outcome → sound) |
| `completion_success` | Session wrap-up |
| `xp_tick` | XP emphasis |
| `streak_extend` | Streak / daily completion–style reward |
| `unlock_soft` | Progression (reserved) |

**Gating:** sounds run only if `subtleSoundsEnabled` and **not** `prefersReducedInteraction()` (system reduced motion **or** user **Calmer motion**).

**Replacement strategy:** keep `playAppSound(cue)` stable; swap internals to short OGG/WebM buffers per cue when assets exist.

## Motion principles

- **Micro:** ~150–200ms (send, press).
- **Reveal:** ~320–480ms (partner line, feedback hero).
- **Tailwind:** `motion-safe:animate-*` so animations respect `prefers-reduced-motion: reduce`.
- **User “Calmer motion”:** `html[data-fc-motion='reduced']` in `src/styles/globals.css` shortens transitions/animations (alongside system setting).

## Guided scenario conversation flow

1. User taps **Verstuur** → `scenario_submit`, `conversationFlow = sending` (composer shows “Verzenden…”).
2. After `scenarioConversationDelaysMs().sendMs` → `submitReply` runs, `conversationFlow = revealing`.
3. If the new last message is **assistant** → hide that bubble, show `CoachTypingIndicator`, `partner_turn` sound, then after `partnerRevealMs` reveal line with `motion-safe:animate-fc-message-in`.
4. If terminal (last message **user**) → skip typing; flow returns to `idle`.

## Practice feedback (`PracticeFeedbackScreen`)

- **Hero:** `motion-safe:animate-fc-feedback-hero` + subtle outcome ring (success / partial / needs practice).
- **Sound:** one outcome chime on mount; optional `xp_tick`; `streak_extend` when retention payload includes a streak message.
- **XP:** `useCountUp` for “+N XP earned” line.

## Where cues fire (current)

- **Bottom nav:** `nav_tab`
- **Practice mode switcher:** `nav_tab`
- **Guided:** `primary_action` (start), `scenario_submit`, `partner_turn`; completion sounds on **feedback** screen
- **Feedback screen:** outcome + XP + streak
- **Various CTAs:** still use `playOptInTapSound()` → `tap` where already wired

## Accessibility & settings

- **Account → Preferences:** **Subtle sounds** (`subtleSoundsEnabled`), **Calmer motion** (`motionCalm`).
- **System:** `prefers-reduced-motion: reduce` disables sounds in `appSounds` and short-circuits `useCountUp` / scenario delays (faster `sendMs` / `partnerRevealMs`).

## Future enhancements

- Short **audio assets** per cue + volume slider.
- **Haptics** map aligned with sound cues on Capacitor (partially present in `deviceFeedback`).
- **Focus mode** / **quiet hours** flag (mute non-critical cues).
- **Learn path** stagger uses existing `path-*` animations; extend with shared `motion-safe` enter utilities.
- **Confidence %** count-up on feedback hero.
