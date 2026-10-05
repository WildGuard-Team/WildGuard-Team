# Architecture and team conventions

## Current foundation

The root npm workspace contains `client/` (React + Vite, JavaScript), `server/` (Express + Mongoose, JavaScript), and `docs/`. One root lockfile keeps dependencies consistent. Phase 2B implements Community Member authentication end to end; reports and SMS are not implemented.

### Frontend

- `src/main.jsx` mounts React and global CSS; `App.jsx` composes the app.
- `src/components/layout/` owns the shared shell.
- `src/components/common/` remains available for generic shared UI.
- `src/context/AuthContext.jsx` owns the authenticated member/session state, while `context/useAuth.js` exposes the focused consumer hook.
- `src/features/auth/` owns auth-only layouts, fields, form feedback, pages, client validation, and API calls.
- `src/pages/MemberLandingPage.jsx` composes the protected Auth milestone landing page.
- The Vite proxy keeps `/api` requests same-origin in local development. Shared client services should be added only when more than one feature uses them.
- `src/index.css` owns foundation styling. Add colocated styles or CSS modules as features grow.

Create these planned folders only when real code needs them; no empty files or placeholder pages:

```text
client/src/
  assets/                         imported application media
  components/
    common/                       generic UI
    layout/                       shared layout
  context/                        genuinely shared React state
  features/
    auth/
      components/                 auth-specific UI
      pages/                      registration/login composition
      services/                   auth API calls
    reports/
      components/                 report-specific UI
      pages/                      report page composition
      services/                   report API calls
  pages/                          application-level pages
  services/                       shared HTTP infrastructure
  routes/                         route definitions when introduced
  App.jsx
  index.css
  main.jsx
```

Pages coordinate behavior and compose small components. Extract forms, validation, API calls, and substantial loading behavior into focused components, functions, services, or hooks. Generic UI belongs in `components/common`; feature UI belongs in its feature. Avoid global context for state used by one form.

### Backend

- `src/app.js` configures Express, CORS, origin checks, session middleware, routes, then 404/error middleware. It does not connect to MongoDB or start a listener.
- `src/server.js` loads and validates configuration, connects MongoDB, creates the persistent MongoDB session store, starts listening, and handles shutdown.
- `src/config/env.js` validates settings; `config/database.js` owns database connection lifecycle and readiness.
- `src/middleware/errors.js` provides JSON 404 and centralized errors without exposing stack traces.
- `src/routes/` owns API route definitions and associates middleware/controllers with endpoint paths. `auth.routes.js` registers the authentication endpoints.
- `test/` checks configuration and HTTP contracts; real database connectivity is a separate smoke check.

Future modules belong in `src/modules/auth/`, `src/modules/reports/`, and `src/modules/sms/`. Add `src/shared/` only for code actually shared by modules. Create only layers each module needs:

| Layer | Responsibility |
| --- | --- |
| Routes | Map methods and paths to middleware/controllers |
| Controllers | Translate validated input and use-case results into HTTP responses |
| Validation | Check and normalize input |
| Services | Coordinate cohesive use cases |
| Repositories/models | Own persistence and database queries |

Keep queries out of controllers. Split services when responsibilities diverge; avoid one service owning every workflow. Prefer functions over artificial one-method classes. The small health endpoint does not need a service/repository chain.

`modules/auth/` owns the User model, validation, password operations, repository, use cases, controllers, and reusable authentication/origin middleware. Public registration assigns `COMMUNITY_MEMBER` in the service; a caller cannot choose a role. Session setup remains in `app.js`/`server.js` because it applies to the whole HTTP application. Reports should use `requireAuthentication` for endpoints requiring a signed-in member. When Reports is implemented, its endpoint definitions belong in `src/routes/reports.routes.js`; keep report validation, controllers, services, and persistence in `src/modules/reports/`. SMS will own provider integration and delivery once requirements are agreed; other modules should use its service interface. No admin roles or approval workflow are defined.

## Integration rules for four contributors

1. Use short feature branches and pull requests. Agree on module ownership before overlapping work; review with another contributor.
2. Coordinate edits to shared files (`App.jsx`, route composition, `app.js`, config, root scripts, lockfile). Integrate small changes frequently.
3. Agree on endpoint paths, payload fields, status codes, identifier types, and validation rules before cross-module work. Keep interfaces stable; document coordinated changes in the same pull request.
4. Register feature routes under `/api` before the final 404/error handlers. Preserve `/api/health` and the JSON error envelope.
5. Install from the root using `npm install <package> --workspace client` or `--workspace server`. Commit the root lockfile and use `npm ci` after pulling dependency changes.
6. Run lint, tests, and the frontend build before review, plus a real backend smoke check when MongoDB is available. Report limitations honestly.
7. Add environment variables only when used; update examples and README together. Never commit local `.env`, credentials, database files, or dependencies.
8. Each local database is independent. Agree on seed fixtures later if needed; Git does not synchronize MongoDB data. A hosted URI can replace the local URI without application code changes.
9. Keep comments focused on non-obvious reasons. Prefer single-purpose functions and meaningful boundaries over giant pages, controllers, services, or premature abstractions.

## Next milestone: Community Report

Community Member registration, login, protected routing, session restoration, and logout are complete. Build report pages and components under `client/src/features/reports/`, protect their server routes with `requireAuthentication`, and keep report validation, use cases, and persistence in `server/src/modules/reports/`.
