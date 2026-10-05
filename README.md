# WildGuard

A community wildlife incident reporting application built with MongoDB, Express, React, and Node.js for the SE3070 group project at SLIIT.

Phase 1 provides a runnable frontend shell, backend health endpoint, validated configuration, and team conventions. Authentication, reporting, and SMS are future work.

## Prerequisites

- Node.js 22.12 or newer with npm; use the same Node major version across the team.
- MongoDB Community Server installed locally. Compass is optional and does not replace the database server.
- Git.

Run commands from the repository root. This project uses npm workspaces and one root lockfile. Do not initialize repositories or separate lockfiles in `client` or `server`.

## First-time setup

```sh
npm ci
```

Create local environment files in Windows PowerShell:

```powershell
Copy-Item server/.env.example server/.env
Copy-Item client/.env.example client/.env
```

Or in macOS/Linux/Git Bash:

```sh
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Copy these only on initial setup; preserve existing settings. Both `.env` files are ignored by Git. Never put secrets in `VITE_` variables: Vite includes them in the browser bundle.

| Setting | Default |
| --- | --- |
| Server `PORT` | `5000` |
| Server `MONGODB_URI` | `mongodb://127.0.0.1:27017/wildguard` |
| Server `CLIENT_ORIGIN` | `http://127.0.0.1:5173` |
| Client `VITE_API_BASE_URL` | `http://127.0.0.1:5000/api` |

The server validates configuration and connects MongoDB before listening. Restart the relevant process after editing environment files. The database may not appear in Compass until a future module writes its first document.

## Start MongoDB locally

For MongoDB installed as a Windows service, use an elevated PowerShell terminal when necessary:

```powershell
Get-Service MongoDB
Start-Service MongoDB
```

If already running, no start command is needed. Service names may vary. Alternatively, run `mongod` in a separate terminal with a data directory outside the repository:

```powershell
New-Item -ItemType Directory -Force "$env:LOCALAPPDATA/WildGuard/mongodb"
mongod --dbpath "$env:LOCALAPPDATA/WildGuard/mongodb" --bind_ip 127.0.0.1 --port 27017
```

On macOS/Linux, use your installed MongoDB service manager or run:

```sh
mkdir -p "$HOME/.local/share/wildguard/mongodb"
mongod --dbpath "$HOME/.local/share/wildguard/mongodb" --bind_ip 127.0.0.1 --port 27017
```

For manual startup, `mongod` must be on PATH (or use its installation path). Keep that terminal open. Do not start a second instance if a service already owns port 27017.

## Run the project

```sh
npm run dev
```

This runs both apps. Stop with Ctrl+C. Or use separate terminals:

```sh
npm run dev:server
npm run dev:client
```

- Frontend: <http://127.0.0.1:5173>
- API health: <http://127.0.0.1:5000/api/health>

These are loopback (localhost) URLs. Open the frontend with the hostname configured in `CLIENT_ORIGIN`; `localhost` and `127.0.0.1` are distinct browser origins. Vite uses a strict port to keep CORS predictable. The frontend checks API/database health on page load; refresh after recovering the server.

Check the API in PowerShell:

```powershell
Invoke-RestMethod http://127.0.0.1:5000/api/health
```

Or other terminals:

```sh
curl http://127.0.0.1:5000/api/health
```

A ready response contains `status: "ok"`, `service: "wildguard-api"`, `database: "connected"`, and an ISO timestamp. A database disconnect after startup returns HTTP 503. Unknown routes return JSON HTTP 404; errors use `{ "error": { "message": "..." } }`.

## Checks and build

```sh
npm run lint
npm test
npm run build
```

Tests verify configuration and HTTP contracts with an injected database status; they do not prove real MongoDB connectivity. A running server and successful health response verify that separately.

The build outputs to `client/dist`. `npm run preview --workspace client` previews it on port 4173; temporarily set server `CLIENT_ORIGIN=http://127.0.0.1:4173` and restart the API to test that origin. `npm start` runs the backend without watching. Production hosting is outside Phase 1.

## Troubleshooting

- **MongoDB connection failed:** confirm the service or `mongod` process is running, verify port 27017 and `server/.env`, and connect with Compass or `mongosh` using the example URI. Use `127.0.0.1` to avoid localhost IPv6 mismatches. The backend exits on initial connection failure; restart it after fixing MongoDB.
- **Missing/invalid configuration:** create `server/.env` and correct the variable named in the startup error. The MongoDB URI must include a database name.
- **Frontend cannot reach API:** check the server terminal, API URL, exact `CLIENT_ORIGIN`, and browser URL. Restart Vite after editing its environment file.
- **Port in use:** stop the conflicting process or update the port and corresponding API/CORS configuration together. If changing the Vite port, update its dev script too.

Each of the four developers runs their own MongoDB. Localhost refers to the device running the backend, so developers initially have separate data. Git commits do not share database records. A shared hosted MongoDB deployment can later be configured through `MONGODB_URI` without application code changes; each developer needs authorized credentials and network access. Keep credentials in local environment files.

See [architecture and team conventions](docs/architecture.md). Existing root `assets/` images are preserved as supplied references.

Recommended first commit message: `chore: initialize WildGuard client and server`
