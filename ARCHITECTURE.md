# FormFlow Phase 2 Architecture

## Runtime architecture

React/Vite owns presentation, routing, authentication state, builder interactions, and public submission UX. Axios attaches short-lived bearer tokens. FastAPI owns authentication, authorization, validation, versioning, auditing, and persistence. SQLAlchemy maps PostgreSQL data; Alembic is the only production schema-change mechanism.

Owner endpoints use `get_current_user` and an ownership guard. An `ADMIN` bypasses ownership filtering but not authentication. Public endpoints resolve an active opaque share token to one immutable `FormVersion.snapshot`; they never read mutable builder data.

## Database changes

- `users`, `refresh_tokens`: identity and revocable refresh-token records.
- `forms`: adds `user_id`, lifecycle status, soft deletion, audit principals, and timestamps.
- `form_versions.snapshot`: frozen JSON containing form, fields, options, and rules.
- `field_options.display_order`: stable option ordering.
- `share_links`: adds lifecycle metadata.
- `form_submissions`, `submission_values`: version-bound response storage.
- `audit_logs`: append-only activity records.

Migrations: `20260706_01_phase2_saas.py` creates Phase 2 and `20260706_02_reconcile_partial_schema.py` safely reconciles databases previously initialized with `create_all`. Existing forms are assigned to a disabled-login legacy owner record, preserving all data. Run `alembic upgrade head` before starting v2.

## API contracts

Authentication:

- `POST /auth/register` → `201 { access_token, refresh_token, token_type, user }`
- `POST /auth/login` → `200` with the same token envelope
- `POST /auth/logout` → `204`
- `GET /auth/me` → authenticated user
- `PATCH /auth/me` updates the profile; `POST /auth/change-password` validates and rotates the password.

Forms and dashboards:

- Existing form, field, publish, archive, version, validation, and share URLs are retained.
- `GET /forms/` retains its original array response for a no-query request. Pagination/search/filter/sort parameters opt into `{items,total,page,page_size,pages}`.
- `PATCH /forms/{id}` edits metadata; `DELETE /forms/{id}` soft-deletes.
- `GET /dashboard/me`, `GET /dashboard/admin` return role-specific metrics.
- `GET /admin/users`, `PATCH /admin/users/{id}/status`, and `GET /admin/forms` are restricted to platform administrators.

Options and order:

- `POST|PATCH|DELETE /forms/{form_id}/fields/{field_id}/options[...]`
- `PATCH /forms/{form_id}/fields/{field_id}/options/reorder`
- Existing `PATCH /forms/{id}/fields/reorder` is retained.

Submissions:

- `GET /public/forms/{token}` returns a frozen snapshot. Legacy `GET /forms/public/forms/{token}` remains supported.
- `POST /public/forms/{token}/submit` validates and stores values; legacy-prefixed submit is also supported.
- `GET /forms/{id}/responses`, `GET /forms/{id}/responses/{response_id}`
- `GET /forms/{id}/responses/export.csv`
- `GET /forms/{id}/responses/export/excel` produces `.xlsx`; `GET /forms/{id}/responses/export/pdf` produces a PDF report.

Errors use `{ "error": { "code", "message", "details" } }` with 400/401/403/404/409/410/422/500 semantics.

## Updated folders

```text
backend/
  migrations/                 Alembic environment and Phase 2 migration
  app/core/                   settings, JWT/BCrypt, auth dependencies
  app/cli/                    admin bootstrap command
  app/models/                 users, submissions, audit plus existing models
  app/routers/                auth, forms, public, dashboard
  app/schemas/                validated API contracts
  tests/                      auth/ownership/version/submission/option tests
frontend/src/
  auth/                       AuthProvider and route guards
  pages/                      auth, dashboards, responses, builder, public form
  test/                       auth/dashboard/builder/submission tests
```

## Deployment order

1. Back up PostgreSQL and set a strong `JWT_SECRET` from `.env.example`.
2. Install `backend/requirements.txt`; run `alembic upgrade head`.
3. Bootstrap an admin: `python -m app.cli.create_admin --name Admin --email admin@example.com --password <strong-password>`.
4. Deploy the API, then build/deploy the Vite client with `VITE_API_URL`.
5. Run `pytest`, `npm test`, `npm run lint`, and `npm run build` in CI.

## Security notes

Access tokens are intentionally short-lived and held in browser session storage, limiting persistence across browser sessions. Refresh-token hashes are stored server-side and revoked at logout. For a same-site production deployment, the recommended next hardening step is transport of refresh tokens exclusively in `HttpOnly`, `Secure`, `SameSite` cookies plus a refresh endpoint; the data model already supports that change.

The platform owner is seeded from `DEFAULT_ADMIN_*` environment variables. Public registration always creates the `USER` role and cannot assign administrative roles. The local development configuration uses `/admin/login` with `admin@formflow.com` / `Admin123`; replace these credentials before a shared deployment.
