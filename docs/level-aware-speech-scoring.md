# Level-Aware Speech Scoring

> How FluentCopilot adjusts scoring expectations by CEFR level.

## Core Principle

An A2 learner saying "Goedemiddag, ik wil een treinkaartje" with slight hesitation should not receive the same score as a B2 learner saying the exact same thing. At A2, that utterance demonstrates functional competence. At B2, it's below expected fluency.

## Scoring Policy by Level

Each CEFR level has a `ScoringPolicy` that adjusts how raw scores are interpreted:

| Parameter | A1 | A2 | B1 | B2 | C1 | C2 |
|-----------|----|----|----|----|----|----|
| **Hesitation strictness** | 0.3 | 0.4 | 0.6 | 0.75 | 0.85 | 0.95 |
| **Wording strictness** | 0.2 | 0.35 | 0.55 | 0.7 | 0.85 | 0.95 |
| **Sentence complexity expected** | 0.2 | 0.35 | 0.55 | 0.7 | 0.85 | 0.95 |
| **Grammar strictness** | 0.3 | 0.4 | 0.6 | 0.75 | 0.85 | 0.95 |
| **Encouragement floor** | +8 | +5 | +2 | 0 | 0 | 0 |
| **Pronunciation band shift** | +5 | +3 | 0 | −3 | −5 | −8 |
| **Fluency band shift** | +8 | +5 | 0 | −3 | −5 | −8 |
| **Rhythm band shift** | +10 | +7 | 0 | −5 | −8 | −10 |

### What these mean

**Encouragement floor** — A minimum score bonus added to all dimensions for beginners. At A1, even a struggling attempt gets +8 points. At B2+, there is no free floor.

**Band shifts** — Audio dimensions (pronunciation, fluency, rhythm) get positive shifts at A1/A2 (easier to reach "building" or "strong enough" bands) and negative shifts at B2+ (harder to score well with the same raw Azure numbers).

**Strictness factors** — Applied to wording and grammar scoring. Higher strictness means the LLM-derived naturalness score is reduced more before display.

## Examples

### A2 learner: "Goedemiddag, ik wil een treinkaartje"
- Azure pronunciation: 72 → +3 shift +5 floor = **80** (Strong enough)
- Azure fluency: 65, 1 hesitation → 62 base, +5 shift +5 floor = **72** (Building)
- Grammar: 85 → low strictness reduces to ~82, +5 floor = **87** (Strong enough)
- **Headline: "Strong enough for A2"**

### B1 learner: Same utterance, same raw scores
- Azure pronunciation: 72 → +0 shift +2 floor = **74** (Building)
- Azure fluency: 65, 1 hesitation → 62 base, +0 shift +2 floor = **64** (Building)
- Grammar: 85 → moderate strictness reduces to ~79, +2 floor = **81** (Strong enough)
- **Headline: "Building at B1 — fluency needs attention"**

### B2 learner: Same utterance, same raw scores
- Azure pronunciation: 72 → −3 shift +0 floor = **69** (Building)
- Azure fluency: 65, 1 hesitation → 62 base, −3 shift +0 floor = **59** (Early step)
- Grammar: 85 → high strictness reduces to ~75, +0 floor = **75** (Strong enough)
- **Headline: "Early step at B2 — fluency is the priority"**

## LLM Integration

The LLM system prompt already references CEFR level expectations:
- A1/A2: "reward intelligibility and scene-appropriate intent"
- B1: "more natural flow, connectors"
- B2+: "stricter wording, rhythm, nuance"

The deterministic scoring engine applies numeric adjustments; the LLM applies qualitative judgment.

## Implementation

```typescript
import { SCORING_POLICY_BY_LEVEL, applyLevelAdjustment } from './speechScoringModel'

const policy = SCORING_POLICY_BY_LEVEL[cefrLevel]
const adjustedScore = applyLevelAdjustment('pronunciation', rawScore, policy)
```
