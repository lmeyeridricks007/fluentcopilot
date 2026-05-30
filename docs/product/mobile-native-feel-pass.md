# Mobile native-feel pass (logged-in)

Implementation-oriented notes for the refinement that pushes Home and shell UX toward **native-first, thumb-friendly, habit loops** without changing IA (bottom nav, Exams tab, launchpad Home).

## Thumb-first layout

- **Home**: Reduced vertical rhythm (`space-y-5`, compact header). Hero + status stay above the fold; “Keep going” is a **single grouped list** so related actions share one visual weight.
- **Primary CTAs**: Hero / resume / exam / practical cards use `nativePress` from `@/lib/design/cardTiers` (touch-manipulation, subtle `active:scale`, opacity) and taller taps where CTAs matter (`min-h-[48px]`–`52px`).
- **Grouped list rows**: `tier3UtilityListShell` + `tier3UtilityRow` for daily review, fix mistakes, practice hub, shortcuts, and account links — consistent **icon · label · chevron** pattern, `min-h-[52px]` rows (shortcuts use a slightly denser `min-h-[48px]`).
- **Bottom nav**: `min-h-[56px]` bar, **even spacing** with `max-w-lg` centered row, per-tab **rounded pill** active state (`bg-primary-50`, ring), `nativePress` on each link, slightly heavier icon stroke when active for scan clarity.

## Copy shortened / resume-oriented

| Area | Direction |
|------|-----------|
| Home header | Subtitle to one line: e.g. “Tap your next move below.” |
| Post-A2 banner | Title + body `line-clamp-2`; tight CTA line |
| Retention (list) | “Continue review” / “Fix mistakes” with time hints |
| Premium card | Short title + one-line value prop |
| Practice hub row | “Practice hub” + “Scenarios · voice · tracks” |
| Shortcuts | Compact labels (Prompts, Dutch from your day, etc.) |

Component-level strings also tightened in: `HomeExamPrepPromoCard` (“Exam mode”, “Train for A2 exam”, “Enter exam prep”), `HomePracticalFocusCard` (“Continue: …”, Resume/Start), `HomeLessonPathCard`, `NextBestActionHero`, `ResumeContinueCard`, `HomeCompactStatusStrip` (“Stats”).

## Cards → list rows

- **Daily review** / **Fix mistakes**: `variant="list"` on Home inside `tier3UtilityListShell` (card variant still available elsewhere).
- **Practice hub**: Inline row in the same group (no separate tier-2 hub card on Home).
- **More tools**: Renamed **Shortcuts**; native-style rows only.
- **Progress & abilities** / **Achievements**: Same list pattern at bottom of Home.

## Interaction feedback

- **`nativePress`** on grouped list buttons, key links, premium buttons, post-A2 link, exam/practical/lesson CTAs (where implemented in child components).
- Bottom nav: scale/opacity from `nativePress` plus **background + ring** on active tab (not only a top stroke).

## Exam Prep as “mode”

- `tier2ExamShell`: left **3px primary accent** + gradient/ring by emphasis.
- `HomeExamPrepPromoCard`: full-surface link, eyebrow **“Exam mode”**, outcome-first title, CTA **“Enter exam prep”**.

## Vertical fatigue

- One **Keep going** section instead of multiple stacked review/hub cards.
- Tighter header; post-A2 and unlock as **single-line or clamped** blocks.
- Shortcuts + account as **dense rows** without large card chrome.

## Future (toward a full native design system)

- **Motion**: Shared `duration-200` spring-free transitions; optional route-level `view-transition` when stable.
- **Haptics**: If wrapping in Capacitor/React Native, map primary taps to light impact.
- **Platform tokens**: iOS 17+ `.glass` / material-inspired nav when in WebView; dynamic type scale.
- **Resume data**: Drive eyebrow copy from real session state everywhere (“2 min left”, “Mock exam ready”).
- **Reachability**: Optional compact mode shrinking header on scroll for one-handed use.

## Key files

- `src/lib/design/cardTiers.ts` — shells, `nativePress`, utility list/row
- `src/features/home/HomePage.tsx` — launchpad composition
- `src/features/home/components/Home*.tsx` — tier-2 surfaces
- `src/features/dashboard/components/NextBestActionHero.tsx`, `src/features/resume/ResumeContinueCard.tsx`
- `src/components/retention/RetentionDailyReviewCard.tsx`, `RetentionFixMistakesCard.tsx`
- `src/components/layout/BottomNav.tsx`
