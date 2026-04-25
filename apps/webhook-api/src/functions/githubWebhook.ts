import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { EventType } from '@preview-qa/domain';
import {
  PullRequestWebhookPayloadSchema,
  DeploymentStatusPayloadSchema,
  IssueCommentPayloadSchema,
  InstallationPayloadSchema,
} from '@preview-qa/schemas';
import { verifyGitHubSignature } from '../lib/signature';
import { enqueueEvent } from '../lib/servicebus';
import { normalizePRPayload, normalizeDeploymentPayload, normalizeIssueCommentPayload } from '../lib/normalize';

const PR_ACTIONS = new Set(['opened', 'synchronize', 'reopened']);

const ACTION_TO_EVENT: Record<string, EventType> = {
  opened: EventType.PullRequestOpened,
  synchronize: EventType.PullRequestSynchronize,
  reopened: EventType.PullRequestReopened,
};

export async function githubWebhookHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const body = await request.text();
  const signature = request.headers.get('x-hub-signature-256');
  const eventHeader = request.headers.get('x-github-event');
  const deliveryId = request.headers.get('x-github-delivery') ?? 'unknown';

  context.log(`Received GitHub event: ${eventHeader} delivery=${deliveryId}`);

  const webhookSecret = process.env['GITHUB_WEBHOOK_SECRET'] ?? '';
  if (!verifyGitHubSignature(body, signature, webhookSecret)) {
    context.warn(`Signature validation failed delivery=${deliveryId}`);
    return { status: 401, body: 'Invalid signature' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(body) as unknown;
  } catch {
    return { status: 400, body: 'Invalid JSON' };
  }

  try {
    if (eventHeader === 'pull_request') {
      // Ignore actions we don't handle before strict parsing
      const action = (parsed as Record<string, unknown>)?.['action'];
      if (typeof action !== 'string' || !PR_ACTIONS.has(action)) {
        return { status: 200, body: 'Event ignored' };
      }

      const result = PullRequestWebhookPayloadSchema.safeParse(parsed);
      if (!result.success) {
        context.warn(`PR payload parse failed: ${result.error.message}`);
        return { status: 422, body: 'Unrecognised pull_request payload' };
      }

      const payload = result.data;

      const eventType = ACTION_TO_EVENT[payload.action];
      if (!eventType) return { status: 200, body: 'Event ignored' };

      const normalized = normalizePRPayload(payload);

      await enqueueEvent({
        eventType,
        installationId: String(normalized.installationGithubId),
        repositoryId: String(normalized.repositoryGithubId),
        payload: normalized as unknown as Record<string, unknown>,
        correlationId: deliveryId,
      });

      context.log(`Enqueued ${eventType} for PR #${normalized.githubNumber} sha=${normalized.sha}`);
      return { status: 202, body: 'Accepted' };
    }

    if (eventHeader === 'deployment_status') {
      const result = DeploymentStatusPayloadSchema.safeParse(parsed);
      if (!result.success) {
        context.warn(`Deployment status payload parse failed: ${result.error.message}`);
        return { status: 422, body: 'Invalid deployment_status payload' };
      }

      const normalized = normalizeDeploymentPayload(result.data);

      await enqueueEvent({
        eventType: EventType.DeploymentStatusCreated,
        installationId: String(normalized.installationGithubId),
        repositoryId: String(normalized.repositoryGithubId),
        payload: normalized as unknown as Record<string, unknown>,
        correlationId: deliveryId,
      });

      context.log(`Enqueued deployment_status sha=${normalized.sha} state=${normalized.state}`);
      return { status: 202, body: 'Accepted' };
    }

    if (eventHeader === 'issue_comment') {
      const action = (parsed as Record<string, unknown>)?.['action'];
      // Only handle newly created comments
      if (action !== 'created') return { status: 200, body: 'Event ignored' };

      const result = IssueCommentPayloadSchema.safeParse(parsed);
      if (!result.success) {
        context.warn(`Issue comment payload parse failed: ${result.error.message}`);
        return { status: 422, body: 'Unrecognised issue_comment payload' };
      }

      const normalized = normalizeIssueCommentPayload(result.data);

      // Only handle comments on pull requests
      if (!normalized.isPullRequest) return { status: 200, body: 'Event ignored' };

      // Only handle /qa commands
      if (!normalized.body.trim().startsWith('/qa')) return { status: 200, body: 'Event ignored' };

      await enqueueEvent({
        eventType: EventType.IssueCommentCreated,
        installationId: String(normalized.installationGithubId),
        repositoryId: String(normalized.repositoryGithubId),
        payload: {
          githubNumber: normalized.githubNumber,
          commentId: normalized.commentId,
          body: normalized.body,
          authorLogin: normalized.authorLogin,
          repositoryFullName: normalized.repositoryFullName,
        },
        correlationId: deliveryId,
      });

      context.log(`Enqueued issue_comment /qa command PR #${normalized.githubNumber} author=${normalized.authorLogin}`);
      return { status: 202, body: 'Accepted' };
    }

    if (eventHeader === 'installation') {
      const action = (parsed as Record<string, unknown>)?.['action'];
      if (action !== 'created') return { status: 200, body: 'Event ignored' };

      const result = InstallationPayloadSchema.safeParse(parsed);
      if (!result.success) {
        context.warn(`Installation payload parse failed: ${result.error.message}`);
        return { status: 422, body: 'Unrecognised installation payload' };
      }

      const { installation, repositories } = result.data;

      await enqueueEvent({
        eventType: EventType.InstallationCreated,
        installationId: String(installation.id),
        repositoryId: String(installation.id),
        payload: {
          installationGithubId: installation.id,
          accountLogin: installation.account.login,
          accountType: installation.account.type,
          ...(repositories !== undefined
            ? {
                repositories: repositories.map((r) => ({
                  id: r.id,
                  name: r.name,
                  fullName: r.full_name,
                  private: r.private,
                })),
              }
            : {}),
        },
        correlationId: deliveryId,
      });

      context.log(`Enqueued installation.created for account=${installation.account.login}`);
      return { status: 202, body: 'Accepted' };
    }

    // All other events — ack and ignore
    return { status: 200, body: 'Event ignored' };
  } catch (err) {
    context.error('Webhook handler error', err);
    return { status: 500, body: 'Internal server error' };
  }
}

app.http('githubWebhook', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'webhook/github',
  handler: githubWebhookHandler,
});
