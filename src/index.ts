import { SpanKind, trace } from "@opentelemetry/api";
import { initializeHTTPServer } from "./utils/initializeHTTPServer";
import { initializeTracerSDK } from "./utils/initializeTracerSDK";

const sdk = initializeTracerSDK();
const server = initializeHTTPServer();

const tracer = trace.getTracer("otel-test-api-server-tracer", "1.0.0");

server.get("/", (_request, response) => {
	const span = tracer.startSpan("Handle request", {
		kind: SpanKind.SERVER
	});

	response.status(501).json({
		code: 501,
		message: "nothing to see here!"
	});

	span.end();
});

sdk.start();
server.listen(3000);

process.once("SIGINT", async () => {
	try {
		await sdk.shutdown();
	} catch (error) {
		console.error("Failed to shut down tracing SDK gracefully", error);
	} finally {
		process.exit(0);
	}
});
