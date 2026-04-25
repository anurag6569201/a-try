import { resolvePreviewUrl } from '@preview-qa/vercel-adapter';
import type { VercelAdapterConfig } from '@preview-qa/vercel-adapter';

const POLL_INTERVAL_MS = 30_000;
const TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

export type PollResult =
  | { status: 'resolved'; url: string }
  | { status: 'timeout' }
  | { status: 'error'; message: string };

export async function pollForPreview(
  vercelConfig: VercelAdapterConfig,
  projectId: string,
  sha: string,
  signal?: AbortSignal,
): Promise<PollResult> {
  const deadline = Date.now() + TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (signal?.aborted) {
      return { status: 'error', message: 'Polling aborted' };
    }

    try {
      const result = await resolvePreviewUrl(vercelConfig, projectId, sha);
      if (result.status === 'resolved' && result.url !== undefined) {
        return { status: 'resolved', url: result.url };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { status: 'error', message };
    }

    const remaining = deadline - Date.now();
    if (remaining <= 0) break;

    await sleep(Math.min(POLL_INTERVAL_MS, remaining), signal);
  }

  return { status: 'timeout' };
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new Error('sleep aborted'));
    });
  });
}
