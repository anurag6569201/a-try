import { Octokit } from '@octokit/rest';
import type { CreateCheckRunInput, UpdateCheckRunInput } from './types.js';

export async function createCheckRun(
  octokit: Octokit,
  input: CreateCheckRunInput,
): Promise<number> {
  const { data } = await octokit.checks.create({
    owner: input.owner,
    repo: input.repo,
    name: input.name,
    head_sha: input.headSha,
    status: input.status,
    ...(input.externalId !== undefined ? { external_id: input.externalId } : {}),
    ...(input.output !== undefined
      ? {
          output: {
            title: input.output.title,
            summary: input.output.summary,
            ...(input.output.text !== undefined ? { text: input.output.text } : {}),
          },
        }
      : {}),
  });

  return data.id;
}

export async function updateCheckRun(
  octokit: Octokit,
  input: UpdateCheckRunInput,
): Promise<void> {
  await octokit.checks.update({
    owner: input.owner,
    repo: input.repo,
    check_run_id: input.checkRunId,
    status: input.status,
    ...(input.conclusion !== undefined ? { conclusion: input.conclusion } : {}),
    ...(input.completedAt !== undefined ? { completed_at: input.completedAt } : {}),
    ...(input.output !== undefined
      ? {
          output: {
            title: input.output.title,
            summary: input.output.summary,
            ...(input.output.text !== undefined ? { text: input.output.text } : {}),
          },
        }
      : {}),
  });
}
