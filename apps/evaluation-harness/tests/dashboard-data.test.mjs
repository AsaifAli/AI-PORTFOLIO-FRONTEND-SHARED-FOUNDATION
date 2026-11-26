import test from 'node:test';
import assert from 'node:assert/strict';
import { parseQuality, parseActivity } from '../src/dashboard-data.mjs';

test('parseQuality keeps only the two supported projects and safe numeric metrics', () => {
  const parsed = parseQuality({
    targets: {
      evidenceflow: {
        score: 0.91, passed: true, cases: 12,
        gate_failures: ['one'],
        lineage: { dataset_version: 'v3', private_note: 'discard' },
        metrics: { 'recall@5': 0.9, groundedness: 0.92, secret: 1, citation_correctness: '0.8' },
      },
      quotesense: { score: 1.2, passed: true, cases: 4, metrics: {} },
      flowpilot: { score: 1, passed: true, cases: 1, metrics: { score: 1 } },
    },
    runs: [{ target: 'evidenceflow', created_at: '2026-11-26T12:00:00Z' }],
  });

  assert.deepEqual(Object.keys(parsed.targets), ['evidenceflow']);
  assert.equal(parsed.targets.evidenceflow.score, 0.91);
  assert.equal(parsed.targets.evidenceflow.gateFailureCount, 1);
  assert.equal(parsed.targets.evidenceflow.datasetVersion, 'v3');
  assert.deepEqual(parsed.targets.evidenceflow.metrics, { 'recall@5': 0.9, groundedness: 0.92 });
  assert.equal(parsed.targets.evidenceflow.latestReplayAt, '2026-11-26T12:00:00.000Z');
  assert.equal('private_note' in parsed.targets.evidenceflow, false);
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
      flowpilot: { events: 99 },
    },
  });

  assert.equal(parsed.totalEvents, 9);
  assert.equal(parsed.projects.evidenceflow.events, 5);
  assert.equal(parsed.projects.evidenceflow.lastStatus, 'warning');
  assert.equal(parsed.projects.quotesense.averageDurationMs, null);
  assert.equal('raw_events' in parsed.projects.evidenceflow, false);
});

test('parseActivity rejects incomplete aggregate responses', () => {
  assert.equal(parseActivity(null), null);
  assert.equal(parseActivity({ projects: { evidenceflow: {} } }), null);
});
