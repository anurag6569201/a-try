import { initTelemetry } from '@preview-qa/observability';

initTelemetry({
  serviceName: 'webhook-api',
  ...(process.env['APPLICATIONINSIGHTS_CONNECTION_STRING'] !== undefined
    ? { appInsightsConnectionString: process.env['APPLICATIONINSIGHTS_CONNECTION_STRING'] }
    : {}),
});

// Webhook API entry point — HTTP server wired up in a future sprint
