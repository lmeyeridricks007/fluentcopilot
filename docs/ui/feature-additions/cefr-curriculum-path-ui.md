# UI implementation: CEFR curriculum path (E-16)

**Status**: Implemented (mock-backed)  
**Feature flag**: `NEXT_PUBLIC_CURRICULUM_PATH_UI` — set to `false` to hide all surfaces (default: enabled when unset)

---

## 1. Routes

| Route | Page / component |
|-------|------------------|
| `/app/learn` | `LessonDiscoveryPage` — tabs **Path** \| **Review**; **Explore** at `/app/learn/explore` |
| `/app/revision` | `RevisionSessionPage` — mock revision quiz |
| `/app/home` | `TodayPlanSection` embedded |
| `/app/progress` | `CurriculumProgressSummary`, `WeakAreasCard` |
| `/app/settings/profile` | Study path level + lessons/day (zod-validated) |

---

## 2. Navigation

- **Bottom nav**: **Learn** stays active on `/app/revision`.
- Deep links: `/app/learn?tab=browse` redirects to **Explore** (`/app/learn/explore`).

---

## 3. Components (source)

| Component | Path |
|-----------|------|
| `CurriculumPathPanel` | `src/features/curriculum/CurriculumPathPanel.tsx` |
| `TodayPlanSection` | `src/features/curriculum/TodayPlanSection.tsx` |
| `RevisionSessionPage` | `src/features/curriculum/RevisionSessionPage.tsx` |
| `WeakAreasCard` | `src/features/curriculum/WeakAreasCard.tsx` |
| `CurriculumProgressSummary` | `src/features/curriculum/CurriculumProgressSummary.tsx` |

---

## 4. State & mocks

| Piece | Path |
|-------|------|
| Study context (persisted) | `src/store/studyContextStore.ts` |
| Feature gate | `src/config/curriculumFeature.ts` |
| Mock API | `src/services/curriculumMockService.ts` |
| Path builder + demo units | `src/features/curriculum/types.ts` (`DEMO_CURRICULUM_UNITS`, `buildCurriculumPathModel`, `buildTodayPlan`) |
| Lesson progress for path | `src/mocks/lessonProgress.ts` → `DEMO_LESSON_PROGRESS` |

---

## 5. UX behaviours

- **Path**: Unit accordions; next/continue CTA; premium lock + lesson cap paywall aligned with `useEntitlement`.
- **Today**: Loading skeleton, error + retry, empty “caught up”, items navigate to `/app/learn/[id]`.
- **Revision**: Empty state if no completed lessons (from `MOCK_LESSON_PROGRESS`); else 3-question flow + score + navigation.
- **Profile**: `studyContextSchema` (zod) for level + 1–3 lessons/day; invalidates React Query `['curriculum']` on save.

---

## 6. Backend swap

Replace `curriculumMockService` calls with `fetch('/v1/curriculum/...')` in a thin `curriculumApi.ts`; keep component props stable.

---

## 7. Iteration

- `versions/cefr-curriculum-path-ui-v1.md`
- `reviews/cefr-curriculum-path-ui-review-v1.md` / `v2.md`
- `audits/cefr-curriculum-path-ui-audit.md`
- `final/cefr-curriculum-path-ui-final.md`
