import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RunMode, ParseOutcome, StepType } from '@preview-qa/domain';

const mocks = vi.hoisted(() => {
  const mockCreatePlan = vi.fn();
  const mockCreateTestCase = vi.fn();
  return { mockCreatePlan, mockCreateTestCase };
});

vi.mock('@preview-qa/db', () => ({
  createPlan: mocks.mockCreatePlan,
  createTestCase: mocks.mockCreateTestCase,
}));

vi.mock('../normalizer.js', () => ({
  normalizeSteps: vi.fn().mockImplementation((_pool, _ai, _runId, steps) => Promise.resolve(steps)),
}));

import { buildPlan } from '../planner.js';

const fakePool = {} as Parameters<typeof buildPlan>[0];
const previewUrl = 'https://preview.example.com';
const runId = 'run-abc';

const smokeStepTypes = [StepType.Navigate, StepType.Assert200, StepType.Screenshot];

const instructionSteps = [
  { type: StepType.Navigate, url: previewUrl },
  { type: StepType.AssertVisible, selector: '.hero' },
  { type: StepType.Screenshot, label: 'hero' },
];

function setupMocks(planId = 'plan-1') {
  let tcOrder = 0;
  mocks.mockCreatePlan.mockResolvedValue({ id: planId, run_id: runId, parse_outcome: ParseOutcome.NotFound, raw_yaml: null, created_at: new Date() });
  mocks.mockCreateTestCase.mockImplementation((_, input: { name: string; steps: unknown[]; order: number }) =>
    Promise.resolve({ id: `tc-${tcOrder++}`, plan_id: planId, run_id: runId, name: input.name, steps: input.steps, order: input.order, created_at: new Date() }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  let order = 0;
  mocks.mockCreatePlan.mockResolvedValue({ id: 'plan-1', run_id: runId, parse_outcome: ParseOutcome.NotFound, raw_yaml: null, created_at: new Date() });
  mocks.mockCreateTestCase.mockImplementation((_, input: { name: string; steps: unknown[]; order: number }) =>
    Promise.resolve({ id: `tc-${order++}`, plan_id: 'plan-1', run_id: runId, name: input.name, steps: input.steps, order: input.order, created_at: new Date() }),
  );
});

describe('buildPlan — smoke mode', () => {
  it('creates one Smoke test case with navigate + assert_200 + screenshot', async () => {
    const output = await buildPlan(fakePool, {
      runId, mode: RunMode.Smoke, previewUrl, parsedSteps: null, rawYaml: null,
    });

    expect(mocks.mockCreatePlan).toHaveBeenCalledWith(fakePool, expect.objectContaining({
      run_id: runId,
      parse_outcome: ParseOutcome.NotFound,
    }));
    expect(output.testCases).toHaveLength(1);
    expect(output.testCases[0]?.name).toBe('Smoke');
    expect(output.testCases[0]?.steps.map((s) => s.type)).toEqual(smokeStepTypes);
  });

  it('ignores parsedSteps in smoke mode', async () => {
    const output = await buildPlan(fakePool, {
      runId, mode: RunMode.Smoke, previewUrl, parsedSteps: instructionSteps as never, rawYaml: null,
    });
    expect(output.testCases[0]?.steps.map((s) => s.type)).toEqual(smokeStepTypes);
  });
});

describe('buildPlan — instruction mode', () => {
  it('uses parsed steps when provided', async () => {
    setupMocks();
    const output = await buildPlan(fakePool, {
      runId, mode: RunMode.Instruction, previewUrl, parsedSteps: instructionSteps as never, rawYaml: 'version: 1\nsteps: []',
    });

    expect(output.testCases).toHaveLength(1);
    expect(output.testCases[0]?.name).toBe('Instruction');
    expect(output.testCases[0]?.steps).toHaveLength(3);
    expect(mocks.mockCreatePlan).toHaveBeenCalledWith(fakePool, expect.objectContaining({
      parse_outcome: ParseOutcome.Found,
    }));
  });

  it('falls back to smoke when parsedSteps is null', async () => {
    const output = await buildPlan(fakePool, {
      runId, mode: RunMode.Instruction, previewUrl, parsedSteps: null, rawYaml: null,
    });
    expect(output.testCases[0]?.steps.map((s) => s.type)).toEqual(smokeStepTypes);
    expect(mocks.mockCreatePlan).toHaveBeenCalledWith(fakePool, expect.objectContaining({
      parse_outcome: ParseOutcome.NotFound,
    }));
  });

  it('persists raw_yaml when provided', async () => {
    setupMocks();
    const yaml = 'version: 1\nsteps:\n  - type: navigate\n    url: https://example.com';
    await buildPlan(fakePool, {
      runId, mode: RunMode.Instruction, previewUrl, parsedSteps: instructionSteps as never, rawYaml: yaml,
    });
    expect(mocks.mockCreatePlan).toHaveBeenCalledWith(fakePool, expect.objectContaining({
      raw_yaml: yaml,
    }));
  });
});

describe('buildPlan — hybrid mode', () => {
  it('creates instruction test case followed by smoke when parsedSteps provided', async () => {
    setupMocks();
    const output = await buildPlan(fakePool, {
      runId, mode: RunMode.Hybrid, previewUrl, parsedSteps: instructionSteps as never, rawYaml: null,
    });

    expect(output.testCases).toHaveLength(2);
    expect(output.testCases[0]?.name).toBe('Instruction');
    expect(output.testCases[1]?.name).toBe('Smoke');
    expect(output.testCases[1]?.steps.map((s) => s.type)).toEqual(smokeStepTypes);
  });

  it('creates only smoke test case when parsedSteps is null', async () => {
    const output = await buildPlan(fakePool, {
      runId, mode: RunMode.Hybrid, previewUrl, parsedSteps: null, rawYaml: null,
    });
    expect(output.testCases).toHaveLength(1);
    expect(output.testCases[0]?.name).toBe('Smoke');
  });

  it('orders instruction before smoke (order=0, order=1)', async () => {
    setupMocks();
    const output = await buildPlan(fakePool, {
      runId, mode: RunMode.Hybrid, previewUrl, parsedSteps: instructionSteps as never, rawYaml: null,
    });
    expect(output.testCases[0]?.order).toBe(0);
    expect(output.testCases[1]?.order).toBe(1);
  });
});

describe('buildPlan — returns planId', () => {
  it('returns the plan id from the db', async () => {
    mocks.mockCreatePlan.mockResolvedValue({ id: 'my-plan-id', run_id: runId, parse_outcome: ParseOutcome.NotFound, raw_yaml: null, created_at: new Date() });
    const output = await buildPlan(fakePool, {
      runId, mode: RunMode.Smoke, previewUrl, parsedSteps: null, rawYaml: null,
    });
    expect(output.planId).toBe('my-plan-id');
  });
});
