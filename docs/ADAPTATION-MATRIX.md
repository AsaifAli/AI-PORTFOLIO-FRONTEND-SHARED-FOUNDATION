# Active frontend adaptation matrix

| App | Primary UX | Backend integration | Distinctive surface | Rollout state |
|---|---|---|---|---|
| EvidenceFlow | API-only document research service | LangGraph-RAG FastAPI API | document ingestion, sparse-first retrieval, citations and safe live task events | No standalone product UI; client access is through the authenticated Studio API proxy |
| QuoteSense | Procurement analytics | quotation-analyzer FastAPI API | supplier comparison, deterministic scoring, risk and validation review | Shared React workspace and allowlisted Studio proxy are present; validate analysis/upload against live API |
| FlowPilot | Workflow operations console | AI Automation Command Center FastAPI API/worker | workflow selection, queued runs, lifecycle controls and approvals | Shared React workspace and allowlisted Studio proxy are present; validate run and approval lifecycle |
| Engineering Assurance | Read-only quality dashboard | ai-engineering-evaluation-harness API | replay quality and aggregate activity | Shared React workspace is read-only; includes EvidenceFlow, QuoteSense and FlowPilot |

## Shared package ownership

- `packages/session`: single-use Gateway handoff parsing, URL scrubbing, same-origin exchange/status/revocation and non-sensitive session metadata.
- `packages/api-client`: cookie-based API requests, consistent headers and structured HTTP failures.
- `packages/types`: common transport contracts.
- `packages/ui`: reusable presentation primitives and visual tokens.
- `packages/workflow`: shared workflow/status primitives.

EvidenceFlow has no frontend app directory; its API contract is documented by the LangGraph-RAG OpenAPI schema and exposed through the Studio same-origin proxy. Product-specific frontend behavior for active UI workspaces remains in `apps/<product>/`. The Studio server owns the fixed upstream origins and the route allowlists; browser code never chooses a backend host or receives a reusable Gateway bearer token.