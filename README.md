# AI Portfolio Frontend Foundation

Shared React + TypeScript + Vite foundation for the active AI Engineering Studio product workspaces.

## Active workspace applications

- **EvidenceFlow** — API-only document research and evidence service. It has no standalone React/Streamlit product interface; the Studio consumes its authenticated API and safe task-progress events.
- **QuoteSense** — procurement analytics for multi-quotation analysis, deterministic scoring, risk review and exports.
- **FlowPilot** — workflow operations for run creation, execution tracking, approvals and run history.
- **Engineering Assurance** — read-only quality replay and aggregate application activity for EvidenceFlow, QuoteSense and FlowPilot.

## Shared architecture

This repository owns frontend mechanics, not product backends. Each active app keeps its own information architecture, visual identity and domain-specific data mapping while using shared packages for:

- API request handling, cookies and consistent error behavior (`packages/api-client`).
- Secure session bootstrap and revocation (`packages/session`).
- Shared typed contracts (`packages/types`).
- Reusable visual primitives and design tokens (`packages/ui`).
- Common workflow and status primitives (`packages/workflow`).

The Studio website pins this repository as `vendor/shared-frontend`, builds QuoteSense, FlowPilot and Engineering Assurance, and serves those static assets from the existing Cloudflare Worker under `/shared-frontend/<app>/`. EvidenceFlow is consumed only through its same-origin API proxy; no EvidenceFlow frontend assets are bundled.

## BYOK and session security

The current contract is a single-use `portfolio_llm_handoff` code:

1. The Studio creates a project-scoped, short-lived handoff code through its server-side Gateway integration.
2. The receiving app removes the handoff code from the URL before making a network request.
3. The app exchanges the code with the Studio's same-origin session endpoint using `credentials: include`.
4. The Studio proxy exchanges the code with the Portfolio LLM Gateway and stores the returned project token in an HttpOnly, client-scoped cookie.
5. The frontend reads only non-sensitive session metadata. API requests use the same-origin proxy and browser cookies; reusable Gateway bearer tokens are not stored in localStorage or sessionStorage.

The legacy `portfolio_llm_session` bearer query parameter is rejected. Frontend code never accepts provider API keys.

## Backend and deployment boundary

- EvidenceFlow keeps its independent FastAPI/LangGraph backend and publishes OpenAPI plus live, client-safe task lifecycle events.
- QuoteSense keeps its independent FastAPI analysis API and its Streamlit fallback.
- FlowPilot keeps its independent FastAPI workflow API/worker and its Streamlit fallback.
- Engineering Assurance remains a separate read-only dashboard/API.
- Each product retains its own state, authorization and data boundary. The shared frontend is not a shared product database or a replacement for backend authorization.

In production, the Studio Worker proxies only explicitly allowlisted routes to fixed, operator-configured HTTPS origins. Unknown routes are denied. Product API base URLs are not accepted from client-controlled project data.

## Rollout rule

The shared React workspaces are built and bundled, but the Studio-wide rollout flag remains **off by default**. Do not enable it until authenticated browser QA has passed for client sign-in, BYOK handoff, product API behavior, sign-out/revocation and the complete critical workflow in each active app.

Keep the existing QuoteSense and FlowPilot product UIs available as rollback paths until each shared React workspace is proven against its live backend. EvidenceFlow is intentionally API-only. Do not remove or change backend services as part of frontend rollout.

## Local development

```bash
npm ci
npm run dev:quotesense
```

The other active applications have corresponding scripts:

```bash
npm run dev:flowpilot
npm run dev:evaluation-harness
```

The Vite development configuration uses same-origin API paths where possible. Set an app-specific `VITE_API_BASE_URL` only when a local backend runs on a separate origin.

## Validation

```bash
npm run lint
npm run typecheck
npm run test:workspace
npm run build:workspace
```

The shared build uses npm workspaces and the repository's pinned npm toolchain. The Studio build script runs workspace tests and builds the three shared frontend workspaces before copying their `dist` folders into the Worker static assets. EvidenceFlow remains a backend API and is not part of the frontend build.

## Product adaptation rule

Share mechanics and primitives, not every screen. EvidenceFlow deliberately has no standalone product UI; its API and live task events are consumed by the Studio protected client workspace. QuoteSense should feel like a procurement decision cockpit, and FlowPilot like an operations console. Keep their typography, density, color accents, domain workflows and information architecture distinct while maintaining consistent navigation, session behavior, API error semantics and accessible interaction patterns.

## Shared UI quality principles

The shared UI package owns cross-product interaction quality as well as visual primitives. Keep product-specific information architecture, density and accent colors in each app, while applying these foundation-wide rules:

- Use the shared spacing, surface, border, typography and motion tokens before adding one-off values.
- Keep movement purposeful and brief. Preserve the reduced-motion preference in every workspace, including standalone dashboards.
- Make all interactive states visible: hover for pointer users, focus-visible for keyboard users, pressed/selected for stateful controls, and disabled for unavailable actions.
- Maintain usable touch targets, flexible header/action rows and overflow-safe layouts at narrow viewport widths.
- Preserve readable contrast and borders in forced-colors/high-contrast environments.
- Treat the shared shell as a mechanical and accessibility contract, not a mandate to make every product look identical.

The Evaluation Harness uses the same interaction and accessibility baseline while retaining its own cyan/violet assurance-dashboard identity.
