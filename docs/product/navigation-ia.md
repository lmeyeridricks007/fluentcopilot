# Navigation IA — FluentCopilot (logged-in app)

**Superseded tab model:** see **`behavior-driven-app-architecture.md`** for the current **Talk · Coach · Exam · Library** IA and redirects.

The notes below are kept for historical comparison only.

---

## Previous bottom navigation (5 tabs)

| Tab      | Route root        |
|----------|-------------------|
| Learn    | `/app/learn`      |
| Practice | `/app/practice`   |
| Exams    | `/app/exam-prep`  |
| Review   | `/app/review`     |
| Progress | `/app/progress`   |

## Previous header behavior

Tab-root pages showed **FluentCopilot** (tap → home); deep pages showed **Back** + section title from `src/lib/routing/appNavigation.ts`.
