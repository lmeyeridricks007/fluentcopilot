# Admin Review Tooling — Route Map

| Route | Screen | Description |
|-------|--------|-------------|
| `/admin` | AdminDashboardPage | Pending review count, stats, quick links, needing attention |
| `/admin/queue` | ReviewQueuePage | Table of queue items, filters (type, status, scenario), Open to inspector |
| `/admin/artifact/:artifactId` | ArtifactInspectorPage | Content, metadata, validation, provenance, scenario, version history, review decisions (Approve, Reject, Edit and approve, Send for regeneration) |
| `/admin/batches` | BatchesPage | Batch list with counts |
| `/admin/batches/:batchId` | BatchDetailPage | Batch stats, list of artifacts in batch |
| `/admin/prompts` | PromptsPage | Prompt template list and versions |
| `/admin/scenarios` | ScenariosPage | Scenario list and artifact counts |
| `/admin/published` | PublishedPage | Published content (placeholder) |
| `/admin/validation` | ValidationLogsPage | Validation runs (placeholder) |
| `/admin/audit` | AuditLogsPage | Audit event timeline |
| `/admin/settings` | AdminSettingsPage | Role display, user, environment |

All admin routes are under `/admin` and use AdminLayout (sidebar + top bar). No learner auth required; role is mocked and switchable from the top bar.
