# UI Fix Log

**Purpose**: Record fixes applied to the UI during validation-and-repair cycles.

---

## Run 1 (initial)

| Fix ID | Gap ID | Description | Status |
|--------|--------|-------------|--------|
| FIX-001 | — | Create validation folder structure and docs (index, gap log, fix log, spec-update log, validation-runs). | Done |
| FIX-002 | GAP-001, GAP-006 | Wire Settings dead buttons: Notifications, Email, Mic, Privacy, Export, Delete, Help. | Done |
| FIX-003 | GAP-002 | HomePage empty state when recommended.length === 0. | Done |
| FIX-004 | GAP-003 | Listening: catalog or handle missing exerciseId; use exerciseId. | Done |
| FIX-005 | GAP-005 | Add NotificationSettingsPage and route; wire Notifications row. | Done |

### Fix details (Run 1)

- **FIX-002**: Added NotificationSettingsPage (toggles for email/push + placeholder copy). Added SettingsPlaceholderPage for section/:section (email-preferences, microphone, privacy, export-data, delete-account, help). Wired all Settings buttons to navigate to /app/settings/notifications or /app/settings/section/:section.
- **FIX-003**: HomePage "Continue learning" always shows section; when recommended.length === 0 renders EmptyState with "Browse lessons" CTA.
- **FIX-004**: Added ListeningCatalogPage and route /app/practice/listening; MOCK_LISTENING_EXERCISES; ListeningPage uses exerciseId and shows exercise title, back to catalog, "not found" when invalid id; added Listening card on Home.
- **FIX-005**: Included in FIX-002 (NotificationSettingsPage + route).
