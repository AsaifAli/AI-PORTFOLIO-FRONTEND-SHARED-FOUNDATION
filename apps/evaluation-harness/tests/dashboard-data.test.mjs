import test from 'node:test';
import assert from 'node:assert/strict';
import { parseQuality, parseActivity } from '../src/dashboard-data.mjs';

test('parseQuality keeps the three supported projects and safe numeric metrics', () => {
  const parsed = parseQuality({
    targets: {
      evidenceflow: {
        score: 0.91, passed: true, cases: 12,
        gate_failures: ['one'],
        lineage: { dataset_version: 'v3', private_note: 'discard' },
        metrics: { 'recall@5': 0.9, groundedness: 0.92, secret: 1, citation_correctness: '0.8' },
      },
      quotesense: { score: 1.2, passed: true, cases: 4, metrics: {} },
      flowpilot: {
        score: 0.88, passed: true, cases: 4, gate_failures: [],
        metrics: { workflow_completion: 1, approval_compliance: 1, private_metric: 1 },
      },
      legacylens: { score: 0.99, passed: true, cases: 1, metrics: {} },
    },
    runs: [{ target: 'evidenceflow', created_at: '2026-11-26T12:00:00Z' }],
  });

  assert.deepEqual(Object.keys(parsed.targets), ['evidenceflow', 'flowpilot']);
  assert.equal(parsed.targets.evidenceflow.score, 0.91);
  assert.equal(parsed.targets.evidenceflow.gateFailureCount, 1);
  assert.equal(parsed.targets.evidenceflow.datasetVersion, 'v3');
  assert.deepEqual(parsed.targets.evidenceflow.metrics, { 'recall@5': 0.9, groundedness: 0.92 });
  assert.equal(parsed.targets.evidenceflow.latestReplayAt, '2026-11-26T12:00:00.000Z');
  assert.equal('private_note' in parsed.targets.evidenceflow, false);
  assert.equal(parsed.targets.flowpilot.score, 0.88);
  assert.deepEqual(parsed.targets.flowpilot.metrics, { workflow_completion: 1, approval_compliance: 1 });
  assert.equal('legacylens' in parsed.targets, false);
});

test('parseQuality rejects malformed snapshots without throwing', () => {
  assert.equal(parseQuality(null), null);
  assert.equal(parseQuality({ targets: [] }), null);
  assert.equal(parseQuality({ targets: { evidenceflow: { score: 2, passed: true } } }), null);
});

test('parseActivity returns bounded aggregate summaries only', () => {
  const parsed = parseActivity({
    total_events: 9,
    projects: {
      evidenceflow: {
        events: 5, successful: 4, warnings: 1, failed: 0,
        average_duration_ms: 321.4,
        last_event_at: '2026-11-26T12:01:00Z',
        last_status: 'warning',
        raw_events: [{ prompt: 'must not escape' }],
      },
      quotesense: {
        events: 4, successful: 4, warnings: 0, failed: 0,
        average_duration_ms: null, last_event_at: null, last_status: 'success',
      },
      flowpilot: {
        events: 0, successful: 0, warnings: 0, failed: 0,
        average_duration_ms: null, last_event_at: null, last_status: 'no activity',
      },
    },
  });

  assert.equal(parsed.totalEvents, 9);
  assert.equal(parsed.projects.evidenceflow.events, 5);
  assert.equal(parsed.projects.evidenceflow.lastStatus, 'warning');
  assert.equal(parsed.projects.quotesense.averageDurationMs, null);
  assert.equal(parsed.projects.flowpilot.events, 0);
  assert.equal(parsed.projects.flowpilot.lastStatus, 'no activity');
  assert.equal('raw_events' in parsed.projects.evidenceflow, false);
});

test('parseActivity rejects incomplete aggregate responses', () => {
  assert.equal(parseActivity(null), null);
  assert.equal(parseActivity({ projects: { evidenceflow: {} } }), null);
});

test('parseQuality includes FlowPilot only with its workflow assurance metric allowlist', () => {
  const parsed = parseQuality({
    targets: {
      flowpilot: {
        score: 0.875,
        passed: true,
        cases: 4,
        gate_failures: [],
        lineage: { dataset_version: 'flowpilot-v2', private_note: 'discard' },
        metrics: {
          workflow_completion: 1,
          step_coverage: 0.9,
          approval_compliance: 1,
          retry_recovery: 0.75,
          state_integrity: 1,
          error_classification_accuracy: 1,
          audit_traceability: 1,
          private_metric: 1,
        },
      },
    },
    runs: [{ target: 'flowpilot', created_at: '2026-11-27T00:10:00Z', notes: 'discard' }],
  });

  assert.deepEqual(Object.keys(parsed.targets), ['flowpilot']);
  assert.equal(parsed.targets.flowpilot.score, 0.875);
  assert.deepEqual(parsed.targets.flowpilot.metrics, {
    workflow_completion: 1,
    step_coverage: 0.9,
    approval_compliance: 1,
    retry_recovery: 0.75,
    state_integrity: 1,
    error_classification_accuracy: 1,
    audit_traceability: 1,
  });
  assert.equal(parsed.targets.flowpilot.latestReplayAt, '2026-11-27T00:10:00.000Z');
  assert.equal('private_note' in parsed.targets.flowpilot, false);
});

test('parseActivity requires and returns all three project aggregates without event rows', () => {
  const parsed = parseActivity({
    total_events: 7,
    projects: {
      evidenceflow: {
        events: 2, successful: 2, warnings: 0, failed: 0,
        average_duration_ms: 210, last_event_at: '2026-11-26T12:00:00Z', last_status: 'success',
      },
      quotesense: {
        events: 2, successful: 1, warnings: 1, failed: 0,
        average_duration_ms: 310, last_event_at: '2026-11-26T13:00:00Z', last_status: 'warning',
      },
      flowpilot: {
        events: 3, successful: 2, warnings: 1, failed: 0,
        average_duration_ms: 1234, last_event_at: '2026-11-27T00:15:00Z', last_status: 'warning',
        raw_events: [{ output: 'private workflow content', run_id: 'private-id' }],
      },
    },
  });

  assert.deepEqual(Object.keys(parsed.projects), ['evidenceflow', 'quotesense', 'flowpilot']);
  assert.equal(parsed.projects.flowpilot.events, 3);
  assert.equal(parsed.projects.flowpilot.lastStatus, 'warning');
  assert.equal(parsed.projects.flowpilot.averageDurationMs, 1234);
  assert.equal('raw_events' in parsed.projects.flowpilot, false);
});
