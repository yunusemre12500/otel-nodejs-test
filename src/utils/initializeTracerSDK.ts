import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { ExpressInstrumentation } from "@opentelemetry/instrumentation-express";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { NetInstrumentation } from "@opentelemetry/instrumentation-net";
import { Resource } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-node";
import {
	SEMRESATTRS_SERVICE_INSTANCE_ID,
	SEMRESATTRS_SERVICE_NAME,
	SEMRESATTRS_SERVICE_NAMESPACE,
	SEMRESATTRS_SERVICE_VERSION
} from "@opentelemetry/semantic-conventions";

export function initializeTracerSDK(): NodeSDK {
	const resource = new Resource({
		[SEMRESATTRS_SERVICE_INSTANCE_ID]: "docker",
		[SEMRESATTRS_SERVICE_NAME]: "users-api-server",
		[SEMRESATTRS_SERVICE_NAMESPACE]: "api-servers",
		[SEMRESATTRS_SERVICE_VERSION]: "1.0.0"
	});

	const traceExporter = new OTLPTraceExporter({
		timeoutMillis: 30_000
	});

	const batchSpanProcessor = new BatchSpanProcessor(traceExporter, {
		exportTimeoutMillis: 5_000,
		scheduledDelayMillis: 5_000
	});

	const sdk = new NodeSDK({
		traceExporter,
		autoDetectResources: false,
		instrumentations: [new ExpressInstrumentation(), new HttpInstrumentation(), new NetInstrumentation()],
		resource,
		spanProcessors: [batchSpanProcessor]
	});

	return sdk;
}
