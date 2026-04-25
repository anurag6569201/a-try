import type { VercelAdapterConfig, PreviewResolutionResult, GitHubDeployment } from './types.js';
import { listDeployments } from './client.js';

// Vercel stores the git SHA in deployment metadata under these keys
const SHA_META_KEYS = ['githubCommitSha', 'gitlabCommitSha', 'bitbucketCommitSha'];

export async function resolvePreviewUrl(
  config: VercelAdapterConfig,
  projectId: string,
  sha: string,
): Promise<PreviewResolutionResult> {
  let deployments;
  try {
    deployments = await listDeployments(config, projectId, { limit: 20 });
  } catch {
    return { status: 'waiting_for_preview' };
  }

  const match = deployments.find((d) => {
    if (d.state !== 'READY') return false;
    return SHA_META_KEYS.some((key) => d.meta?.[key] === sha);
  });

  if (match) {
    return { status: 'resolved', url: `https://${match.url}` };
  }

  // A deployment exists for this SHA but is still building
  const pending = deployments.find((d) => {
    const isBuilding = ['BUILDING', 'INITIALIZING', 'QUEUED'].includes(d.state);
    return isBuilding && SHA_META_KEYS.some((key) => d.meta?.[key] === sha);
  });

  return pending ? { status: 'waiting_for_preview' } : { status: 'not_found' };
}

// Fallback: use GitHub deployment status events already stored
export function resolvePreviewFromGitHubDeployments(
  deployments: GitHubDeployment[],
  sha: string,
): PreviewResolutionResult {
  const previewDeployments = deployments.filter(
    (d) => d.sha === sha && d.environment.toLowerCase().includes('preview'),
  );

  const ready = previewDeployments.find(
    (d) => d.state === 'success' && d.environmentUrl,
  );

  if (ready?.environmentUrl) {
    return { status: 'resolved', url: ready.environmentUrl };
  }

  const inProgress = previewDeployments.find((d) =>
    ['pending', 'in_progress', 'queued'].includes(d.state),
  );

  return inProgress ? { status: 'waiting_for_preview' } : { status: 'not_found' };
}
