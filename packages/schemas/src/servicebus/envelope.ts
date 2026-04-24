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
    pullRequestId: z.string(),
    githubNumber: z.number(),
    commentId: z.number(),
    body: z.string(),
    authorLogin: z.string(),
  }),
});

export type ServiceBusEnvelope = z.infer<typeof ServiceBusEnvelopeSchema>;
export type PullRequestEventEnvelope = z.infer<typeof PullRequestEventEnvelopeSchema>;
export type DeploymentStatusEventEnvelope = z.infer<typeof DeploymentStatusEventEnvelopeSchema>;
export type IssueCommentEventEnvelope = z.infer<typeof IssueCommentEventEnvelopeSchema>;
