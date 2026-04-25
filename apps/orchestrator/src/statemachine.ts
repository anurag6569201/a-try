import { RunState } from '@preview-qa/domain';
import type { Pool } from 'pg';
import { transitionRunState, updateRun } from '@preview-qa/db';
import type { Run } from '@preview-qa/db';

export interface TransitionResult {
  success: boolean;
  run: Run | null;
}

export async function transition(
  pool: Pool,
  runId: string,
  fromState: RunState,
  toState: RunState,
  extra?: { previewUrl?: string; githubCheckId?: number; startedAt?: Date; completedAt?: Date },
): Promise<TransitionResult> {
  const run = await transitionRunState(pool, runId, fromState, toState);
  if (!run) {
    return { success: false, run: null };
  }

  if (extra && Object.keys(extra).length > 0) {
    const updated = await updateRun(pool, runId, {
      ...(extra.previewUrl !== undefined ? { preview_url: extra.previewUrl } : {}),
      ...(extra.githubCheckId !== undefined ? { github_check_id: extra.githubCheckId } : {}),
      ...(extra.startedAt !== undefined ? { started_at: extra.startedAt } : {}),
      ...(extra.completedAt !== undefined ? { completed_at: extra.completedAt } : {}),
    });
    return { success: true, run: updated };
  }

  return { success: true, run };
}

export function isTerminal(state: RunState): boolean {
  return (
    state === RunState.Completed ||
    state === RunState.Failed ||
    state === RunState.Canceled ||
    state === RunState.BlockedEnvironment
  );
}
