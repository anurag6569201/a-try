import { createSign } from 'crypto';
import { Octokit } from '@octokit/rest';

export interface GitHubAppConfig {
  appId: number;
  privateKey: string;
}

interface InstallationTokenResponse {
  token: string;
  expires_at: string;
}

// Cache one token per installation to avoid a GitHub API call every request
const tokenCache = new Map<number, { token: string; expiresAt: Date }>();

function buildJwt(appId: number, privateKey: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({ iat: now - 60, exp: now + 600, iss: appId }),
  ).toString('base64url');
  const data = `${header}.${payload}`;
  const sign = createSign('RSA-SHA256');
  sign.update(data);
  const signature = sign.sign(privateKey, 'base64url');
  return `${data}.${signature}`;
}

export async function getInstallationOctokit(
  config: GitHubAppConfig,
  installationId: number,
): Promise<Octokit> {
  const cached = tokenCache.get(installationId);
  const now = new Date();

  if (cached && cached.expiresAt > new Date(now.getTime() + 60_000)) {
    return new Octokit({ auth: cached.token });
  }

  const jwt = buildJwt(config.appId, config.privateKey);
  const appOctokit = new Octokit({ auth: jwt });

  const { data } = await appOctokit.apps.createInstallationAccessToken({
    installation_id: installationId,
  });

  const tokenData = data as InstallationTokenResponse;
  tokenCache.set(installationId, {
    token: tokenData.token,
    expiresAt: new Date(tokenData.expires_at),
  });

  return new Octokit({ auth: tokenData.token });
}

export function clearTokenCache(): void {
  tokenCache.clear();
}
