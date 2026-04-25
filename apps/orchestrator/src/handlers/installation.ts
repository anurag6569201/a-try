import type { Pool } from 'pg';
import type { InstallationEventEnvelope } from '@preview-qa/schemas';
import { getInstallationOctokit, listOpenPRs, upsertStickyComment, postComment } from '@preview-qa/github-adapter';
import { runOnboardingChecklist, formatOnboardingComment } from '@preview-qa/onboarding';
import { createLogger } from '@preview-qa/observability';
import type { OrchestratorConfig } from '../types.js';

export async function handleInstallationCreatedEvent(
  _pool: Pool,
  config: OrchestratorConfig,
  envelope: InstallationEventEnvelope,
): Promise<void> {
  const { installationId, payload } = envelope;
  const { accountLogin, repositories } = payload;

  const log = createLogger('orchestrator', { installationId: String(installationId) });
  log.info({ accountLogin, repoCount: repositories?.length ?? 0 }, 'installation.created — running onboarding');

  const octokit = await getInstallationOctokit(config.github, Number(installationId));

  for (const repo of repositories ?? []) {
    const [owner, repoName] = repo.fullName.split('/');
    if (!owner || !repoName) continue;

    try {
      // Run the onboarding checklist against the default branch
      const checklist = await runOnboardingChecklist(octokit, owner, repoName);

      // Find the most recent open non-draft PR
      const openPRs = await listOpenPRs(octokit, owner, repoName, 10);
      const targetPR = openPRs.find((pr) => !pr.isDraft && !pr.isFork);

      if (targetPR) {
        // Post onboarding checklist as sticky comment on the most recent open PR
        await upsertStickyComment(octokit, {
          owner,
          repo: repoName,
          pullNumber: targetPR.number,
          body: formatOnboardingComment(checklist),
        });
        log.info({ repo: repo.fullName, prNumber: targetPR.number }, 'posted onboarding checklist');
      } else {
        // No open PRs — post to the repo as an issue comment is not possible,
        // so log and skip. The checklist will appear on the first PR opened.
        log.info({ repo: repo.fullName }, 'no open PRs found — onboarding comment will appear on first PR');

        // Still post the config wizard as a repo-level comment if there's no PR
        // by using a placeholder approach — create a new issue with onboarding info
        await postComment(octokit, owner, repoName, 1, formatOnboardingComment(checklist)).catch(() => {
          // Issue #1 may not exist — best-effort only
        });
      }
    } catch (err) {
      log.warn({ err, repo: repo.fullName }, 'onboarding failed for repo — skipped');
    }
  }
}
