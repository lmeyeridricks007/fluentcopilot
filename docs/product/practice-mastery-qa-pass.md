# Practice & Mastery — holistic QA pass

| Attribute | Value |
|-----------|-------|
| Date | 2025-03-26 |
| Scope | Practice Hub, catalog, guided / semi / free flows, support, feedback, skill tracks, weakness, mastery signals, post-A2, dashboard integration, gating, analytics (read-only in this pass) |
| Source docs | `practice-system-architecture.md`, `practice-schema-overview.md`, `component-system.md`, `review-engine.md`, `analytics-practice-mastery-taxonomy.md` |

---

## 1. Executive summary

Practice & Mastery is **architecturally first-class**: clear mode progression (guided → semi → free), orchestration hooks for A2 guardrails, retention integration, weakness and post-A2 routing, and structured analytics. The main risks for feeling “second-class” are **copy and cognitive load** (long hub, repeated B1 framing), **pedagogical tone** (jargon like “productive struggle,” “training wheels”), and **AI reality**: open turns still use a **deterministic mock** provider while the rich `systemPrompt` is prepared for a future LLM — so “AI quality” in production today is **scenario-bound but pattern-based**, not generative.

This pass **documents** those tradeoffs and **fixes** the highest-impact product issues: clearer mode descriptions, fairer B1-readiness framing, tighter A2 prompt/guardrails, simpler Dutch in one mock branch, feedback sublines that respect adult learners, hub positioning vs Learn, and mission wording aligned with Review terminology.

---

## 2. What is working well

- **Mode model** matches architecture: guided scaffolding, semi as bridge, free as premium + progress gate (`scenarioModeAccess.ts`).
- **A2 guardrails** are explicit in prompts (`cefrGuardrails.ts`) and post-processing (`finalizeAssistantResponse` / `postProcessForA2`).
- **Support tools** are discoverable without dominating semi-guided; free mode collapses support until opened — good mobile compromise.
- **Post-conversation feedback** ties outcomes to confidence, next steps, and weakness signals (`PracticeFeedbackScreen`, `feedbackBuilder.ts`).
- **Post-A2** readiness is **explainable** (bands + weak tags), not a single test (`readinessEvaluator.ts`).
- **Analytics** envelope and scenario lifecycle events support funnels (`analytics-practice-mastery-taxonomy.md`).
- **Practice Hub** surfaces next-best action, missions, streaks, weak areas, categories, and skill tracks in one place — strong retention surface if copy stays digestible.

---

## 3. Highest-impact issues (pre-fix)

| Issue | Dimensions | Severity |
|--------|------------|----------|
| Hub subtitle did not explicitly tie Practice to **Learn** | Consistency, retention | High |
| Duplicate “Ready for B1?” framing (mini card + full section) | Mobile UX, hierarchy | High |
| Mode selector used **jargon** (“productive struggle,” “Premium-style independence”) | Pedagogy, A2 audience | High |
| Guided feedback subline used **“training wheels”** | Pedagogy, tone | High |
| B1 “strengthen first” lacked explicit **not an exam** cue | Pedagogy, trust | Medium–High |
| Semi-guided orchestration rules lacked explicit **A2 sentence** constraint in prompt block | AI quality, A2 | Medium |
| Work scenario mock Dutch line was long / B1-flavoured | AI quality, A2 | Medium |
| Mission copy said “mistake-fix” without **Review** link in learner language | Consistency | Medium |
| Scenario launch explainer did not state **Premium + unlock** for Free in one place | Gating clarity | Medium |

---

## 4. Issues by QA dimension

### 4.1 Pedagogical quality

- **Strong:** Guided structure (goals, phrases, chips), semi with optional support, feedback headlines by outcome.
- **Weak (addressed):** Adult-learner tone (“training wheels”); semi/free intro copy now states when to use support vs push ahead.
- **Remaining:** Skill track **instructions** per exercise vary by content — spot-check JSON in a future content pass; weakness cards depend on tag quality from lessons/review.

### 4.2 AI quality

- **Strong:** Recovery paths, turn policy, persona blocks, mode-specific rules in `scenarioPromptBuilder.ts`.
- **Constraint:** `mockDeterministicAssistantReply` drives visible Dutch in dev/default — not full LLM coherence; provider swap should use `systemPromptForProvider` from orchestrator.
- **Fixed:** Shorter work-meeting reply; semi mode prompt line for A2 sentence length; guardrail against heavy formal/legal Dutch unless scene fits.

### 4.3 A2 appropriateness

- **Strong:** Difficulty bands, `clampAssistantReplyDutch`, complexity drift detection.
- **Remaining:** Some mock branches (e.g. doctor advice) are long — mitigated by global clamp; monitor with real TTS/listening.

### 4.4 Mobile usability

- **Strong:** Single-column hub, `min-h-touch`, horizontal category scroll with snap.
- **Weak:** Hub is **long** (many sections) — mitigated by clarifying section labels and de-duplicating B1 title; future: optional collapse or “Jump to” for power users.
- **Fixed:** Readiness mini-card label vs bottom section title no longer identical.

### 4.5 Retention effectiveness

- **Strong:** Missions with XP + streak flags, scenario streak card, continue row, post-A2 banner.
- **Fixed:** Hero copy anchors Practice to **lessons**; modality row subtitle states voice/listening **count toward habit**.

### 4.6 Premium / free gating

- **Strong:** Free mode requires tier + prior success; semi unlock after guided when guided exists.
- **Fixed:** Mode descriptions and `getPracticeModeAccess` hints explain **why** gates exist; launch card mentions Premium + unlock for Free.

### 4.7 Consistency with the rest of the app

- **Fixed:** “Mistake fix” mission description aligned with **Review**; B1 mini-card eyebrow distinct from full section; “Your role” in guided intro matches lesson-style clarity.

---

## 5. Severity / prioritization table

| Severity | Count (examples) | Action |
|----------|------------------|--------|
| Critical | 0 blocking crashes found in static review | — |
| High | Hub/learn link, B1 duplication, mode copy, feedback tone | **Fixed in code** |
| Medium | Mock Dutch length, semi prompt A2 line, mission wording, launch explainer | **Fixed in code** |
| Low | Further hub compaction, LLM wiring, automated E2E | **Deferred** |

---

## 6. Recommended fixes (backlog beyond this pass)

1. **Wire real LLM** for `runPracticeConversationTurn` using existing `systemPromptForProvider`, with mock fallback for offline/tests.
2. **Internal test scripts** for the 10 journeys in the task brief (weak A2 guided first time → post-A2 “strengthen” path).
3. **Hub IA experiment:** collapsible “Build the habit” or reorder so Continue + Daily mission appear above long recommendation lists on small screens.
4. **Speaking in open scenarios:** unify `speaking_mode_used` when STT ships on scenario composers.
5. **Analytics:** first drop-off report using `scenario_abandoned.exit_phase` (`analytics-practice-mastery-taxonomy.md`).

---

## 7. What was fixed during this QA pass

| Area | Change |
|------|--------|
| `ScenarioModeSelector.tsx` | Clearer guided / semi / free descriptions; friendlier fallback when guided missing |
| `scenarioModeAccess.ts` | Shorter, consistent gate hints (Premium + unlock path for Free) |
| `PracticeHubPage.tsx` | Hero ties to lessons; modality subtitle; B1 section title/subtitle; aria label “Today in practice” |
| `ScenarioLaunchPage.tsx` | Launch explainer: guided → semi → free + Premium |
| `OpenPracticeScenarioPage.tsx` | Intro copy for semi vs free (support usage pedagogy) |
| `GuidedScenarioIntro.tsx` | “Your role” label |
| `feedbackBuilder.ts` | Removed “training wheels”; clearer semi/free sublines |
| `readinessEvaluator.ts` | “Strengthen first” body clarifies not an exam score |
| `scenarioPromptBuilder.ts` | Semi-guided: explicit A2 short-sentence rule |
| `cefrGuardrails.ts` | Formal/legal Dutch only when scene fits |
| `mockDeterministicProvider.ts` | Shorter A2-style work reply |
| `ReadinessB1MiniCard.tsx` | Eyebrow: “B1 readiness (at a glance)” vs detail section |
| `missionRegistry.ts` | Daily review mission description mentions Learn & Review |

---

## 8. What still remains for future work

- LLM-backed replies and qualitative review of **first-time weak A2** transcripts.
- Content audit of **catalog scenarios** and guided JSON for tone/level drift.
- Mobile **hub length** and optional progressive disclosure.
- **Premium conversion** messaging A/B (after analytics baseline).
- Automated **E2E** for cap paywall + mode locks.

---

## 9. Overall quality assessment (after fixes)

Practice & Mastery reads as **intentional product**: same design language as dashboard cards, defensible gating, and copy that now **positions Practice as an extension of Learn** rather than a side sandbox. Remaining gap is mostly **implementation depth of AI** (mock vs real model) and **hub density** on small phones — acceptable for beta if analytics and user tests are next.

---

## 10. Recommended next step

**Internal user testing** with 3–5 Dutch A2 learners through journeys 1–5 (guided first time → support-heavy → feedback), then **analytics review** on `scenario_started` → `scenario_completed` and `scenario_abandoned` by `exit_phase` to validate whether copy and IA changes moved completion. After that: **premium conversion optimization** once funnel baselines exist.

---

## Appendix — assumptions

- **Assumption:** Primary runtime for open/semi conversation in development uses `mockDeterministicAssistantReply`; production may inject another provider without changing UX copy in this pass.
- **Assumption:** “Classic chat” (`/app/practice/simulation/...`) remains a legacy/alternate entry; QA focused on new practice routes.
- **Assumption:** English UI copy is the main learner-facing language for explanations; Dutch remains in scenario content and AI lines.
