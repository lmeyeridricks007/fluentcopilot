# Admin Review Tooling — Component Inventory

## Layout
- **AdminLayout** — Shell with SidebarNavigation + AdminTopBar + main outlet.
- **SidebarNavigation** — Left nav: Dashboard, Review Queue, Batches, Prompts, Scenarios, Published, Validation Logs, Audit Logs, Settings.
- **AdminTopBar** — Role switcher, user email, environment badge (Dev).

## UI (admin-specific)
- **StatCard** — Label + value + optional icon; default and muted variants.
- **StatusBadge** — pass/fail/warning/pending/approved/rejected/published/draft.
- **PageHeader** — Title, optional description, optional actions.
- **SectionCard** — Section with title bar and content.

## Review
- **RejectReasonDialog** — Reason dropdown, optional note, Confirm/Cancel.
- **RegenerationRequestDialog** — Intent input, optional hint, Confirm/Cancel.

## Shared (learner app)
- **Button** — Used in artifact inspector and dialogs.

## Features (pages)
- AdminDashboardPage, ReviewQueuePage, ArtifactInspectorPage, BatchesPage, BatchDetailPage, PromptsPage, ScenariosPage, PublishedPage, ValidationLogsPage, AuditLogsPage, AdminSettingsPage.
