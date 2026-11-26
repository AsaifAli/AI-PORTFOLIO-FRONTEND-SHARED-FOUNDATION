# AI Portfolio Frontend Foundation

Shared React + TypeScript + Vite foundation for the six portfolio AI applications.

## Goals

- One implementation of BYOK session capture and API headers.
- One API client and error model.
- Shared UI primitives without forcing identical product UX.
- Shared workflow/status components for agentic applications.
- Five visually distinct application shells:
  - EvidenceFlow — research workstation
  - QuoteSense — procurement analytics
  - WebQA — QA control room
  - FlowPilot — automation operations console
  - LegacyLens — developer modernization workbench
  - Evaluation Harness — read-only engineering assurance dashboard

## Important deployment boundary

This repository is the frontend foundation. It does not replace the existing AI backends. Each app is designed to point at its existing FastAPI/project endpoint through `VITE_API_BASE_URL`.

The existing Streamlit UIs should remain available until each React replacement has passed project-specific smoke tests.

## BYOK flow

The apps read the short-lived `portfolio_llm_session` query parameter, move it into `sessionStorage`, and send it as `Authorization: Bearer <JWT>` to the project backend. Provider API keys are never accepted by the frontend.

## Local development

```bash
npm install
npm run dev:evidenceflow
```

Apps use Vite's standard dev server. Set `VITE_API_BASE_URL` in an app `.env.local` when the project backend is available locally.

## Build

```bash
npm run build
```

## Adaptation rule

Shared code is for mechanics and primitives. Each app owns its information architecture, visual identity, workflow presentation, and project-specific data mapping.


## Validation

```bash
npm install
npm run lint
npm run typecheck
npm run build
```

The repository uses npm workspaces; internal workspace packages use standard semver links compatible with npm 12.


## Evaluation Harness frontend

The `apps/evaluation-harness` workspace is a read-only React interface for the existing Evaluation Harness service. It consumes only `GET /health`, `GET /api/ai-quality`, and `GET /api/application-summary`; it does not trigger replay evaluations, ingest telemetry, or access provider credentials.

The app defaults to same-origin API paths so the final deployment can serve its static assets from the existing Harness service without introducing a separate API service or requiring cross-origin access. Keep the current HTML dashboard available as a rollback path until the React build is served by the Harness and verified with live smoke tests. `VITE_API_BASE_URL` is optional and should only be set when the API explicitly permits the frontend origin.

Run its data-contract tests with `npm run test:evaluation-harness`, and its local UI with `npm run dev:evaluation-harness`. The Vite development/preview server proxies the read-only API paths to the current Harness origin; override this with `VITE_HARNESS_PROXY_TARGET` when testing against another Harness instance.
