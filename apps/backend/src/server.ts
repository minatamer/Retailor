import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { parseEnvironment } from "./config/environment.js";
import { composeRuntime } from "./runtime/compose.js";
import { createApp } from "./http/app.js";
const appRoot = fileURLToPath(new URL("../", import.meta.url));
try {
  process.loadEnvFile(resolve(appRoot, ".env.local"));
} catch (error) {
  if (!(error instanceof Error && "code" in error && error.code === "ENOENT"))
    throw new Error("Unable to load backend configuration", { cause: error });
}
const env = parseEnvironment(process.env);
const runtime = composeRuntime(env, () => `req_${randomUUID()}`);
const server = createApp(runtime).listen(
  env.PORT,
  env.APP_ENV === "production" ? "0.0.0.0" : "127.0.0.1",
  () => {
    process.stdout.write(
      `Retailor backend ready on port ${env.PORT} (${runtime.capabilities.mode}, paid ${runtime.capabilities.paidEnabled ? "enabled" : "disabled"})\n`,
    );
  },
);
server.requestTimeout = 125_000;
server.headersTimeout = 10_000;
server.keepAliveTimeout = 5_000;
server.on("error", () => {
  process.stderr.write(
    "Retailor backend failed to bind its configured port; no other process was stopped.\n",
  );
  process.exitCode = 1;
});
function stop() {
  server.close(() => {
    process.exitCode = 0;
  });
  server.closeIdleConnections();
  setTimeout(() => {
    server.closeAllConnections();
  }, 5000).unref();
}
process.once("SIGTERM", stop);
process.once("SIGINT", stop);
