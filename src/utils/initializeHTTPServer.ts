import express, { Application } from "express";
import { createServer } from "node:http";

export function initializeHTTPServer(): Application {
	const app = express();

	createServer(app);

	return app;
}
