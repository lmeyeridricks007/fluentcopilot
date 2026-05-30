# Home production polish pass

Final **logged-in Home** polish: emotional tone, native density, hero visuals, and section differentiation—without changing IA (launchpad Home, hero, Practical, Exam, Keep going, utility lists, Exams in nav).

## Copy refined

| Surface | Change |
|---------|--------|
| Greeting | Support line is **streak-aware** (momentum / next rep), warmer than a generic CTA hint |
| Status strip | Dropped dry **“Status ·”** prefix; readiness headline stands alone; link **“See progress”** (was “Stats”) |
| B1 readiness | Headlines in `readinessEvaluator.ts` are more supportive (“Building toward B1 — real-life reps first”, etc.) |
| Daily mission / hero | Registry + fallback: **“One quick scenario today”**, friendlier description, **“Start now”**; mission scope label **“Today”** |
| `buildNextBestAction` | Tighter eyebrows (Today, Focus, Keep going, Suggested); shorter mission weak-line suffix (**“Nudge:”**) |
| Resume hero | Eyebrow **“Pick up here”**, CTA **“Continue now”**, alternates **“Also waiting”** |
| Practical card | Eyebrow **“Real life”**, softer defaults, primary **“Continue”** when resumable, secondary **“Browse all practice”** |
| Exam card | Title **“A2 exam mode”**, outcome line for premium vs free, CTA **“Enter exam mode”**, larger mode icon |
| Keep going rows | **“Nothing to review”**, mistakes idle **“Unlocks after a review”** / **“All caught up”** |
| Practice hub row | Subline **“Scenarios, voice & tracks”** |
| Utility section | Renamed **“More ways to learn”**; **“Open Learn”** row label |
| Premium teaser | Slightly warmer value line |
| Milestone chip | **“New milestone ·”** instead of “Unlocked ·” |

## Visual polish

- **Hero + resume hero**: Removed bottom **gradient strip** that caused banding; **single** `bg-gradient-to-br` with soft **corner orbs** only (`isolate`, no layered footer fade). Slightly tuned blues for a smoother read.
- **Exam tier** (`tier2ExamShell`): Stronger **mode** framing — **4px** accent primary, `bg-gradient-to-br` chamber, slightly deeper shadow on secondary emphasis.
- **Status band**: Very soft **vertical gradient** for depth without card chrome.
- **New row tokens** (`cardTiers.ts`): `tier3KeepGoingRow` (compact continuation), `tier3ShortcutRow` (demoted utility density).

## Native feel

- Keep going: **46px** row height, **13px** titles, **10px** subtitles, **18px** chevrons, **7×7** icon tiles.
- **More ways to learn** + account: **44px** rows, **12px** labels, icon-in-tile pattern, **16px** chevrons.
- Bottom nav: Active **inset highlight**, **primary-100** fill, **ring + 150ms** transitions; inactive **slate-600** for legibility.

## Emotional engagement

- Streak- and momentum-oriented greeting line.
- Supportive readiness wording (honest but less punitive).
- XP line on hero: short **“+N XP when you wrap up.”**
- Milestone and Premium copy nudge **forward motion** without gamification noise.

## Exam as destination

- Visual: exam shell gradient + accent + **larger** clipboard tile + **50px** CTA.
- Copy: **“A2 exam mode”** + skills line + **single** outcome sentence + **“Enter exam mode”**.

## Future opportunities

- **Scroll-linked** header compaction; **haptics** on primary CTAs in a wrapped app.
- **Dynamic** greeting from time-of-day + last session.
- **Motion**: 120–180ms shared easing on list rows; optional `prefers-reduced-motion` guard.
- **Resume-aware** exam/practical CTAs when backend exposes partial session state (“Back to mock…”).

## Key files

`HomePage.tsx`, `HomeCompactStatusStrip.tsx`, `HomePracticalFocusCard.tsx`, `HomeExamPrepPromoCard.tsx`, `NextBestActionHero.tsx`, `ResumeContinueCard.tsx`, `RetentionDailyReviewCard.tsx`, `RetentionFixMistakesCard.tsx`, `BottomNav.tsx`, `cardTiers.ts`, `nextBestAction.ts`, `missionRegistry.ts`, `missionPresenterModel.ts`, `buildPracticeHubViewModel.ts`, `readinessEvaluator.ts`, `DailyMissionCard.tsx`
