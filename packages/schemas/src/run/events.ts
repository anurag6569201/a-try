import { z } from 'zod';
import { RunMode, RunState } from '@preview-qa/domain';

const RunModeSchema = z.nativeEnum(RunMode);
const RunStateSchema = z.nativeEnum(RunState);

// Input to create a new run record
export const CreateRunInputSchema = z.object({
  pullRequestId: z.string().min(1),
  repositoryId: z.string().min(1),
  installationId: z.string().min(1),
  sha: z.string().regex(/^[0-9a-f]{40}$/, 'must be a full 40-char SHA'),
  mode: RunModeSchema,
  triggeredBy: z.enum(['push', 'rerun_command', 'smoke_command']).default('push'),
});

// Valid state transitions — enforced at the schema layer for event validation
const STATE_TRANSITIONS: Record<RunState, RunState[]> = {
  [RunState.Queued]: [RunState.WaitingForPreview, RunState.Planning, RunState.Canceled],
  [RunState.WaitingForPreview]: [RunState.Planning, RunState.BlockedEnvironment, RunState.Canceled],
  [RunState.Planning]: [RunState.Running, RunState.Failed, RunState.Canceled],
  [RunState.Running]: [RunState.Analyzing, RunState.Failed, RunState.Canceled],
  [RunState.Analyzing]: [RunState.Reporting, RunState.Failed],
  [RunState.Reporting]: [RunState.Completed, RunState.Failed],
  [RunState.Completed]: [],
  [RunState.Failed]: [],
  [RunState.BlockedEnvironment]: [RunState.Canceled],
  [RunState.NeedsHuman]: [RunState.Canceled],
  [RunState.Canceled]: [],
};

export const RunStateTransitionSchema = z
  .object({
    runId: z.string().min(1),
    fromState: RunStateSchema,
    toState: RunStateSchema,
    reason: z.string().optional(),
    previewUrl: z.string().url().optional(),
    githubCheckId: z.number().int().positive().optional(),
  })
  .refine(
    (data) => (STATE_TRANSITIONS[data.fromState] ?? []).includes(data.toState),
    (data) => ({
      message: `Invalid transition: ${data.fromState} → ${data.toState}`,
      path: ['toState'],
    }),
  );

export type CreateRunInput = z.infer<typeof CreateRunInputSchema>;
export type RunStateTransition = z.infer<typeof RunStateTransitionSchema>;
