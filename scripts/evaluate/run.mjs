import { execFileSync } from "node:child_process";
import { mkdir, open, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { inspectAssets } from "./assets.mjs";
import { evaluationPlan } from "./plan.mjs";
import { runFixture } from "./fixture.mjs";
import { validateEvidence } from "./evidence.mjs";
import { CurrencyService } from "../../apps/backend/src/currency/service.js";
import {
  ecbCurrency,
  ECB_PAIR_URL,
} from "../../apps/backend/src/currency/provider.js";
import { convertMinor } from "@retailor/commerce/currency";
import {
  authorizationDigest,
  validateAuthorization,
  createCaptureSession,
} from "./capture.mjs";
import { parseEnvironment } from "../../apps/backend/src/config/environment.js";
import { composeRuntime } from "../../apps/backend/src/runtime/compose.js";
import { PaidAdmission } from "../../apps/backend/src/security/admission.js";
import { turnstile } from "../../apps/backend/src/security/turnstile.js";
import { openAiCatalogue } from "../../apps/backend/src/catalogue/provider.js";
import { openAiAssistant } from "../../apps/backend/src/providers/assistant.js";
import { openAiLogos } from "../../apps/backend/src/providers/logos.js";
const root = new URL("../../", import.meta.url);

export async function readBoundedJsonFile(path) {
  const handle = await open(path, "r");
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size > 16384)
      throw new Error("Evidence exceeds envelope");
    const bytes = Buffer.alloc(16385);
    let size = 0;
    while (size < bytes.length) {
      const read = await handle.read(bytes, size, bytes.length - size, null);
      if (!read.bytesRead) break;
      size += read.bytesRead;
    }
    if (size > 16384) throw new Error("Evidence exceeds envelope");
    return JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(0, size)),
    );
  } finally {
    await handle.close();
  }
}

export async function readEvidenceFile(path) {
  return validateEvidence(JSON.stringify(await readBoundedJsonFile(path)));
}

export async function observeFx() {
  const start = performance.now();
  try {
    const quote = await new CurrencyService(ecbCurrency()).quote();
    return {
      schemaVersion: 1,
      execution: "public-fx-observation",
      observedAt: new Date().toISOString(),
      sourceUrl: ECB_PAIR_URL,
      outcome: "pass",
      durationMs: Math.round(performance.now() - start),
      maximumUpstreamRequests: 1,
      paidRequests: 0,
      quote,
      example: {
        usdCents: 10000,
        eurCents: convertMinor(10000, quote.rateDecimal),
      },
    };
  } catch (error) {
    return {
      schemaVersion: 1,
      execution: "public-fx-observation",
      observedAt: new Date().toISOString(),
      sourceUrl: ECB_PAIR_URL,
      outcome: "pending",
      durationMs: Math.round(performance.now() - start),
      maximumUpstreamRequests: 1,
      paidRequests: 0,
      errorCategory: error?.code === "DEADLINE" ? "DEADLINE" : "UNAVAILABLE",
    };
  }
}

export async function executeEvaluation(args = []) {
  const mode = args[0] ?? "--plan";
  if (mode === "--live")
    return {
      schemaVersion: 1,
      execution: "paid-run-rejected",
      paidRequests: 0,
      liveAcceptance: "pending",
      reason:
        "Paid evaluation requires an owner-authorized plan and the canonical demo's real challenge, grants and review. The CLI cannot enable providers or bypass admission.",
    };
  if (mode === "--record" && args.length === 2)
    return {
      schemaVersion: 1,
      execution: "owner-record-validation",
      automatedReleaseApproval: false,
      record: await readEvidenceFile(args[1]),
    };
  if (
    (args.length > 1 && !(mode === "--capture" && args.length === 2)) ||
    !["--plan", "--fixture", "--fx-live", "--capture"].includes(mode)
  )
    throw new Error("Unsupported evaluation command");
  if (mode === "--fx-live") return observeFx();
  const candidate = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: fileURLToPath(root),
    encoding: "utf8",
    windowsHide: true,
  }).trim();
  const { inputs, publicRecord } = await inspectAssets();
  const worktreeDirty =
    execFileSync("git", ["status", "--porcelain"], {
      cwd: fileURLToPath(root),
      encoding: "utf8",
      windowsHide: true,
    }).trim().length > 0;
  const plan = evaluationPlan(candidate, publicRecord);
  if (mode === "--plan")
    return { ...plan, planDigest: authorizationDigest(plan), worktreeDirty };
  if (mode === "--capture") {
    if (args.length !== 2 || worktreeDirty)
      throw new Error(
        "Capture requires an exact clean candidate and authorization",
      );
    const authorization = validateAuthorization(
      await readBoundedJsonFile(args[1]),
      plan,
    );
    // Only explicit approved startup loads the normal app-local environment.
    try {
      process.loadEnvFile(new URL("apps/backend/.env.local", root));
    } catch (error) {
      if (error?.code !== "ENOENT")
        throw new Error("Backend configuration unavailable", { cause: error });
    }
    const configured = parseEnvironment(process.env);
    if (
      configured.APP_ENV === "production" ||
      configured.PORT !== 4311 ||
      configured.FRONTEND_ORIGIN !== "http://127.0.0.1:4310" ||
      configured.FAKE_MODE
    )
      throw new Error("Capture requires explicitly configured local live mode");
    const env = {
      ...configured,
      APP_REVISION: candidate,
      PROCESS_BUDGET_MICRO_USD: Math.min(
        configured.PROCESS_BUDGET_MICRO_USD,
        authorization.maximumReservationMicroUsd,
      ),
      LOGO_GENERATION_ENABLED:
        configured.LOGO_GENERATION_ENABLED &&
        authorization.caseIds.includes("logos_optional"),
    };
    const session = createCaptureSession(authorization, (row) =>
      process.stdout.write(JSON.stringify(row) + "\n"),
    );
    const fetcher = session.fetcher();
    const runtime = composeRuntime(
      env,
      () => "request_capture",
      (environment) => ({
        admission: new PaidAdmission({
          secret: environment.GRANT_SIGNING_SECRET,
          budgetMicroUsd: environment.PROCESS_BUDGET_MICRO_USD,
          challenge: turnstile(
            environment.TURNSTILE_SECRET_KEY,
            environment.FRONTEND_ORIGIN,
          ),
        }),
        provider: openAiCatalogue(environment.OPENAI_API_KEY, fetcher),
      }),
      undefined,
      (environment) => openAiAssistant(environment.OPENAI_API_KEY, fetcher),
      (environment) => openAiLogos(environment.OPENAI_API_KEY, fetcher),
    );
    if (!runtime.ready || !runtime.capabilities.paidEnabled)
      throw new Error("Live prerequisites unavailable");
    const directory = new URL("artifacts/local/", root);
    await mkdir(directory, { recursive: true });
    // One local operator receipt prevents reuse after restart; no hosted business storage.
    await writeFile(
      new URL(`evaluation-${authorization.approvalId}.used.json`, directory),
      JSON.stringify({
        schemaVersion: 1,
        approvalId: authorization.approvalId,
        candidate,
        startedAt: new Date().toISOString(),
      }),
      { flag: "wx" },
    );
    const server = session.wrap(runtime).listen(4311, "127.0.0.1");
    server.headersTimeout = 10000;
    server.requestTimeout = 200000;
    server.keepAliveTimeout = 5000;
    server.on("error", () => {
      process.stderr.write(
        "Capture could not bind Retailor port 4311; no other service was stopped.\n",
      );
      process.exitCode = 1;
    });
    const stop = () => {
      server.close();
      server.closeIdleConnections();
      setTimeout(() => server.closeAllConnections(), 5000).unref();
    };
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
    await new Promise((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });
    return {
      schemaVersion: 1,
      execution: "capture-server-ready",
      candidate,
      port: 4311,
      authorizedCases: authorization.caseIds.length,
      paidRequestsAtStartup: session.paidRequests,
      semanticAcceptance: "pending-owner-review",
    };
  }
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("Fixture evaluation denies external fetch");
  };
  try {
    return {
      ...(await runFixture(candidate, inputs)),
      assets: publicRecord,
      worktreeDirty,
    };
  } finally {
    globalThis.fetch = originalFetch;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const result = await executeEvaluation(process.argv.slice(2));
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    if (result.execution === "paid-run-rejected" || result.verdict === "fail")
      process.exitCode = 2;
  } catch {
    process.stderr.write(
      "Evaluation rejected or could not complete; no raw input/provider exception is logged.\n",
    );
    process.exitCode = 1;
  }
}
