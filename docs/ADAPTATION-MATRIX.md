# Frontend adaptation matrix

| App | Primary UX | Backend integration | Distinctive surface |
|---|---|---|---|
| EvidenceFlow | Research/chat | LangGraph-RAG API | evidence registry, citations, streaming |
| QuoteSense | Analytics workspace | quotation API | supplier comparison, scoring, risk |
| WebQA | QA control room | crawler API | crawl tree, browser health, regression |
| FlowPilot | Operations console | automation API | runs, approvals, schedules |
| LegacyLens | Developer workbench | modernization API | migration stages, graph, diff, release gate |

Shared mechanics live in `packages/`. Product-specific mechanics must stay in each `apps/<project>/` adapter.
