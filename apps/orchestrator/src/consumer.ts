import { ServiceBusClient, ServiceBusReceiver } from '@azure/service-bus';
import { Pool } from 'pg';
import { EventType } from '@preview-qa/domain';
import { ServiceBusEnvelopeSchema, PullRequestEventEnvelopeSchema, IssueCommentEventEnvelopeSchema, InstallationEventEnvelopeSchema } from '@preview-qa/schemas';
import { handlePullRequestEvent } from './handlers/pullRequest.js';
import { handleIssueCommentEvent } from './handlers/issueComment.js';
import { handleInstallationCreatedEvent } from './handlers/installation.js';
import type { OrchestratorConfig } from './types.js';

export class OrchestratorConsumer {
  private readonly sbClient: ServiceBusClient;
  private readonly pool: Pool;
  private readonly config: OrchestratorConfig;
  private receiver: ServiceBusReceiver | null = null;

  constructor(config: OrchestratorConfig) {
    this.config = config;
    this.sbClient = new ServiceBusClient(config.serviceBusConnectionString);
    this.pool = new Pool({ connectionString: config.dbConnectionString });
  }

  start(): void {
    this.receiver = this.sbClient.createReceiver(this.config.queueName);

    this.receiver.subscribe({
      processMessage: async (msg) => {
        const raw = msg.body as unknown;
        const envelopeResult = ServiceBusEnvelopeSchema.safeParse(raw);
        if (!envelopeResult.success) {
          console.warn('Dropping malformed envelope:', envelopeResult.error.issues);
          return;
        }
        const envelope = envelopeResult.data;
        console.log(`[${envelope.correlationId}] Processing ${envelope.eventType}`);

        try {
          await this.dispatch(envelope.eventType, raw);
        } catch (err) {
          console.error(`[${envelope.correlationId}] Handler threw:`, err);
          throw err; // Let Service Bus dead-letter after max retries
        }
      },
      processError: (err) => {
        console.error('Service Bus receiver error:', err.error);
        return Promise.resolve();
      },
    });

    console.log(`Orchestrator consuming from queue: ${this.config.queueName}`);
  }

  private async dispatch(eventType: EventType, raw: unknown): Promise<void> {
    const prEventTypes: EventType[] = [
      EventType.PullRequestOpened,
      EventType.PullRequestSynchronize,
      EventType.PullRequestReopened,
      EventType.PullRequestClosed,
    ];

    if (prEventTypes.includes(eventType)) {
      const parsed = PullRequestEventEnvelopeSchema.parse(raw);
      await handlePullRequestEvent(this.pool, this.config, parsed);
      return;
    }

    if (eventType === EventType.DeploymentStatusCreated) {
      // Deployment status events are informational in the current sprint
      return;
    }

    if (eventType === EventType.IssueCommentCreated) {
      const parsed = IssueCommentEventEnvelopeSchema.parse(raw);
      await handleIssueCommentEvent(this.pool, this.config, parsed);
      return;
    }

    if (eventType === EventType.InstallationCreated) {
      const parsed = InstallationEventEnvelopeSchema.parse(raw);
      await handleInstallationCreatedEvent(this.pool, this.config, parsed);
      return;
    }

    console.warn(`No handler registered for event type: ${eventType}`);
  }

  async stop(): Promise<void> {
    await this.receiver?.close();
    await this.sbClient.close();
    await this.pool.end();
  }
}
