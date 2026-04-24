import { describe, it, expect } from 'vitest';
import { RunMode, RunState } from '@preview-qa/domain';
import { CreateRunInputSchema, RunStateTransitionSchema } from '../run/events';

describe('CreateRunInputSchema', () => {
  const validInput = {
    pullRequestId: 'pr-1',
    repositoryId: 'repo-1',
    installationId: 'inst-1',
    sha: 'a'.repeat(40),
    mode: RunMode.Smoke,
  };

  it('parses a valid run creation input', () => {
    const result = CreateRunInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('defaults triggeredBy to push', () => {
    const result = CreateRunInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.triggeredBy).toBe('push');
  });

  it('accepts rerun_command as triggeredBy', () => {
    const result = CreateRunInputSchema.safeParse({ ...validInput, triggeredBy: 'rerun_command' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid SHA (not 40 hex chars)', () => {
    const result = CreateRunInputSchema.safeParse({ ...validInput, sha: 'tooshort' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid SHA (uppercase)', () => {
    const result = CreateRunInputSchema.safeParse({ ...validInput, sha: 'A'.repeat(40) });
    expect(result.success).toBe(false);
  });

  it('rejects invalid mode', () => {
    const result = CreateRunInputSchema.safeParse({ ...validInput, mode: 'full' });
    expect(result.success).toBe(false);
  });

  it('rejects empty pullRequestId', () => {
    const result = CreateRunInputSchema.safeParse({ ...validInput, pullRequestId: '' });
    expect(result.success).toBe(false);
  });

  it('rejects unknown triggeredBy value', () => {
    const result = CreateRunInputSchema.safeParse({ ...validInput, triggeredBy: 'webhook' });
    expect(result.success).toBe(false);
  });
});

describe('RunStateTransitionSchema', () => {
  it('allows queued → waiting_for_preview', () => {
    const result = RunStateTransitionSchema.safeParse({
      runId: 'run-1',
      fromState: RunState.Queued,
      toState: RunState.WaitingForPreview,
    });
    expect(result.success).toBe(true);
  });

  it('allows queued → planning (skip wait)', () => {
    const result = RunStateTransitionSchema.safeParse({
      runId: 'run-1',
      fromState: RunState.Queued,
      toState: RunState.Planning,
    });
    expect(result.success).toBe(true);
  });

  it('allows running → canceled', () => {
    const result = RunStateTransitionSchema.safeParse({
      runId: 'run-1',
      fromState: RunState.Running,
      toState: RunState.Canceled,
    });
    expect(result.success).toBe(true);
  });

  it('rejects completed → running (backward transition)', () => {
    const result = RunStateTransitionSchema.safeParse({
      runId: 'run-1',
      fromState: RunState.Completed,
      toState: RunState.Running,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain('toState');
    }
  });

  it('rejects queued → completed (skipping intermediate states)', () => {
    const result = RunStateTransitionSchema.safeParse({
      runId: 'run-1',
      fromState: RunState.Queued,
      toState: RunState.Completed,
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional previewUrl on transition', () => {
    const result = RunStateTransitionSchema.safeParse({
      runId: 'run-1',
      fromState: RunState.WaitingForPreview,
      toState: RunState.Planning,
      previewUrl: 'https://preview.example.com',
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-URL string as previewUrl', () => {
    const result = RunStateTransitionSchema.safeParse({
      runId: 'run-1',
      fromState: RunState.WaitingForPreview,
      toState: RunState.Planning,
      previewUrl: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty runId', () => {
    const result = RunStateTransitionSchema.safeParse({
      runId: '',
      fromState: RunState.Queued,
      toState: RunState.Planning,
    });
    expect(result.success).toBe(false);
  });
});
