import pino from 'pino';
import type { Logger } from 'pino';
import type { CorrelationContext } from './types.js';

export type { Logger };

const IS_PROD = process.env['NODE_ENV'] === 'production';

const baseLogger = pino({
  level: process.env['LOG_LEVEL'] ?? 'info',
  ...(IS_PROD
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
        },
      }),
});

export function createLogger(service: string, ctx?: CorrelationContext): Logger {
  return baseLogger.child({
    service,
    ...ctx,
  });
}

export function bindContext(logger: Logger, ctx: CorrelationContext): Logger {
  return logger.child(ctx);
}
