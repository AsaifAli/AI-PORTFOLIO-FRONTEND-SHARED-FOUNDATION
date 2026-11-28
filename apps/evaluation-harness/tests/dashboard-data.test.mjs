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

test('parseRuntimeEvaluations separates allowlisted framework scores from project runtime signals', async () => {
  const { parseRuntimeEvaluations } = await import('../src/dashboard-data.mjs');
  const parsed = parseRuntimeEvaluations({
    results: [
      {
        id: 'private-event-id',
        event_type: 'evaluation.completed',
        created_at: '2026-11-28T08:00:00Z',
        project: 'evidenceflow',
        status: 'success',
        workflow: 'rag_query',
        experiment_id: 'rag-experiment-v2',
        dataset_version: 'docs-v2',
        prompt_version: 'answer-v4',
        model_version: 'model-v1',
        config_version: 'retrieval-v3',
        model: 'private provider label',
        metrics: {
          'external.ragas.faithfulness': 0.94,
          'external.ragas.context_precision': 0.88,
          'runtime.citation_coverage': 0.96,
          'retrieval.chunk_count': 4,
          'private.metric': 1,
        },
      },
      {
        event_type: 'evaluation.completed',
        created_at: '2026-11-28T08:01:00Z',
        project: 'quotesense',
        status: 'success',
        metrics: {
          'runtime.extraction_completeness': 0.91,
          'runtime.risk_finding_count': 2,
          'procurement.quote_count': 3,
        },
      },
      {
        event_type: 'evaluation.completed',
        created_at: '2026-11-28T08:02:00Z',
        project: 'flowpilot',
        status: 'success',
        metrics: {
          'runtime.workflow_completion': 1,
          'runtime.approval_compliance': 1,
          'runtime.warning_count': 1,
        },
      },
      { event_type: 'run.completed', project: 'evidenceflow', metrics: { 'runtime.citation_coverage': 1 } },
      { event_type: 'evaluation.completed', project: 'unknown', metrics: { secret: 1 } },
    ],
  });

  assert.equal(parsed.length, 3);
  assert.deepEqual(parsed[0], {
    project: 'evidenceflow',
    createdAt: '2026-11-28T08:00:00.000Z',
    status: 'success',
    experimentId: 'rag-experiment-v2',
    datasetVersion: 'docs-v2',
    promptVersion: 'answer-v4',
    modelVersion: 'model-v1',
    configVersion: 'retrieval-v3',
    frameworkMetrics: {
      'external.ragas.faithfulness': 0.94,
      'external.ragas.context_precision': 0.88,
    },
    runtimeMetrics: {
      'runtime.citation_coverage': 0.96,
      'retrieval.chunk_count': 4,
    },
  });
  assert.deepEqual(parsed[1].runtimeMetrics, {
    'runtime.extraction_completeness': 0.91,
    'runtime.risk_finding_count': 2,
    'procurement.quote_count': 3,
  });
  assert.deepEqual(parsed[2].runtimeMetrics, {
    'runtime.workflow_completion': 1,
    'runtime.approval_compliance': 1,
    'runtime.warning_count': 1,
  });
  assert.equal('id' in parsed[0], false);
  assert.equal('model' in parsed[0], false);
  assert.equal('workflow' in parsed[0], false);
});

test('parseRuntimeEvaluations rejects malformed or unknown runtime metric values', async () => {
  const { parseRuntimeEvaluations } = await import('../src/dashboard-data.mjs');
  assert.equal(parseRuntimeEvaluations(null), null);
  assert.deepEqual(parseRuntimeEvaluations({ results: [] }), []);
  const parsed = parseRuntimeEvaluations({
    results: [{
      event_type: 'evaluation.completed',
      created_at: '2026-11-28T08:00:00Z',
      project: 'evidenceflow',
      metrics: {
        'runtime.citation_coverage': 1.2,
        'runtime.guardrail_blocked': true,
        'external.ragas.faithfulness': false,
        'external.deepeval.faithfulness': 0.9,
      },
    }],
  });
  assert.deepEqual(parsed[0].runtimeMetrics, { 'runtime.guardrail_blocked': true });
  assert.deepEqual(parsed[0].frameworkMetrics, { 'external.deepeval.faithfulness': 0.9 });
});

test('parseExperimentComparisons retains only safe version lineage and allowlisted metric deltas', async () => {
  const { parseExperimentComparisons } = await import('../src/dashboard-data.mjs');
  const parsed = parseExperimentComparisons({
    target: 'quotesense',
    baseline_experiment_id: 'private-baseline-id',
    experiments: [
      {
        experiment_id: 'private-baseline-id',
        is_baseline: true,
        runs: 3,
        score: 0.91,
        pass_rate: 1,
        first_seen: '2026-11-26T10:00:00Z',
        last_seen: '2026-11-27T10:00:00Z',
        lineage: {
          target: 'quotesense',
          model_version: 'model-v1',
          dataset_version: 'quotes-v2',
          prompt_version: 'extract-v3',
          config_version: 'weights-v2',
          private_note: 'discard',
        },
        metrics: { 'runtime.extraction_completeness': 0.9, 'runtime.risk_finding_count': 2, 'private.metric': 1 },
        metric_deltas: { 'runtime.extraction_completeness': 0.04, 'runtime.risk_finding_count': -1, 'private.metric': 1 },
      },
      {
        experiment_id: 'variant-id',
        is_baseline: false,
        runs: 2,
        score: null,
        pass_rate: 0.5,
        first_seen: '2026-11-27T11:00:00Z',
        last_seen: '2026-11-28T11:00:00Z',
        lineage: { model_version: 'model-v2', dataset_version: 'quotes-v2', config_version: 'weights-v3' },
        metrics: {},
        metric_deltas: { 'runtime.extraction_completeness': -0.01, 'runtime.risk_finding_count': 1 },
      },
    ],
  });

  assert.equal(parsed.target, 'quotesense');
  assert.equal(parsed.baselineExperimentId, 'private-baseline-id');
  assert.equal(parsed.experiments.length, 2);
  assert.equal(parsed.experiments[0].isBaseline, true);
  assert.equal(parsed.experiments[0].runs, 3);
  assert.equal(parsed.experiments[0].score, 0.91);
  assert.deepEqual(parsed.experiments[0].lineage, {
    modelVersion: 'model-v1',
    datasetVersion: 'quotes-v2',
    promptVersion: 'extract-v3',
    configVersion: 'weights-v2',
  });
  assert.deepEqual(parsed.experiments[0].metricDeltas, {
    'runtime.extraction_completeness': 0.04,
    'runtime.risk_finding_count': -1,
  });
  assert.equal('experiment_id' in parsed.experiments[0], false);
  assert.equal(parsed.experiments[1].score, null);
});

test('parseExperimentComparisons returns an empty comparison for unsupported targets', async () => {
  const { parseExperimentComparisons } = await import('../src/dashboard-data.mjs');
  assert.equal(parseExperimentComparisons({ target: 'unknown', experiments: [] }), null);
  assert.equal(parseExperimentComparisons({ target: 'evidenceflow', experiments: [] }).experiments.length, 0);
});


test('source filter isolates native project checks from external framework scores', async () => {
  const { filterRuntimeMetricSources } = await import('../src/dashboard-data.mjs');
  const row = {
    frameworkMetrics: {
      'external.ragas.faithfulness': 0.94,
      'external.deepeval.answer_relevancy': 0.89,
    },
    runtimeMetrics: {
      'runtime.citation_coverage': 0.96,
      'retrieval.chunk_count': 4,
    },
  };

  assert.deepEqual(filterRuntimeMetricSources(row, 'native'), {
    frameworkMetrics: {},
    runtimeMetrics: {
      'runtime.citation_coverage': 0.96,
      'retrieval.chunk_count': 4,
    },
  });
  assert.deepEqual(filterRuntimeMetricSources(row, 'ragas'), {
    frameworkMetrics: { 'external.ragas.faithfulness': 0.94 },
    runtimeMetrics: {},
  });
  assert.deepEqual(filterRuntimeMetricSources(row, 'deepeval'), {
    frameworkMetrics: { 'external.deepeval.answer_relevancy': 0.89 },
    runtimeMetrics: {},
  });
  assert.deepEqual(filterRuntimeMetricSources(row, 'all'), row);
});

test('runtime parser retains the complete public metric catalog for every project', async () => {
  const catalogs = {
    evidenceflow: [
      'runtime.citation_coverage',
      'runtime.citation_verification',
      'runtime.grounding_verified',
      'runtime.grounding_partial',
      'runtime.trust_verified',
      'runtime.trust_review_required',
      'runtime.security_blocked',
      'runtime.abstained',
      'runtime.numeric_claims_supported',
      'runtime.guardrail_finding_count',
      'runtime.guardrail_blocked',
      'evidence.verified_count',
      'evidence.proposed_count',
      'retrieval.chunk_count',
      'retrieval.graph_expanded_chunk_count',
      'retrieval.web_source_count',
    ],
    quotesense: [
      'procurement.document_count',
      'procurement.quote_count',
      'runtime.extraction_completeness',
      'runtime.quotation_validation_pass_rate',
      'runtime.scoring_coverage',
      'runtime.cost_comparability',
      'runtime.comparable_line_item_rate',
      'runtime.price_reconciliation_coverage',
      'runtime.price_reconciliation_match_rate',
      'runtime.price_reconciliation_review_rate',
      'runtime.risk_finding_count',
      'runtime.risked_quotation_rate',
      'runtime.price_anomaly_count',
      'runtime.analysis_available',
      'runtime.recommendation_available',
    ],
    flowpilot: [
      'runtime.workflow_completion',
      'runtime.step_coverage',
      'runtime.validation_completed',
      'runtime.approval_compliance',
      'runtime.approval_pending',
      'runtime.audit_traceability',
      'runtime.warning_count',
    ],
  };
  const results = Object.entries(catalogs).map(([project, keys]) => ({
    event_type: 'evaluation.completed',
    created_at: '2026-11-28T08:00:00Z',
    project,
    metrics: Object.fromEntries(keys.map((key) => [
      key,
      key.endsWith('_count') || key.endsWith('.count') || key.includes('document_count') || key.includes('quote_count') ? 2 : 1,
    ])),
  }));
  const { parseRuntimeEvaluations } = await import('../src/dashboard-data.mjs');
  const parsed = parseRuntimeEvaluations({ results });

  for (const [project, keys] of Object.entries(catalogs)) {
    const row = parsed.find((item) => item.project === project);
    assert.ok(row, project + ' runtime evidence should be retained');
    assert.deepEqual(Object.keys(row.runtimeMetrics).sort(), [...keys].sort(), project + ' must expose every website metric');
  }
});
