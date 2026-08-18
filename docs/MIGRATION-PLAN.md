# Migration plan

1. Deploy shared frontend foundation and verify five app shells compile.
2. Adapt EvidenceFlow to its existing backend while keeping the old Streamlit UI as fallback.
3. Adapt QuoteSense, WebQA, FlowPilot, and LegacyLens in the same pattern.
4. Only remove Streamlit after each project's React UI passes smoke tests.
5. Update portfolio project links to the React frontends once stable.
