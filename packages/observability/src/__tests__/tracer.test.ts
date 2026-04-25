import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SpanStatusCode as OtelSpanStatusCode } from '@opentelemetry/api';
import { getTracer, withSpan, recordSpanError, SpanStatusCode } from '../tracer.js';
import type { Span } from '@opentelemetry/api';

function makeMockSpan(): Span & {
  attributes: Record<string, unknown>;
  status: { code: number; message?: string };
  ended: boolean;
  exceptions: unknown[];
} {
  const span = {
    attributes: {} as Record<string, unknown>,
    status: { code: 0 },
    ended: false,
    exceptions: [] as unknown[],
    setAttribute(key: string, value: unknown) {
      this.attributes[key] = value;
      return this;
    },
    setStatus(s: { code: number; message?: string }) {
      this.status = s;
      return this;
    },
    recordException(err: unknown) {
      this.exceptions.push(err);
      return this;
    },
    end() {
      this.ended = true;
    },
    // Unused Span methods — satisfy the interface
    isRecording: () => true,
    addEvent: () => span,
    updateName: () => span,
    setAttributes: () => span,
    addLink: () => span,
    addLinks: () => span,
    spanContext: () => ({ traceId: '', spanId: '', traceFlags: 0 }),
  };
  return span as unknown as ReturnType<typeof makeMockSpan>;
}

describe('getTracer', () => {
  it('returns a Tracer instance', () => {
    const tracer = getTracer('test');
    expect(tracer).toBeDefined();
    expect(typeof tracer.startActiveSpan).toBe('function');
  });
});

describe('withSpan', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('attaches correlation attributes and returns the result', async () => {
    const mockSpan = makeMockSpan();
    const tracer = getTracer('test');
    vi.spyOn(tracer, 'startActiveSpan').mockImplementation(
      ((_name: string, fn: (span: Span) => Promise<string>) => fn(mockSpan as unknown as Span)) as typeof tracer.startActiveSpan,
    );

    const result = await withSpan(
      tracer,
      'test.op',
      { runId: 'r1', installationId: 'i1', repositoryId: 'rep1', sha: 'abc', correlationId: 'corr1' },
      () => Promise.resolve('ok'),
    );

    expect(result).toBe('ok');
    expect(mockSpan.attributes['preview_qa.run_id']).toBe('r1');
    expect(mockSpan.attributes['preview_qa.installation_id']).toBe('i1');
    expect(mockSpan.attributes['preview_qa.repository_id']).toBe('rep1');
    expect(mockSpan.attributes['preview_qa.sha']).toBe('abc');
    expect(mockSpan.attributes['preview_qa.correlation_id']).toBe('corr1');
    expect(mockSpan.status.code).toBe(OtelSpanStatusCode.OK);
    expect(mockSpan.ended).toBe(true);
  });

  it('sets error status and rethrows on exception', async () => {
    const mockSpan = makeMockSpan();
    const tracer = getTracer('test');
    vi.spyOn(tracer, 'startActiveSpan').mockImplementation(
      ((_name: string, fn: (span: Span) => Promise<never>) => fn(mockSpan as unknown as Span)) as typeof tracer.startActiveSpan,
    );

    const boom = new Error('boom');
    await expect(
      withSpan(tracer, 'test.op', {}, () => Promise.reject(boom)),
    ).rejects.toThrow('boom');

    expect(mockSpan.status.code).toBe(OtelSpanStatusCode.ERROR);
    expect(mockSpan.status.message).toBe('boom');
    expect(mockSpan.exceptions[0]).toBe(boom);
    expect(mockSpan.ended).toBe(true);
  });

  it('skips undefined context fields', async () => {
    const mockSpan = makeMockSpan();
    const tracer = getTracer('test');
    vi.spyOn(tracer, 'startActiveSpan').mockImplementation(
      ((_name: string, fn: (span: Span) => Promise<null>) => fn(mockSpan as unknown as Span)) as typeof tracer.startActiveSpan,
    );

    await withSpan(tracer, 'test.op', { runId: 'only-run' }, () => Promise.resolve(null));

    expect(mockSpan.attributes['preview_qa.run_id']).toBe('only-run');
    expect('preview_qa.installation_id' in mockSpan.attributes).toBe(false);
  });
});

describe('recordSpanError', () => {
  it('sets ERROR status and records the exception', () => {
    const mockSpan = makeMockSpan();
    const err = new Error('test error');
    recordSpanError(mockSpan as unknown as Span, err);

    expect(mockSpan.status.code).toBe(SpanStatusCode.ERROR);
    expect(mockSpan.status.message).toBe('test error');
    expect(mockSpan.exceptions[0]).toBe(err);
  });

  it('handles non-Error exceptions', () => {
    const mockSpan = makeMockSpan();
    recordSpanError(mockSpan as unknown as Span, 'string error');

    expect(mockSpan.status.code).toBe(SpanStatusCode.ERROR);
    expect(mockSpan.status.message).toBe('string error');
    expect((mockSpan.exceptions[0] as Error).message).toBe('string error');
  });
});
