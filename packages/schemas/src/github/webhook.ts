import { z } from 'zod';

const UserSchema = z.object({
  id: z.number(),
  login: z.string(),
  type: z.string(),
});

const LicenseSchema = z
  .object({
    key: z.string(),
    name: z.string(),
    spdx_id: z.string().nullable(),
    url: z.string().nullable(),
  })
  .nullable();

const RepositorySchema = z.object({
  id: z.number(),
  name: z.string(),
  full_name: z.string(),
  private: z.boolean(),
  fork: z.boolean(),
  default_branch: z.string(),
  clone_url: z.string(),
  html_url: z.string(),
  owner: UserSchema,
  license: LicenseSchema.optional(),
});

const PullRequestRefSchema = z.object({
  label: z.string(),
  ref: z.string(),
  sha: z.string(),
  user: UserSchema,
  repo: RepositorySchema,
});

const PullRequestSchema = z.object({
  id: z.number(),
  number: z.number(),
  state: z.enum(['open', 'closed']),
  title: z.string(),
  body: z.string().nullable(),
  draft: z.boolean(),
  merged: z.boolean().optional(),
  head: PullRequestRefSchema,
  base: PullRequestRefSchema,
  user: UserSchema,
  html_url: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

const InstallationRefSchema = z.object({
  id: z.number(),
  node_id: z.string(),
});

// pull_request.opened
export const PullRequestOpenedPayloadSchema = z.object({
  action: z.literal('opened'),
  number: z.number(),
  pull_request: PullRequestSchema,
  repository: RepositorySchema,
  sender: UserSchema,
  installation: InstallationRefSchema,
});

// pull_request.synchronize
export const PullRequestSynchronizePayloadSchema = z.object({
  action: z.literal('synchronize'),
  number: z.number(),
  before: z.string(),
  after: z.string(),
  pull_request: PullRequestSchema,
  repository: RepositorySchema,
  sender: UserSchema,
  installation: InstallationRefSchema,
});

// pull_request.reopened
export const PullRequestReopenedPayloadSchema = z.object({
  action: z.literal('reopened'),
  number: z.number(),
  pull_request: PullRequestSchema,
  repository: RepositorySchema,
  sender: UserSchema,
  installation: InstallationRefSchema,
});

// Union of all handled PR events
export const PullRequestWebhookPayloadSchema = z.discriminatedUnion('action', [
  PullRequestOpenedPayloadSchema,
  PullRequestSynchronizePayloadSchema,
  PullRequestReopenedPayloadSchema,
]);

// GitHub deployment_status event
export const DeploymentStatusPayloadSchema = z.object({
  action: z.literal('created'),
  deployment_status: z.object({
    id: z.number(),
    state: z.enum(['pending', 'success', 'failure', 'error', 'inactive', 'queued', 'in_progress']),
    environment: z.string(),
    environment_url: z.string().nullable(),
    log_url: z.string().nullable(),
    description: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
  }),
  deployment: z.object({
    id: z.number(),
    sha: z.string(),
    ref: z.string(),
    environment: z.string(),
    description: z.string().nullable(),
  }),
  repository: RepositorySchema,
  sender: UserSchema,
  installation: InstallationRefSchema,
});

// issue_comment event (used for /qa commands)
export const IssueCommentPayloadSchema = z.object({
  action: z.enum(['created', 'edited', 'deleted']),
  issue: z.object({
    id: z.number(),
    number: z.number(),
    title: z.string(),
    state: z.string(),
    pull_request: z
      .object({
        url: z.string(),
        html_url: z.string(),
      })
      .optional(),
  }),
  comment: z.object({
    id: z.number(),
    body: z.string(),
    user: UserSchema,
    created_at: z.string(),
    updated_at: z.string(),
  }),
  repository: RepositorySchema,
  sender: UserSchema,
  installation: InstallationRefSchema,
});

// installation event — fired when the GitHub App is installed on an account/repo
export const InstallationPayloadSchema = z.object({
  action: z.enum(['created', 'deleted', 'suspend', 'unsuspend', 'new_permissions_accepted']),
  installation: z.object({
    id: z.number(),
    account: UserSchema,
    app_id: z.number(),
    repository_selection: z.enum(['all', 'selected']),
    created_at: z.string(),
    updated_at: z.string(),
  }),
  repositories: z
    .array(
      z.object({
        id: z.number(),
        name: z.string(),
        full_name: z.string(),
        private: z.boolean(),
      }),
    )
    .optional(),
  sender: UserSchema,
});

export type PullRequestOpenedPayload = z.infer<typeof PullRequestOpenedPayloadSchema>;
export type PullRequestSynchronizePayload = z.infer<typeof PullRequestSynchronizePayloadSchema>;
export type PullRequestReopenedPayload = z.infer<typeof PullRequestReopenedPayloadSchema>;
export type PullRequestWebhookPayload = z.infer<typeof PullRequestWebhookPayloadSchema>;
export type DeploymentStatusPayload = z.infer<typeof DeploymentStatusPayloadSchema>;
export type IssueCommentPayload = z.infer<typeof IssueCommentPayloadSchema>;
export type InstallationPayload = z.infer<typeof InstallationPayloadSchema>;
