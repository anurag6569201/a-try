import { describe, it, expect } from 'vitest';
import { createLogger, bindContext } from '../logger.js';

describe('createLogger', () => {
  it('creates a logger with the service name', () => {
    const log = createLogger('test-service');
    expect(log).toBeDefined();
    expect(typeof log.info).toBe('function');
    expect(typeof log.error).toBe('function');
  });

  it('creates a logger with correlation context bindings', () => {
    const log = createLogger('orchestrator', { runId: 'run-123', sha: 'abc123' });
    expect(log).toBeDefined();
    // child logger inherits parent bindings — verify it's a pino logger
    expect(typeof log.child).toBe('function');
  });

  it('creates a logger without context', () => {
    const log = createLogger('orchestrator');
    expect(log).toBeDefined();
  });
});

describe('bindContext', () => {
  it('returns a child logger with additional context', () => {
    const log = createLogger('orchestrator');
    const bound = bindContext(log, { runId: 'run-456', installationId: '789' });
    expect(bound).toBeDefined();
    expect(typeof bound.info).toBe('function');
    // child should be a different object
    expect(bound).not.toBe(log);
  });

  it('accepts partial context', () => {
    const log = createLogger('orchestrator');
    const bound = bindContext(log, { runId: 'run-789' });
    expect(bound).toBeDefined();
  });
});
