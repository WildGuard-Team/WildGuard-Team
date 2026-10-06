# Architecture and team conventions

## Current foundation

The root npm workspace contains `client/` (React + Vite, JavaScript), `server/` (Express + Mongoose, JavaScript), and `docs/`. One root lockfile keeps dependencies consistent. Phase 2B implements Community Member authentication and basic Community Reporting; SMS is not implemented.

### Frontend

- `src/main.jsx` mounts React and global CSS; `App.jsx` composes the app.
- `src/components/layout/` owns the shared shell.
- `src/components/common/` remains available for generic shared UI.
- `src/context/AuthContext.jsx` owns the authenticated member/session state, while `context/useAuth.js` exposes the focused consumer hook.
- `src/features/auth/` owns auth-only layouts, fields, form feedback, pages, client validation, and API calls.
- `src/pages/MemberLandingPage.jsx` composes the protected Community Member dashboard.
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
    community-reports/
      components/                 report-specific UI and Community layout
      context/                    report draft state
      pages/                      report step composition
      services/                   credentialed report API calls
  pages/                          application-level pages
  services/                       shared HTTP infrastructure
  routes/                         route definitions when introduced
  App.jsx
  index.css
  main.jsx
```

Pages coordinate behavior and compose small components. Extract forms, validation, API calls, and substantial loading behavior into focused components, functions, services, or hooks. Generic UI belongs in `components/common`; feature UI belongs in its feature. Avoid global context for state used by one form.

The implemented Community Reporting UI provides the Community Member dashboard, report-type selection, incident details/manual location, review with accuracy confirmation, submission progress, and a reference-number confirmation screen. It sends credentialed `POST /api/reports` requests and keeps draft data when moving between steps. GPS/manual fallback, optional evidence, SMS reporting, offline persistence, and durable retry remain pending because the current API does not persist them.

### Backend

- `src/app.js` configures Express, CORS, origin checks, session middleware, routes, then 404/error middleware. It does not connect to MongoDB or start a listener.
- `src/server.js` loads and validates configuration, connects MongoDB, creates the persistent MongoDB session store, starts listening, and handles shutdown.
- `src/config/env.js` validates settings; `config/database.js` owns database connection lifecycle and readiness.
- `src/middleware/errors.js` provides JSON 404 and centralized errors without exposing stack traces.
- `src/routes/` owns API route definitions and associates middleware/controllers with endpoint paths. `auth.routes.js` registers the authentication endpoints.
- `test/` checks configuration and HTTP contracts; real database connectivity is a separate smoke check.

Current and planned domain modules are `src/modules/auth/`, `src/modules/community-reports/`, `src/modules/monitoring/`, `src/modules/field-incidents/`, and `src/modules/conservation-reports/`. Add `src/shared/` only for code actually shared by modules. Create only layers each module needs:

| Layer | Responsibility |
| --- | --- |
| Routes | Map methods and paths to middleware/controllers |
| Controllers | Translate validated input and use-case results into HTTP responses |
| Validation | Check and normalize input |
| Services | Coordinate cohesive use cases |
| Repositories/models | Own persistence and database queries |

Keep queries out of controllers. Split services when responsibilities diverge; avoid one service owning every workflow. Prefer functions over artificial one-method classes. The small health endpoint does not need a service/repository chain.

`modules/auth/` owns the User model, validation, password operations, repository, use cases, controllers, and reusable authentication/origin middleware. Public registration assigns `COMMUNITY_MEMBER` in the service; a caller cannot choose a role. Session setup remains in `app.js`/`server.js` because it applies to the whole HTTP application. Community report endpoints use `requireAuthentication`; their validation, controllers, services, and persistence belong in `src/modules/community-reports/`. SMS will own provider integration and delivery once requirements are agreed; other modules should use its service interface. No admin roles or approval workflow are defined.

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

## Community Reporting

`modules/community-reports/` owns Community Member report submission and location lookup. Its routes apply the existing JWT and Community Member restrictions; validation normalizes request contracts; services coordinate submission or lookups; the provider adapter owns external geocoding HTTP; the repository/model own the existing `reports` collection.

### Location contract

`POST /api/reports` accepts `reportType`, `description`, and a `location` object:

```json
{
  "location": {
    "source": "GPS",
    "coordinates": { "latitude": 7.9465, "longitude": 80.7593 },
    "displayName": "Habarana, Anuradhapura District"
  }
}
```

`source` is `GPS`, `MAP`, or `MANUAL`. Coordinates are required for all new submissions; MANUAL additionally requires a 3–300 character `manualLocation`. `displayName` is optional. API coordinates use named latitude/longitude, while MongoDB stores GeoJSON points in `[longitude, latitude]` order. Legacy `{ reportType, description, manualLocation }` submissions remain temporarily supported and normalize to MANUAL with no point; the top-level compatibility field can be removed after the frontend migration.

Responses return the safe report shape with `location.source`, named `location.coordinates` (or `null` for legacy reports without a point), `displayName`, and `manualLocation`.

### Location lookup

Authenticated Community Members can explicitly call:

- `GET /api/reports/locations/search?q=<text>` — Sri Lanka-restricted manual search, returning up to five `{ placeId, displayName, coordinates }` candidates.
- `GET /api/reports/locations/reverse?latitude=<lat>&longitude=<lng>` — returns `{ location }`, with `location: null` when no address is found.

Search is an explicit action, not per-keystroke autocomplete. The configurable OpenStreetMap-compatible development provider uses a one-request-per-second shared limit, a small in-memory five-minute cache, an identifying User-Agent, and a request timeout. The public Nominatim service is a development integration only; it does not provide production availability guarantees.

Leaflet rendering, OpenStreetMap tile display, browser/device geolocation, map clicking, marker dragging, and selected-candidate placement are frontend responsibilities. The backend never reads device GPS and does not serve map tiles. The client calls explicit search/reverse actions, collects GPS or map coordinates, and submits the normalized location contract.

### Community Reporting location UI

The Incident Details & Location screen uses Leaflet and OpenStreetMap tiles in the client. It asks for browser location permission only when the member selects **Use My Current Location**; a successful result is reverse-geocoded and saved as a GPS location. Members can instead click the map, drag the one report marker (reverse lookup runs after dragging), or explicitly submit a manual search. Search is not per-keystroke autocomplete: selecting a candidate saves its text and coordinates as a MANUAL location. The client submits the nested location payload described above, preserving the JWT-cookie request behavior.

Evidence uploads, SMS reporting, offline synchronization, and durable retry remain deferred.
