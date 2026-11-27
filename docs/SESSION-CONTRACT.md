# Studio project-session contract

This contract describes the deployed Studio proxy flow for QuoteSense and FlowPilot. EvidenceFlow retains its own same-origin FastAPI session implementation. The Evaluation Harness is read-only and does not require a BYOK session.

## Trust and credential boundaries

- The authenticated Studio workspace owns provider selection and the BYOK entry point.
- A provider key is entered into the Studio form and sent only to the Studio's same-origin server route. The Studio sends it server-to-server to the Portfolio LLM Gateway. Product APIs never receive provider keys.
- The Gateway stores the provider credential encrypted in its own session store.
- The Studio creates a short-lived, single-use, project-scoped `portfolio_llm_handoff` code. This code is not a reusable Gateway JWT.
- The workspace identity is derived from a verified Supabase Auth user UUID (or a still-valid legacy access-key record ID during migration). The Studio signs that ID with a short-lived HMAC assertion for Gateway session creation. The Gateway derives the stable owner scope from that signed identity.

## Launch and exchange

1. The Studio launches the app at its same-origin workspace route with exactly one `portfolio_llm_handoff` query parameter.
2. The React app validates the code and immediately removes it from the visible URL before making a network request, telemetry call, redirect, or rendering product content.
3. It sends `POST /api/workspace/apps/<project>/session/exchange` with `{ "code": "..." }`, `credentials: include`, and `cache: no-store`.
4. The Studio server validates the authenticated workspace client, consumes the code with the Gateway using the exact project slug, and validates the Gateway response:
   - a well-formed Gateway access token;
   - `target_project` exactly matching the app;
   - an integer expiry between 1 and 3600 seconds;
   - a valid 64-character hexadecimal owner scope.
5. The Studio sets the Gateway access token itself in a per-app, path-scoped HttpOnly cookie. The exchange response body contains only safe metadata: `active`, `project`, `provider`, `model`, and `expires_at`. It does not return the token or owner scope to JavaScript.

The deployed implementation does **not** create a second opaque browser session ID or a separate Studio-side token table for these two apps. The Gateway JWT is the cookie value, and server-side code is the only application code that reads it.

## Cookie behavior

Each app receives a separate cookie name derived from the app slug and the verified workspace identity ID. Cookies use:

- `HttpOnly` so application JavaScript cannot read the Gateway JWT;
- `Secure` in production;
- `SameSite=Lax`;
- a narrow `Path=/api/workspace/apps/<project>` scope;
- a `Max-Age` no longer than the Gateway session expiry, capped at 3600 seconds.

The browser automatically attaches the cookie to same-origin requests under that path. React receives only safe provider/model/session metadata. It does not copy the JWT into localStorage, sessionStorage, IndexedDB, application state, or request headers.

## Session endpoints

| Method | Path | Deployed behavior |
|---|---|---|
| `POST` | `/api/workspace/apps/<project>/session/exchange` | Consume the one-time code, validate the project-bound Gateway response, set the HttpOnly Gateway-token cookie, return safe metadata |
| `GET` | `/api/workspace/apps/<project>/session` | Read the cookie server-side, call Gateway session status, verify app project, portfolio session project, owner scope and expiry, return safe metadata |
| `POST` | `/api/workspace/apps/<project>/session/revoke` | Enforce same-origin request, revoke the Gateway session, then clear the app cookie after revocation is confirmed |

Session exchange and revocation reject cross-origin requests. Session-bearing responses use `Cache-Control: private, no-store`.

## Product API request flow

- React sends same-origin API requests with `credentials: include` and `cache: no-store`.
- Browser code never reads or attaches the Gateway JWT. The shared API client strips caller-supplied `Authorization`, `X-LLM-Gateway-Token`, and `Proxy-Authorization` headers.
- The Studio route handler resolves the exact app and path from a closed allowlist, reads that app's HttpOnly cookie server-side, then injects `X-LLM-Gateway-Token` on the server-to-server request only when that route requires BYOK.
- The Studio does not forward the browser's Cookie or Authorization headers to product services.
- Product APIs validate the Gateway project token and owner scope before performing owner-scoped operations. QuoteSense requires the token for quotation analysis; FlowPilot requires it for all exposed workflow/run/approval operations.
- The Evaluation Harness proxy is GET-only. It exposes only health, quality and aggregate application-summary endpoints. It does not expose evaluation replay triggers or event ingestion to client browsers.

## Fixed proxy boundary

The Studio routes are a closed application proxy, not a general URL forwarder. Upstream origins are resolved from server-only Worker configuration and constrained to approved HTTPS hostnames. Each project has an explicit route/method allowlist, bounded request/response handling, redirect rejection and safe response headers. Client-supplied host, port, arbitrary path or tenant-owner scope cannot override the server configuration.

The current allowlists expose:
- QuoteSense: health reads and `POST /api/v1/analyses`;
- FlowPilot: workflow/approval reads, run list/create/read, and explicit pause/resume/stop/approval actions;
- Engineering Assurance: GET-only health, quality and aggregate application summary.

## URL and browser-storage rules

- Accept exactly one valid `portfolio_llm_handoff` parameter; reject empty, malformed or duplicate values.
- Strip the handoff parameter before any fetch, telemetry, redirect or UI render.
- Strip and reject the legacy reusable `portfolio_llm_session` query parameter.
- Never store provider keys or Gateway JWTs in localStorage, sessionStorage, IndexedDB, browser logs, analytics or error reports.
- Shared API client base URLs and request paths must be same-origin paths. They cannot be redirected to an external host from component code.

## Failure behavior

Missing, expired, replayed, revoked or invalid project sessions fail closed. Wrong-project handoffs and owner-scope mismatches are rejected. Gateway/session-store failure returns a non-success response; the proxy never downgrades a failed authenticated request to anonymous access. Redirects from Gateway or product upstreams are rejected. Oversized requests and rate-limited requests are bounded and surfaced without leaking upstream credentials.

Logs must not contain provider keys, handoff codes, Gateway JWTs, app cookies, prompts, uploaded documents, or model output.
