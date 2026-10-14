import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { CapabilitiesSchema, PublicErrorSchema } from "@retailor/contracts/api";
import {
  InputsSchema,
  httpsOrigin,
  readReleaseJson,
  preparePreflight,
} from "./preflight.mjs";

const root = new URL("../../", import.meta.url);
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
/** Fixed buffer/read count, owned deadline cancellation, no retained response chunks. */
export async function boundedResponse(response, limit, signal) {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 524288)
    throw new Error("Invalid probe envelope");
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader(),
    buffer = new Uint8Array(limit);
  let size = 0,
    reads = 0;
  const abort = () => {
    void reader.cancel().catch(() => undefined);
  };
  signal.addEventListener("abort", abort, { once: true });
  try {
    for (;;) {
      signal.throwIfAborted();
      const next = await reader.read();
      signal.throwIfAborted();
      if (++reads > limit * 2 + 1) throw new Error("Probe read count exceeded");
      if (next.done) break;
      if (size + next.value.byteLength > limit)
        throw new Error("Probe byte limit exceeded");
      buffer.set(next.value, size);
      size += next.value.byteLength;
    }
    return buffer.subarray(0, size);
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  } finally {
    signal.removeEventListener("abort", abort);
    reader.releaseLock();
  }
}

export async function hostedAssetInventory() {
  const manifest = JSON.parse(
    await readFile(
      new URL("apps/frontend/public/sample/forme/manifest.json", root),
      "utf8",
    ),
  );
  const paths = manifest.assets.map(({ id }) => `/sample/forme/${id}.webp`);
  paths.push("/sample/forme/manifest.json");
  for (const name of [
    "inter-latin-wght-normal.woff2",
    "dm-sans-latin-wght-normal.woff2",
    "dm-serif-display-latin-400-normal.woff2",
    "dm-serif-display-latin-400-italic.woff2",
    "manrope-latin-wght-normal.woff2",
    "inter-OFL.txt",
    "dm-sans-OFL.txt",
    "dm-serif-display-OFL.txt",
    "manrope-OFL.txt",
    "provenance.json",
  ])
    paths.push(`/fonts/${name}`);
  const assets = [];
  for (const path of paths) {
    if (
      !/^\/(?:sample\/forme\/(?:F(?:0[1-9]|1[0-9])\.webp|manifest\.json)|fonts\/[a-zA-Z0-9-]+\.(?:woff2|txt|json))$/u.test(
        path,
      )
    )
      throw new Error("Invalid public inventory path");
    const bytes = await readFile(new URL(`apps/frontend/public${path}`, root));
    assets.push({ path, bytes: bytes.length, sha256: hash(bytes) });
  }
  return assets;
}

/** Inert until explicitly invoked with an owner-confirmed origin; fixed GETs only. */
export async function probeHosted({
  origin,
  fetchImpl = fetch,
  assets,
  expectPaid = false,
  timeoutMs = 12000,
}) {
  if (
    !httpsOrigin(origin) ||
    typeof expectPaid !== "boolean" ||
    !Number.isInteger(timeoutMs) ||
    timeoutMs < 1 ||
    timeoutMs > 12000
  )
    throw new Error("Invalid hosted probe configuration");
  if (
    !Array.isArray(assets) ||
    assets.length > 30 ||
    assets.some(
      (asset) =>
        !/^\/(?:sample\/forme\/(?:F(?:0[1-9]|1[0-9])\.webp|manifest\.json)|fonts\/[a-zA-Z0-9-]+\.(?:woff2|txt|json))$/u.test(
          asset.path,
        ) ||
        !Number.isSafeInteger(asset.bytes) ||
        asset.bytes < 1 ||
        asset.bytes > 524288 ||
        !/^[a-f0-9]{64}$/u.test(asset.sha256),
    )
  )
    throw new Error("Invalid fixed public inventory");
  const inventory = [
    { path: "/", status: 200, limit: 524288, kind: "html" },
    { path: "/demo", status: 200, limit: 524288, kind: "html" },
    { path: "/design", status: 404, limit: 524288, kind: "missing" },
    {
      path: "/api/retailor/v1/config",
      status: 200,
      limit: 8192,
      kind: "config",
    },
    {
      path: "/api/retailor/v1/not-an-operation",
      status: 404,
      limit: 8192,
      kind: "error",
    },
    ...assets.map((asset) => ({
      ...asset,
      status: 200,
      limit: asset.bytes,
      kind: "asset",
    })),
  ];
  const rows = [];
  for (const item of inventory) {
    const owner = new AbortController(),
      timer = setTimeout(() => owner.abort(), timeoutMs),
      start = Date.now();
    try {
      const response = await fetchImpl(`${origin}${item.path}`, {
        method: "GET",
        headers: {
          accept:
            item.kind === "config" || item.kind === "error"
              ? "application/json"
              : "*/*",
        },
        credentials: "omit",
        redirect: "error",
        cache: "no-store",
        signal: owner.signal,
      });
      const bytes = await boundedResponse(response, item.limit, owner.signal);
      const expectedMime =
        item.kind === "config" ||
        item.kind === "error" ||
        item.path.endsWith(".json")
          ? "application/json"
          : item.path.endsWith(".webp")
            ? "image/webp"
            : item.path.endsWith(".woff2")
              ? "font/woff2"
              : item.path.endsWith(".txt")
                ? "text/plain"
                : "text/html";
      const mimeValid =
        response.headers
          .get("content-type")
          ?.split(";")[0]
          ?.trim()
          .toLowerCase() === expectedMime;
      const row = {
        path: item.path,
        status: response.status,
        bytes: bytes.length,
        durationMs: Date.now() - start,
        sha256: null,
        capabilities: null,
        mimeValid,
        outcome: "pass",
      };
      if (response.status !== item.status || !mimeValid) row.outcome = "fail";
      if (item.kind === "asset") {
        row.sha256 = hash(bytes);
        if (bytes.length !== item.bytes || row.sha256 !== item.sha256)
          row.outcome = "fail";
      }
      if (item.kind === "html") {
        const csp = response.headers.get("content-security-policy") ?? "";
        if (
          !csp.includes("frame-ancestors 'none'") ||
          csp.includes("unsafe-eval") ||
          response.headers.get("x-content-type-options") !== "nosniff" ||
          response.headers.get("x-frame-options") !== "DENY"
        )
          row.outcome = "fail";
      }
      if (item.kind === "config") {
        const parsed = CapabilitiesSchema.safeParse(
          JSON.parse(new TextDecoder().decode(bytes)),
        );
        if (!parsed.success) row.outcome = "fail";
        else {
          const { mode, paidEnabled, vision, tailor, logos, eur } = parsed.data;
          row.capabilities = {
            mode,
            paidEnabled,
            visionAvailable: vision.available,
            tailorAvailable: tailor.available,
            logosAvailable: logos.available,
            eurAvailable: eur.available,
          };
          if (
            mode !== "live" ||
            paidEnabled !== expectPaid ||
            (expectPaid && (!vision.available || !tailor.available)) ||
            (!expectPaid &&
              (vision.available || tailor.available || logos.available))
          )
            row.outcome = "fail";
        }
      }
      if (
        item.kind === "error" &&
        !PublicErrorSchema.safeParse(
          JSON.parse(new TextDecoder().decode(bytes)),
        ).success
      )
        row.outcome = "fail";
      rows.push(row);
      // Stop at the first unknown/boundary failure; never retry or follow redirects.
      if (row.outcome !== "pass") break;
    } catch {
      rows.push({
        path: item.path,
        status: null,
        bytes: null,
        durationMs: Date.now() - start,
        sha256: null,
        capabilities: null,
        outcome: "unknown",
      });
      break;
    } finally {
      clearTimeout(timer);
      owner.abort();
    }
  }
  return {
    schemaVersion: 1,
    observedAt: new Date().toISOString(),
    execution: "hosted-read-only-get",
    origin,
    expectPaid,
    plannedRequests: inventory.length,
    completedRequests: rows.length,
    paidRequests: 0,
    automaticRetries: 0,
    outcome:
      rows.length === inventory.length &&
      rows.every((row) => row.outcome === "pass")
        ? "pass"
        : "unaccepted",
    rows,
    limitations: [
      "GET delivery/config only: no IAM denial, genuine AI, Turnstile/action admission, live smoke, visual motion, lifecycle, peak capacity or rollback is established.",
      "Expected paid capability does not enable or authorize a provider call.",
    ],
  };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  if (
    process.argv.length < 3 ||
    process.argv.length > 4 ||
    (process.argv[3] && process.argv[3] !== "--expect-paid")
  )
    throw new Error(
      "Usage: node scripts/release/hosted.mjs artifacts/local/release-inputs.json [--expect-paid]",
    );
  const preflight = await preparePreflight(process.argv[2]);
  if (!preflight.candidate.matchesLocalLinuxEvidence)
    throw new Error("Candidate differs from recorded Linux evidence");
  const input = InputsSchema.parse(await readReleaseJson(process.argv[2]));
  if (!input.productionOrigin)
    throw new Error("Owner-confirmed HTTPS frontend origin is required");
  const result = await probeHosted({
    origin: input.productionOrigin,
    assets: await hostedAssetInventory(),
    expectPaid: process.argv[3] === "--expect-paid",
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.outcome !== "pass") process.exitCode = 1;
}
