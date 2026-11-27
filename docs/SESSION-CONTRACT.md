# Studio project-session contract

This contract applies to the active model-backed React workspaces: EvidenceFlow, QuoteSense and FlowPilot. The Evaluation Harness is read-only and does not require a BYOK session. The Studio owns provider selection and raw provider-key custody. Product backends remain independent and must continue enforcing their own project and owner authorization.

## Launch and exchange

1. The authenticated Studio workspace forwards the client's provider key to the Portfolio LLM Gateway over a server-to-server request. Provider keys never reach a product backend or browser storage.
2. The Studio creates a short-lived, single-use `portfolio_llm_handoff` code scoped to the selected project. The app launch URL contains this code, never a reusable Gateway JWT.
3. The React app validates the handoff parameter and removes it from the URL before any network request, telemetry, redirect, or rendering. The code is exchanged using a same-origin POST with `credentials: include`.
4. The Studio server consumes the code with the Gateway for the exact project, validates project, portfolio scope, expiry and owner scope, and stores the Gateway token in an encrypted, TTL-bound server-side record.
5. The browser receives only an opaque session cookie and safe metadata (`active`, `project`, `provider`, `model`, `expires_at`). The raw Gateway token and owner scope are never returned to browser JavaScript.

EvidenceFlow currently provides an equivalent same-origin FastAPI exchange/status/revoke API. QuoteSense and FlowPilot use the authenticated Studio boundary so the project token remains inside the Worker/server-side proxy.

## App session endpoints

| Method | Path | Required behavior |
|---|---|---|
| `POST` | `/api/workspace/apps/<project>/session/exchange` | Consume one-time code, store server-side session, set opaque HttpOnly cookie, return safe metadata |
| `GET` | `/api/workspace/apps/<project>/session` | Verify the cookie and backing record, recheck project Gateway session, return safe metadata |
| `POST` | `/api/workspace/apps/<project>/session/revoke` | Revoke app session, clear cookie and report the result |

EvidenceFlow may use its same-origin `/api/v1/session/exchange`, `/api/v1/session`, and `/api/v1/session/revoke` endpoints.

Cookies must be Secure in production, HttpOnly, SameSite=Lax, scoped to the narrowest compatible app/API path, and expire no later than the Gateway session. Use a high-entropy opaque identifier and store only its digest as the lookup key. Encrypt stored Gateway credentials with an application-specific secret. Session status and revocation must be server-side.

## Product API requests

- Browser requests are same-origin, use `credentials: include` and `cache: no-store`.
- Browser code must never send `Authorization: Bearer <Gateway JWT>` or `X-LLM-Gateway-Token`. The shared API client strips these headers even if a component attempts to add them.
- The Studio proxy resolves the opaque app session, then injects the short-lived project Gateway token server-to-server only for allowlisted requests. Product APIs validate project, portfolio scope, expiry and owner scope before performing operations.
- Owner scope is derived from verified Gateway claims, never from a browser-supplied tenant header/body field. Cross-client access and cross-project tokens are rejected.
- Credential/session lifetime must not outlive the Gateway expiry. Redis/store failure, Gateway verification outage, wrong-project handoff, invalid owner scope, or expired/revoked credentials fail closed.

## Browser and URL rules

- Accept only one `portfolio_llm_handoff` parameter. Reject empty, malformed or duplicate values. Strip it from the visible URL before making a fetch.
- Strip and reject the legacy reusable `portfolio_llm_session` query parameter. It is not a supported credential source.
- Never put provider keys, Gateway JWTs, opaque app-session IDs or cookies in localStorage, sessionStorage, IndexedDB, browser logs, analytics or error reports.
- Shared API client base URLs and request paths must be same-origin paths. API calls must not be redirected to a client-controlled external host.

## Server-side proxy boundary

The Studio routes are a closed application proxy, not a general URL forwarder. Resolve upstream origins from server-only configuration; require HTTPS and explicit hostname allowlists; reject user-controlled host, port and path overrides; apply project-specific path and method allowlists; bound request and response sizes; and do not forward browser Authorization, cookie or internal headers upstream. The Evaluation Harness proxy is GET-only and must not expose replay triggers or telemetry ingestion to the client dashboard.

Responses carrying session information use `Cache-Control: no-store`. Logs must not contain provider keys, handoff codes, Gateway JWTs, app cookies, prompts, uploaded documents, or model output. Use `400` for malformed handoffs, `401` for missing/expired/replayed/revoked sessions, `403` for project/owner mismatches, `413` for oversized requests, `429` for rate limits, and `503` for unavailable Gateway/session storage.
