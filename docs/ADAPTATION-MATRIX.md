# Active frontend adaptation matrix

| App | Primary UX | Backend integration | Distinctive surface | Rollout state |
|---|---|---|---|---|
| EvidenceFlow | Research workstation | LangGraph-RAG FastAPI API | streamed research, evidence registry, citations, document library | Shared React build and Studio same-origin proxy are present; validate end-to-end before enabling rollout |
| QuoteSense | Procurement analytics | quotation-analyzer FastAPI API | supplier comparison, deterministic scoring, risk and validation review | Shared React workspace and allowlisted Studio proxy are present; validate analysis/upload against live API |
| FlowPilot | Workflow operations console | AI Automation Command Center FastAPI API/worker | workflow selection, queued runs, lifecycle controls and approvals | Shared React workspace and allowlisted Studio proxy are present; validate run and approval lifecycle |
| Engineering Assurance | Read-only quality dashboard | ai-engineering-evaluation-harness API | replay quality and aggregate activity | Shared React workspace is read-only; includes EvidenceFlow, QuoteSense and FlowPilot |

## Shared package ownership

- `packages/session`: single-use Gateway handoff parsing, URL scrubbing, same-origin exchange/status/revocation and non-sensitive session metadata.
- `packages/api-client`: cookie-based API requests, consistent headers and structured HTTP failures.
- `packages/types`: common transport contracts.
- `packages/ui`: reusable presentation primitives and visual tokens.
- `packages/workflow`: shared workflow/status primitives.

Product-specific behavior remains in `apps/<product>/`. The Studio server owns the fixed upstream origins and the route allowlists; browser code never chooses a backend host or receives a reusable Gateway bearer token.