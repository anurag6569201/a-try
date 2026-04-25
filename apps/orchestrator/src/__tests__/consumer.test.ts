import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventType } from '@preview-qa/domain';

// Capture mocks so tests can reach into them
const mockReceiverSubscribe = vi.fn();
const mockReceiverClose = vi.fn().mockResolvedValue(undefined);
const mockSbClose = vi.fn().mockResolvedValue(undefined);
const mockPoolEnd = vi.fn().mockResolvedValue(undefined);

vi.mock('@azure/service-bus', () => ({
  ServiceBusClient: vi.fn().mockImplementation(() => ({
    createReceiver: vi.fn().mockReturnValue({
      subscribe: mockReceiverSubscribe,
      close: mockReceiverClose,
    }),
    close: mockSbClose,
  })),
}));

vi.mock('pg', () => ({
  Pool: vi.fn().mockImplementation(() => ({
    end: mockPoolEnd,
  })),
}));

vi.mock('../handlers/pullRequest.js', () => ({
  handlePullRequestEvent: vi.fn().mockResolvedValue(undefined),
}));

import { OrchestratorConsumer } from '../consumer.js';
import { handlePullRequestEvent } from '../handlers/pullRequest.js';

const mockHandler = handlePullRequestEvent as unknown as ReturnType<typeof vi.fn>;

const baseConfig = {
  serviceBusConnectionString: 'Endpoint=sb://test.servicebus.windows.net/;SharedAccessKeyName=k;SharedAccessKey=s=',
  queueName: 'pr-events',
  dbConnectionString: 'postgresql://localhost/test',
  github: { appId: 1, privateKey: 'key' },
  vercel: { apiToken: 'tok' },
};

const basePrEnvelope = {
  messageId: '00000000-0000-0000-0000-000000000001',
  correlationId: '00000000-0000-0000-0000-000000000002',
  installationId: 'inst-1',
  repositoryId: 'repo-1',
  occurredAt: new Date().toISOString(),
  payload: {
    pullRequestId: 'pr-1',
    githubNumber: 1,
    sha: 'a'.repeat(40),
    headBranch: 'feat/x',
    baseBranch: 'main',
    authorLogin: 'alice',
    isFork: false,
    title: 'Test PR',
    body: null,
  },
};

function getProcessMessage(): (msg: { body: unknown }) => Promise<void> {
  const subscribeCall = mockReceiverSubscribe.mock.calls[0] as [
    { processMessage: (msg: { body: unknown }) => Promise<void> },
  ];
  if (!subscribeCall) throw new Error('subscribe was not called');
  return subscribeCall[0].processMessage;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockReceiverSubscribe.mockReset();
  mockReceiverClose.mockResolvedValue(undefined);
  mockSbClose.mockResolvedValue(undefined);
  mockPoolEnd.mockResolvedValue(undefined);
});

describe('OrchestratorConsumer', () => {
  it('calls handlePullRequestEvent for PR opened event', async () => {
    const consumer = new OrchestratorConsumer(baseConfig);
    consumer.start();

    const processMessage = getProcessMessage();
    const envelope = { ...basePrEnvelope, eventType: EventType.PullRequestOpened };
    await processMessage({ body: envelope });

    expect(mockHandler).toHaveBeenCalledTimes(1);
    const [, , calledEnvelope] = mockHandler.mock.calls[0] as [unknown, unknown, { eventType: string }];
    expect(calledEnvelope.eventType).toBe(EventType.PullRequestOpened);
  });

  it('does not call handlePullRequestEvent for unknown event type', async () => {
    const consumer = new OrchestratorConsumer(baseConfig);
    consumer.start();

    const processMessage = getProcessMessage();
    const envelope = { ...basePrEnvelope, eventType: 'unknown.event' };
    await processMessage({ body: envelope });

    expect(mockHandler).not.toHaveBeenCalled();
  });

  it('stops gracefully', async () => {
    const consumer = new OrchestratorConsumer(baseConfig);
    consumer.start();
    await consumer.stop();

    expect(mockSbClose).toHaveBeenCalled();
    expect(mockPoolEnd).toHaveBeenCalled();
  });
});
