import { diag, DiagConsoleLogger, DiagLogLevel, SpanKind, trace } from "@opentelemetry/api";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { defaultResource, resourceFromAttributes } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-node";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";

import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { join } from "node:path";

import { ExpressInstrumentation } from "@opentelemetry/instrumentation-express";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { NetInstrumentation } from "@opentelemetry/instrumentation-net";
import express from "express";

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json")).toString());

const resource = defaultResource().merge(
  resourceFromAttributes({
    [ATTR_SERVICE_NAME]: pkg.name,
    [ATTR_SERVICE_VERSION]: pkg.version
  })
);

const traceExporter = new OTLPTraceExporter();

const batchSpanProcessor = new BatchSpanProcessor(traceExporter);

const sdk = new NodeSDK({
  instrumentations: [
    new ExpressInstrumentation(),
    new HttpInstrumentation({
      disableIncomingRequestInstrumentation: false,
      disableOutgoingRequestInstrumentation: false,
      enableSyntheticSourceDetection: true,
      ignoreIncomingRequestHook(request) {
        return request.url === "/health";
      }
    }),
    new NetInstrumentation()
  ],
  resource,
  spanProcessors: [batchSpanProcessor]
});

const app = express();
const server = createServer(app);

const tracer = trace.getTracer("otel-test-api-server-tracer", "1.0.0");

const router = express.Router({
  caseSensitive: true,
  mergeParams: false,
  strict: true
});

app.use(router);

router.get("/", (_request, response) => {
  const span = tracer.startSpan("Handle request", {
    kind: SpanKind.SERVER
  });

  response.status(501).json({
    code: 501,
    message: "nothing to see here!"
  });

  span.end();
});

router.get("/health", (_, response) => {
  response.status(200).send("OK").end();
});

(async function () {
  console.info("Starting server...");

  try {
    console.info("Starting OpenTelemetry SDK");

    sdk.start();

    console.info("OpenTelemetry SDK started");

    console.info("Starting HTTP server");

    const PORT = parseInt(process.env["PORT"] ?? "3000", 10);

    server.listen(PORT, "0.0.0.0", () => {
      const address = server.address()!;

      console.info(
        `HTTP server listening on: ${typeof address === "string" ? address : `${address.address}:${address.port}`}`
      );
    });

    console.log("Registering signal handlers");

    ["INT", "QUIT", "TERM"].forEach((signalName) => {
      const signal = "SIG" + signalName;

      process.once(signal, async () => {
        console.info(`Received signal: ${signal}`);

        try {
          console.log("Closing HTTP server");

          server.close();

          console.info("HTTP server closed");

          console.info("Stopping OpenTelemetry SDK");

          await sdk.shutdown();

          console.info("OpenTelemetry SDK stopped");

          process.exit(0);
        } catch (error) {
          console.error(`Failed to close server gracefully: ${error}`);

          process.exit(1);
        }
      });
    });

    console.info("Signal handlers registered");
  } catch (error) {
    console.error(`failed to start server: ${error}`);

    process.exit(1);
  }
})();
