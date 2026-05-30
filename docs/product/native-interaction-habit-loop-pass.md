# Native interaction & habit-loop pass

Habit/product polish for **logged-in Home** (and shared primitives): tactile CTAs, row feedback, streak/XP motivation, light motion—**without** inflating type globally or undoing IA.

## Interaction refinements

| Area | Change |
|------|--------|
| Design tokens (`cardTiers.ts`) | **`heroPrimaryCta`**: white hero button, deep drop shadow, `ring-2`, press collapses shadow + `scale-[0.97]`. **`surfacePrimaryCta`** / **`examModeCta`**: colored CTAs with teal shadows + press feedback. **`listRowPress`**: list rows use **bg tint + micro-scale** (no 0.98 “card bounce”). **`cardSurfacePress`**: full-card links (exam promo). |
| Hero (`NextBestActionHero`) | **Divider** `border-t border-white/12` before CTA so action zone reads separately from story. CTA uses **`heroPrimaryCta`**. **`fc-home-rise`** entrance animation. Deeper **outer shadow** on hero shell. |
| Resume hero | Same **divider + `heroPrimaryCta`** on native `<button>` (avoid Button variant conflicts). |
| Practical / Lesson cards | Primary links use **`surfacePrimaryCta`**. |
| Exam promo | Whole card **`cardSurfacePress`**; inner CTA **`examModeCta`**; icon tile **gradient + deeper shadow**; eyebrow **“Enter focused mode”**. |
| Lists | **`tier3KeepGoingRow`** / **`tier3ShortcutRow`** use **`listRowPress`** instead of `nativePress`. |
| Bottom nav | Removed generic **`nativePress`**; **`active:scale-[0.96]`**, **200ms** easing, inactive **slate tap wash**, active tab **slightly dimmer** on press. |
| `Button` (global primary) | **Shadow + `active:scale-[0.98]`**; **`touch-manipulation`**; **150ms** transitions. |
| Progress bar | Fill **500ms ease-out** for calmer “progress feels alive” motion. |

## Micro-animations

- **`fc-home-rise`** in `globals.css` — translate + fade on hero inner stack (~420ms, ease-out). **`prefers-reduced-motion`** already shortens transitions project-wide.
- Nav **icon scale** on active tab (slightly higher than before).
- CTA chevron **hover/active translate** on hero link (desktop; touch still gets press scale).

## Streak psychology

- **Home** support line: start streak → protect streak → long streak copy.
- **Status strip**: **“N-day streak”** / **“Streak: start today”**; flame **warmer when active**.

## Reward / XP loops (lightweight)

- Hero XP line: **“+N XP on finish — small win, adds up.”**
- **Milestone chip**: **“You’re moving forward · …”**
- **XP** row in strip slightly **stronger weight** (momentum cue without layout bloat).

## Microcopy tightened

- Mission guided description: **“A quick guided rep to keep your Dutch moving — low pressure.”**
- Practical default: **Useful Dutch for real life — …**; CTA idle **“Start a rep”**.
- Exam outcome: **Train → simulate → mocks** + **Prep under exam pressure.**
- Lesson card: shorter body; CTA **Open Learn** (aligns with utility list).
- Keep going: **Next: daily review** / **All clear**; mistakes idle **After your next review**.
- Premium blurb: shorter, **when you’re ready** framing.

## Card hierarchy (visual weight)

| Tier | Treatment |
|------|-----------|
| **Today’s Move** | Deepest shell shadow; separated CTA block; dominant white button. |
| **Exam mode** | Inset + outer shadow on shell; gradient icon slab; **darker CTA** (`examModeCta`). |
| **Practical / lessons** | **Flatter** `tier2PracticalShell` (light ring + small Y shadow only). |

## Device feedback (implemented)

- **Haptics on daily mission completion**: `missionProgressTracker.completeIfNeeded` calls `onDailyMissionCompletedClient()` (`src/lib/device/deviceFeedback.ts`). Uses **Capacitor `Haptics.notification({ type: 'SUCCESS' })`** when `window.Capacitor.Plugins.Haptics` exists; else **`navigator.vibrate`** pattern on supported WebViews. (Visual **pulse** still respects global reduced-motion CSS; **sounds** respect `prefers-reduced-motion` explicitly.)
- **Home pulse after Today’s Move**: Completion sets **`sessionStorage`**; **`HomePage`** consumes on mount and applies **`fc-todays-move-home-pulse`** (~0.85s ring once). Flag expires after **15 minutes** if Home not opened.
- **Opt-in tap sound**: **`localStorage`** key `fc.devicePrefs.v1` (`tapSoundsEnabled`, default **false**). **Account → Tap sounds** toggle (`SettingsPage`). **`playOptInTapSound()`** on Home primary CTAs, bottom nav; **`prefers-reduced-motion`** disables. When sounds are on, **daily completion** also plays a **short two-tone chime** (lighter than lesson success arpeggio).

## Future

- **Streak at-risk** push / banner when data layer supports it.
- **Native** wrapper: add **`@capacitor/haptics`** so types match runtime without relying on injected `Plugins` shape.

## Key files

`cardTiers.ts`, `globals.css`, `src/lib/device/devicePrefs.ts`, `src/lib/device/deviceFeedback.ts`, `missionProgressTracker.ts`, `NextBestActionHero.tsx`, `ResumeContinueCard.tsx`, `HomePracticalFocusCard.tsx`, `HomeExamPrepPromoCard.tsx`, `HomeLessonPathCard.tsx`, `HomePage.tsx`, `HomeCompactStatusStrip.tsx`, `SettingsPage.tsx`, `BottomNav.tsx`, `Button.tsx`, `ProgressBar.tsx`, `RetentionDailyReviewCard.tsx`, `RetentionFixMistakesCard.tsx`, `missionRegistry.ts`, `buildPracticeHubViewModel.ts`
