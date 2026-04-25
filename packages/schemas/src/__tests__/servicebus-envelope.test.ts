import { describe, it, expect } from 'vitest';
import { EventType } from '@preview-qa/domain';
import {
  ServiceBusEnvelopeSchema,
  PullRequestEventEnvelopeSchema,
  DeploymentStatusEventEnvelopeSchema,
  IssueCommentEventEnvelopeSchema,
} from '../servicebus/envelope';

const baseEnvelope = {
  messageId: '550e8400-e29b-41d4-a716-446655440000',
  installationId: 'inst-1',
  repositoryId: 'repo-1',
  correlationId: '550e8400-e29b-41d4-a716-446655440001',
  occurredAt: '2024-01-01T00:00:00Z',
  payload: {},
};

describe('ServiceBusEnvelopeSchema', () => {
  it('parses a valid base envelope', () => {
    const result = ServiceBusEnvelopeSchema.safeParse({
      ...baseEnvelope,
      eventType: EventType.PullRequestOpened,
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-uuid messageId', () => {
    const result = ServiceBusEnvelopeSchema.safeParse({
      ...baseEnvelope,
      messageId: 'not-a-uuid',
      eventType: EventType.PullRequestOpened,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid occurredAt datetime', () => {
    const result = ServiceBusEnvelopeSchema.safeParse({
      ...baseEnvelope,
      eventType: EventType.PullRequestOpened,
      occurredAt: 'not-a-date',
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown eventType', () => {
    const result = ServiceBusEnvelopeSchema.safeParse({
      ...baseEnvelope,
      eventType: 'unknown.event',
    });
    expect(result.success).toBe(false);
  });
});

describe('PullRequestEventEnvelopeSchema', () => {
  const validPayload = {
    pullRequestId: 'pr-1',
    githubNumber: 7,
    sha: 'a'.repeat(40),
    headBranch: 'fix-branch',
    baseBranch: 'main',
    authorLogin: 'dev',
    isFork: false,
    title: 'Fix bug',
    body: null,
  };

  it('parses a valid PR event envelope', () => {
    const result = PullRequestEventEnvelopeSchema.safeParse({
      ...baseEnvelope,
      eventType: EventType.PullRequestOpened,
      payload: validPayload,
    });
    expect(result.success).toBe(true);
  });

  it('rejects deployment_status eventType', () => {
    const result = PullRequestEventEnvelopeSchema.safeParse({
      ...baseEnvelope,
      eventType: EventType.DeploymentStatusCreated,
      payload: validPayload,
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing isFork field', () => {
    const { isFork: _isFork, ...withoutFork } = validPayload;
    const result = PullRequestEventEnvelopeSchema.safeParse({
      ...baseEnvelope,
      eventType: EventType.PullRequestOpened,
      payload: withoutFork,
    });
    expect(result.success).toBe(false);
  });
});

describe('DeploymentStatusEventEnvelopeSchema', () => {
  it('parses a valid deployment status envelope', () => {
    const result = DeploymentStatusEventEnvelopeSchema.safeParse({
      ...baseEnvelope,
      eventType: EventType.DeploymentStatusCreated,
      payload: {
        sha: 'a'.repeat(40),
        environment: 'preview',
        state: 'success',
        environmentUrl: 'https://preview.example.com',
      },
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid deployment state', () => {
    const result = DeploymentStatusEventEnvelopeSchema.safeParse({
      ...baseEnvelope,
      eventType: EventType.DeploymentStatusCreated,
      payload: {
        sha: 'a'.repeat(40),
        environment: 'preview',
        state: 'unknown_state',
        environmentUrl: null,
      },
    });
    expect(result.success).toBe(false);
  });
});

describe('IssueCommentEventEnvelopeSchema', () => {
  it('parses a valid comment envelope', () => {
    const result = IssueCommentEventEnvelopeSchema.safeParse({
      ...baseEnvelope,
      eventType: EventType.IssueCommentCreated,
      payload: {
        githubNumber: 7,
        commentId: 123,
        body: '/qa rerun',
        authorLogin: 'dev',
        repositoryFullName: 'acme/myapp',
      },
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing body', () => {
    const result = IssueCommentEventEnvelopeSchema.safeParse({
      ...baseEnvelope,
      eventType: EventType.IssueCommentCreated,
      payload: {
        githubNumber: 7,
        commentId: 123,
        authorLogin: 'dev',
        repositoryFullName: 'acme/myapp',
      },
    });
    expect(result.success).toBe(false);
  });
});
