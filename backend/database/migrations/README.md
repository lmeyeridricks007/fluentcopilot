# Database migrations

## Convention

- **One-time forward scripts** live in `migrations/` as `NNN_description.sql`.
- **Baseline schema** is `schema/001_initial_schema.sql` (idempotent `IF NOT EXISTS` blocks for greenfield).
- For **existing environments**, apply migrations in numeric order after baseline.

## Adding a change

1. Create `migrations/002_your_change.sql` with:
   - `IF NOT EXISTS` guards for columns/tables/indexes where possible, **or**
   - explicit one-time `ALTER` with a comment block stating deployment order.
2. Update `docs/backend/database-migrations-and-seeding.md` with rollout notes.
3. For CI/CD, run migrations with `sqlcmd` / SqlPackage post-deploy / Flyway-style runner (team choice).

## Repeatable vs one-time

| Type | Location | Re-run safe? |
|------|----------|--------------|
| Reference seed | `seed/*.sql` | Use `MERGE` / idempotent upserts |
| Schema DDL | `schema/` + `migrations/` | Migrations: usually **no** — run once per env |
