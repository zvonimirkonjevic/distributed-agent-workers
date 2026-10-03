# Frontend to Backend Integration

Status: accepted

## Context

The frontend (`services/app`, Next.js 16 App Router) needs to talk to the API gateway (`services/api`, FastAPI). Two kinds of traffic exist:

- **Request/response**: auth, listing and managing chat sessions, user data.
- **Streaming**: a long-lived WebSocket per agent run, carrying tokens and state transitions that the gateway receives through Postgres `LISTEN`/`NOTIFY`.

Options considered:

| Pattern | Summary | Why not (alone) |
|---|---|---|
| Direct, cross-origin | Browser calls `api.example.com` with CORS | CORS config, cross-site cookies are increasingly blocked, tokens drift into `localStorage` |
| Direct, same-origin proxy | Reverse proxy routes `/api/*` to FastAPI, rest to Next.js | Viable, but gives up server rendering with backend data |
| Full BFF | Browser only talks to Next.js, which calls FastAPI | Next.js Route Handlers cannot accept WebSocket upgrades, so streaming must bypass it anyway; it also duplicates the FastAPI gateway as a second gateway |
| **Hybrid** | Next.js server calls FastAPI for request/response; browser talks to FastAPI directly for streaming | Chosen |

## Decision

Use the hybrid pattern, with nginx as the single public entrypoint.

```
                        ┌───────────────── nginx (one origin) ─────────────────┐
browser ── HTTPS ──────▶│ /        ──▶ Next.js ──(server-side fetch)──▶ FastAPI │
browser ── WSS  ───────▶│ /ws/*    ──▶ FastAPI (WebSocket upgrade)              │
                        └───────────────────────────────────────────────────────┘
```

### Request/response goes through the Next.js server

- **Reads** (list sessions, load a session, current user) are fetched in **Server Components**, server-to-server, at FastAPI's internal address (`http://api:8000` inside compose).
- **Mutations** (log in, sign up, create, rename, or delete a session) use **Server Actions**.
- Reads do not use Server Actions. Server Actions are POST-only, not cacheable, and the client dispatches them one at a time, so concurrent reads through them serialize. The Next.js docs recommend Server Components for data fetching and Server Functions for mutations (`node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md`).
- Every Server Action must verify the session itself, since actions are reachable by direct POST requests, not only through the UI.

### Streaming goes from the browser straight to FastAPI

- The browser opens `wss://<origin>/ws/...`; nginx upgrades the connection and forwards it to FastAPI.
- Next.js is never in the streaming path.

### Auth: one httpOnly cookie on the shared origin

1. The login Server Action calls FastAPI, receives a session token, and sets it as an `httpOnly`, `Secure`, `SameSite=Lax` cookie on the app origin.
2. Server Components and Server Actions read the cookie and forward it to FastAPI (e.g. as an `Authorization` header).
3. The browser sends the same cookie automatically on the WebSocket handshake, so the WebSocket endpoint authenticates without tokens in the URL.

This only works because nginx fronts **both** Next.js and FastAPI on one origin. If nginx fronted only the WebSocket endpoint, the cookie set by Next.js would belong to a different origin than the WebSocket in production, and the handshake would arrive without credentials.

## Consequences

- FastAPI stays the only gateway; Next.js is a UI layer that calls it, never a second API surface. This keeps the strict decoupling constraint in `CLAUDE.md`.
- FastAPI does not need CORS, because the browser only reaches it through the shared origin.
- Next.js needs two FastAPI addresses: the internal one for server-side calls, and the public origin (via nginx) for the browser's WebSocket.
- nginx WebSocket proxying needs `proxy_http_version 1.1`, the `Upgrade`/`Connection` headers, and a `proxy_read_timeout` longer than the longest expected idle gap in an agent run (or a heartbeat), otherwise nginx closes idle streams after its 60s default.
- Reconnects after a dropped WebSocket recover progress from persisted state by `task_id`, as the failure-recovery constraint already requires; nginx does not change that.

## Open Questions

- **Typed client**: generate TypeScript types from FastAPI's `/openapi.json` (`openapi-typescript` + `openapi-fetch`, or `@hey-api/openapi-ts`) once the first auth endpoints exist.
- **Local development**: nginx in docker-compose needs to reach the Next.js dev server, which currently runs on the host (`bun run dev`), e.g. via `host.docker.internal:3000`.
- **Session format**: opaque session id stored in Postgres vs. signed JWT. Opaque ids are revocable (logout, ban) without extra machinery.
