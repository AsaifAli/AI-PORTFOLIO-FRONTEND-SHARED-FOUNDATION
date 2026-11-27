# Active workspace rollout plan

The shared React workspaces are already implemented in this repository and pinned as a submodule by the Studio website. This plan is for integration, verification and a controlled rollout—not for creating another frontend hosting service.

1. Keep the four active workspaces building from the pinned shared frontend submodule: EvidenceFlow, QuoteSense, FlowPilot and Engineering Assurance.
2. Verify the Studio Worker static-asset build serves each workspace from its same-origin `/shared-frontend/<app>/` path.
3. Verify secure client sign-in, one-time BYOK handoff, HttpOnly app-scoped session cookies, project-bound Gateway status and revocation.
4. Verify EvidenceFlow's streamed chat, document upload/removal, evidence/citation inspection and insufficient-evidence behavior against its live FastAPI backend.
5. Verify QuoteSense uploads and analyzes multiple quotations, presents deterministic scoring and risk/validation results, and handles API failures correctly.
6. Verify FlowPilot workflow discovery, run creation, queued/running/completed/failed states, pause/stop behavior and individual content-draft approvals against its live API.
7. Verify Engineering Assurance remains read-only and presents replay quality separately from content-free application activity for all three active products.
8. Run authenticated browser tests from the Studio client workspace, including client switching, sign-out and upstream session revocation.
9. Keep the rollout flag default-off until all critical checks pass. Enable the shared workspace routes only after the QA evidence is reviewed.
10. Keep the current product UIs and independent backends intact as rollback paths. Remove or redirect an old UI only in a separate, product-specific change after parity and rollback tests pass.

The shared frontend does not own product data, authentication policy, provider credentials, queues or application business logic. Each backend remains authoritative for its own domain and access checks.