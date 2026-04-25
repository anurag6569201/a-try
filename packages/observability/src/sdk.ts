import { NodeSDK } from '@opentelemetry/sdk-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { AzureMonitorTraceExporter } from '@azure/monitor-opentelemetry-exporter';
import { SimpleSpanProcessor, ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';

let sdk: NodeSDK | null = null;

export interface SdkOptions {
  serviceName: string;
  serviceVersion?: string;
  appInsightsConnectionString?: string;
}

export function initTelemetry(options: SdkOptions): void {
  if (sdk) return;

  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: options.serviceName,
    [ATTR_SERVICE_VERSION]: options.serviceVersion ?? '1.0.0',
  });

  const spanProcessors = [];

  if (options.appInsightsConnectionString) {
    const exporter = new AzureMonitorTraceExporter({
      connectionString: options.appInsightsConnectionString,
    });
    spanProcessors.push(new SimpleSpanProcessor(exporter));
  } else if (process.env['NODE_ENV'] !== 'test') {
    // Dev fallback: log spans to console when no App Insights is configured
    spanProcessors.push(new SimpleSpanProcessor(new ConsoleSpanExporter()));
  }

  sdk = new NodeSDK({
    resource,
    spanProcessors,
  });

  sdk.start();

  process.on('SIGTERM', () => {
    sdk?.shutdown().catch(console.error);
  });
}

export async function shutdownTelemetry(): Promise<void> {
  if (sdk) {
    await sdk.shutdown();
    sdk = null;
  }
}
