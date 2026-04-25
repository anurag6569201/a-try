import { ServiceBusClient, ServiceBusSender } from '@azure/service-bus';
import { randomUUID } from 'crypto';
import { EventType } from '@preview-qa/domain';

export interface EnqueueOptions {
  eventType: EventType;
  installationId: string;
  repositoryId: string;
  payload: Record<string, unknown>;
  correlationId?: string;
}

let client: ServiceBusClient | null = null;
let sender: ServiceBusSender | null = null;

function getSender(): ServiceBusSender {
  if (!sender) {
    const connStr = process.env['AZURE_SERVICE_BUS_CONNECTION_STRING'];
    const queueName = process.env['AZURE_SERVICE_BUS_QUEUE_NAME'] ?? 'pr-events';
    if (!connStr) throw new Error('AZURE_SERVICE_BUS_CONNECTION_STRING is not set');
    client = new ServiceBusClient(connStr);
    sender = client.createSender(queueName);
  }
  return sender;
}

export async function enqueueEvent(options: EnqueueOptions): Promise<void> {
  const envelope = {
    messageId: randomUUID(),
    eventType: options.eventType,
    installationId: options.installationId,
    repositoryId: options.repositoryId,
    correlationId: options.correlationId ?? randomUUID(),
    occurredAt: new Date().toISOString(),
    payload: options.payload,
  };

  await getSender().sendMessages({
    messageId: envelope.messageId,
    correlationId: envelope.correlationId,
    body: envelope,
    contentType: 'application/json',
    applicationProperties: {
      eventType: options.eventType,
      installationId: options.installationId,
    },
  });
}

export async function closeSender(): Promise<void> {
  await sender?.close();
  await client?.close();
  sender = null;
  client = null;
}
