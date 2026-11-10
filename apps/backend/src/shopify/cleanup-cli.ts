import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { parseEnvironment } from "../config/environment.js";
import { composeRuntime } from "../runtime/compose.js";
import { cleanupDiagnostic } from "./runner.js";
// Dedicated explicit process entry point. No HTTP listener or public cron route.
try {
  process.loadEnvFile(
    resolve(fileURLToPath(new URL("../../", import.meta.url)), ".env.local"),
  );
} catch (error) {
  if (!(error instanceof Error && "code" in error && error.code === "ENOENT"))
    throw new Error("Unable to load backend configuration", { cause: error });
}
const runtime = composeRuntime(
  parseEnvironment(process.env),
  () => "req_maintenance",
);
const owner = new AbortController();
process.once("SIGTERM", () => owner.abort());
process.once("SIGINT", () => owner.abort());
try {
  if (!runtime.shopifyCleanup) throw new Error("Missing Shopify configuration");
  const result = await runtime.shopifyCleanup.sweep(owner.signal);
  cleanupDiagnostic(
    result.claimed ? "completed" : "leased",
    result.calls,
    result.visited,
  );
} catch {
  cleanupDiagnostic("UNAVAILABLE");
  process.exitCode = 1;
} finally {
  await runtime.shopify?.close();
}
