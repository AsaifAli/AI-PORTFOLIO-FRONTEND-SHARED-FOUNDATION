# Migration plan

1. Deploy shared frontend foundation and verify all six app shells compile.
2. Adapt EvidenceFlow to its existing backend while keeping the old Streamlit UI as fallback.
3. Adapt QuoteSense, WebQA, FlowPilot, and LegacyLens in the same pattern.
4. Adapt the Evaluation Harness dashboard to the read-only React app while preserving its existing API and rollback path.
5. Only remove an individual UI or UI-only deployment after its React replacement is live and passes project-specific smoke tests.
6. Update portfolio project links to the React frontends once stable.
