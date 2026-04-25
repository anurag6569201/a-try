import { trace, SpanStatusCode } from '@opentelemetry/api';
import type { Span, Tracer } from '@opentelemetry/api';
import type { CorrelationContext } from './types.js';

export { SpanStatusCode };
export type { Span, Tracer };

export function getTracer(name: string): Tracer {
  return trace.getTracer(name, '1.0.0');
}

export async function withSpan<T>(
  tracer: Tracer,
  spanName: string,
  ctx: CorrelationContext,
  fn: (span: Span) => Promise<T>,
): Promise<T> {
  return tracer.startActiveSpan(spanName, async (span) => {
    // Attach correlation attributes to every span
    if (ctx.runId) span.setAttribute('preview_qa.run_id', ctx.runId);
    if (ctx.installationId) span.setAttribute('preview_qa.installation_id', ctx.installationId);
    if (ctx.repositoryId) span.setAttribute('preview_qa.repository_id', ctx.repositoryId);
    if (ctx.sha) span.setAttribute('preview_qa.sha', ctx.sha);
    if (ctx.correlationId) span.setAttribute('preview_qa.correlation_id', ctx.correlationId);

    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: err instanceof Error ? err.message : String(err),
      });
      span.recordException(err instanceof Error ? err : new Error(String(err)));
      throw err;
    } finally {
      span.end();
    }
  });
}

export function recordSpanError(span: Span, err: unknown): void {
  span.setStatus({
    code: SpanStatusCode.ERROR,
    message: err instanceof Error ? err.message : String(err),
  });
  span.recordException(err instanceof Error ? err : new Error(String(err)));
}
