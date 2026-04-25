import type { VercelAdapterConfig, VercelDeployment } from './types.js';

const VERCEL_API_BASE = 'https://api.vercel.com';

export async function listDeployments(
  config: VercelAdapterConfig,
  projectId: string,
  options: { limit?: number } = {},
): Promise<VercelDeployment[]> {
  const params = new URLSearchParams({ projectId, limit: String(options.limit ?? 20) });
  if (config.teamId) params.set('teamId', config.teamId);

  const res = await fetch(`${VERCEL_API_BASE}/v6/deployments?${params.toString()}`, {
    headers: { Authorization: `Bearer ${config.apiToken}` },
  });

  if (!res.ok) {
    throw new Error(`Vercel API error ${res.status}: ${await res.text()}`);
  }

  const json = (await res.json()) as { deployments: VercelDeployment[] };
  return json.deployments;
}
