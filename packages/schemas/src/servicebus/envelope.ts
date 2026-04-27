import { z } from 'zod';
import { EventType } from '@preview-qa/domain';

const EventTypeSchema = z.nativeEnum(EventType);

// Base envelope wrapping every message put on Service Bus
export const ServiceBusEnvelopeSchema = z.object({
  messageId: z.string().uuid(),
  eventType: EventTypeSchema,
  installationId: z.string(),
  repositoryId: z.string(),
  correlationId: z.string().uuid(),
  occurredAt: z.string().datetime(),
  payload: z.record(z.unknown()),
});

// Specialised envelopes with typed payloads

export const PullRequestEventEnvelopeSchema = ServiceBusEnvelopeSchema.extend({
  eventType: z.enum([
    EventType.PullRequestOpened,
    EventType.PullRequestSynchronize,
    EventType.PullRequestReopened,
    EventType.PullRequestClosed,
  ]),
  payload: z.object({
    pullRequestId: z.string(),
    githubNumber: z.number(),
    sha: z.string(),
    headBranch: z.string(),
    baseBranch: z.string(),
    authorLogin: z.string(),
    isFork: z.boolean(),
    title: z.string(),
    body: z.string().nullable(),
    owner: z.string().default(''),
    repo: z.string().default(''),
  }),
});

export const DeploymentStatusEventEnvelopeSchema = ServiceBusEnvelopeSchema.extend({
  eventType: z.literal(EventType.DeploymentStatusCreated),
  payload: z.object({
    pullRequestId: z.string().optional(),
    sha: z.string(),
    environment: z.string(),
    state: z.enum(['pending', 'success', 'failure', 'error', 'inactive', 'queued', 'in_progress']),
    environmentUrl: z.string().nullable(),
  }),
});

export const IssueCommentEventEnvelopeSchema = ServiceBusEnvelopeSchema.extend({
  eventType: z.literal(EventType.IssueCommentCreated),
  payload: z.object({
    githubNumber: z.number(),
    commentId: z.number(),
    body: z.string(),
    authorLogin: z.string(),
    repositoryFullName: z.string(),
  }),
});

export const InstallationEventEnvelopeSchema = ServiceBusEnvelopeSchema.extend({
  eventType: z.literal(EventType.InstallationCreated),
  payload: z.object({
    installationGithubId: z.number(),
    accountLogin: z.string(),
    accountType: z.string(),
    repositories: z.array(z.object({
      id: z.number(),
      name: z.string(),
      fullName: z.string(),
      private: z.boolean(),
    })).optional(),
  }),
});

export type ServiceBusEnvelope = z.infer<typeof ServiceBusEnvelopeSchema>;
export type PullRequestEventEnvelope = z.infer<typeof PullRequestEventEnvelopeSchema>;
export type DeploymentStatusEventEnvelope = z.infer<typeof DeploymentStatusEventEnvelopeSchema>;
export type IssueCommentEventEnvelope = z.infer<typeof IssueCommentEventEnvelopeSchema>;
export type InstallationEventEnvelope = z.infer<typeof InstallationEventEnvelopeSchema>;
