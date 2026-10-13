import { createRequire } from "node:module";
import { open, lstat, realpath } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { sourceSnapshot } from "./snapshot.mjs";
import {
  evaluateSecurityPolicy,
  unverifiedSecurityPolicy,
} from "./security-policy.mjs";
const root = fileURLToPath(new URL("../../", import.meta.url));
const { z } = createRequire(
  new URL("../../apps/backend/package.json", import.meta.url),
)("zod");
const optional = (pattern, max = 256) =>
  z
    .string()
    .max(max)
    .refine(
      (value) => value === "" || pattern.test(value),
      "Invalid release metadata",
    );
const project = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/u;
const resource = /^[a-z][a-z0-9-]{0,62}$/u;
const account =
  /^[a-z][a-z0-9-]{4,28}[a-z0-9]@[a-z][a-z0-9-]{4,28}[a-z0-9]\.iam\.gserviceaccount\.com$/u;
const image =
  /^[a-z][a-z0-9-]*-docker\.pkg\.dev\/[a-z][a-z0-9-]{4,28}[a-z0-9]\/[a-z][a-z0-9-]{0,62}\/[a-z][a-z0-9-]{0,62}@sha256:[a-f0-9]{64}$/u;
export function httpsOrigin(value) {
  try {
    const url = new URL(value);
    return (
      url.origin === value &&
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      url.hostname
        .split(".")
        .every((label) =>
          /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/u.test(label),
        ) &&
      url.hostname.includes(".") &&
      !/^\d+(?:\.\d+){3}$/u.test(url.hostname) &&
      !url.hostname.endsWith(".localhost") &&
      !url.hostname.endsWith(".internal")
    );
  } catch {
    return false;
  }
}
const origin = z
  .string()
  .max(512)
  .refine((value) => value === "" || httpsOrigin(value));
const secret = optional(/^[A-Za-z0-9_-]{1,255}$/u);
const version = optional(/^[1-9]\d{0,9}$/u, 10);
export const InputsSchema = z
  .strictObject({
    projectId: optional(project, 30),
    region: optional(resource, 63),
    repository: optional(resource, 63),
    frontendService: optional(resource, 63),
    backendService: optional(resource, 63),
    frontendServiceAccount: optional(account),
    backendServiceAccount: optional(account),
    productionOrigin: origin,
    backendServiceUrl: origin.refine(
      (value) => !value || new URL(value).hostname.endsWith(".run.app"),
    ),
    frontendRegistryImage: optional(image, 512),
    backendRegistryImage: optional(image, 512),
    candidateTag: optional(/^[A-Za-z0-9._-]{1,64}$/u, 64),
    frontendRevision: optional(resource, 63),
    backendRevision: optional(resource, 63),
    priorFrontendRevision: optional(resource, 63),
    priorBackendRevision: optional(resource, 63),
    openaiSecret: secret,
    openaiSecretVersion: version,
    turnstileSecret: secret,
    turnstileSecretVersion: version,
    grantSecret: secret,
    grantSecretVersion: version,
    turnstileSiteKey: optional(/^[A-Za-z0-9_-]{1,256}$/u),
    originSecret: secret,
    originSecretVersion: version,
  })
  .superRefine((value, ctx) => {
    if (value.frontendService && value.frontendService === value.backendService)
      ctx.addIssue({
        code: "custom",
        message: "Two distinct services are required",
      });
    if (
      value.frontendServiceAccount &&
      value.frontendServiceAccount === value.backendServiceAccount
    )
      ctx.addIssue({
        code: "custom",
        message: "Separate runtime identities are required",
      });
    for (const name of ["frontendServiceAccount", "backendServiceAccount"])
      if (
        value[name] &&
        value.projectId &&
        !value[name].endsWith(`@${value.projectId}.iam.gserviceaccount.com`)
      )
        ctx.addIssue({
          code: "custom",
          message: "Runtime identity must belong to the named project",
        });
    for (const name of ["frontendRegistryImage", "backendRegistryImage"])
      if (
        value[name] &&
        value.projectId &&
        value.region &&
        value.repository &&
        !value[name].startsWith(
          `${value.region}-docker.pkg.dev/${value.projectId}/${value.repository}/`,
        )
      )
        ctx.addIssue({
          code: "custom",
          message: "Image must belong to the named registry",
        });
  });

/** JSON parse diagnostics must not echo fragments of operator input. */
export function parseReleaseJson(text) {
  if (typeof text !== "string" || Buffer.byteLength(text, "utf8") > 131072)
    throw new Error("Invalid release metadata envelope");
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Invalid release metadata JSON");
  }
}

/** Fixed regular local metadata only; bounded before parsing; never reads an env/secret path. */
export async function readReleaseJson(path, limit = 32768) {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 131072)
    throw new Error("Invalid release metadata envelope");
  const permitted = [
    "scripts/release/inputs.example.json",
    "scripts/release/security.example.json",
    "artifacts/local/release-inputs.json",
    "artifacts/local/release-security.json",
    "docs/validation/RTL-021/containers.json",
    "docs/validation/RTL-023/containers.json",
    "docs/validation/RTL-023/security-containers.json",
    "docs/validation/RTL-024/containers.json",
    "docs/validation/RTL-025/containers.json",
  ];
  const absolute = resolve(root, path);
  if (!permitted.some((candidate) => resolve(root, candidate) === absolute))
    throw new Error("Unsupported release metadata path");
  const canonical = await realpath(absolute);
  const samePath =
    process.platform === "win32"
      ? canonical.toLowerCase() === absolute.toLowerCase()
      : canonical === absolute;
  if (!(await lstat(absolute)).isFile() || !samePath)
    throw new Error("Release metadata must be a regular canonical file");
  const handle = await open(absolute, "r");
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size > limit)
      throw new Error("Release metadata exceeds its envelope");
    const buffer = Buffer.alloc(limit + 1);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    if (bytesRead > limit)
      throw new Error("Release metadata exceeds its envelope");
    return parseReleaseJson(buffer.subarray(0, bytesRead).toString("utf8"));
  } finally {
    await handle.close();
  }
}

/** Argument arrays are review output, never shell code or automatically executed. */
export function inspectionCommands(input) {
  const v = InputsSchema.parse(input);
  if (!v.projectId || !v.region || !v.frontendService || !v.backendService)
    return [];
  const commands = [];
  for (const service of [v.backendService, v.frontendService]) {
    commands.push([
      "gcloud",
      "run",
      "services",
      "describe",
      service,
      "--project",
      v.projectId,
      "--region",
      v.region,
      "--format=json(status.url,status.latestReadyRevisionName,status.traffic,spec.template.spec.serviceAccountName,spec.template.spec.containers.image,spec.template.spec.containers.ports,spec.template.spec.containers.resources,spec.template.spec.timeoutSeconds,spec.template.spec.containerConcurrency)",
    ]);
    commands.push([
      "gcloud",
      "run",
      "services",
      "get-iam-policy",
      service,
      "--project",
      v.projectId,
      "--region",
      v.region,
      "--format=json(bindings,etag,version)",
    ]);
  }
  for (const prefix of ["openai", "turnstile", "grant", "origin"])
    if (v[`${prefix}Secret`] && v[`${prefix}SecretVersion`])
      commands.push([
        "gcloud",
        "secrets",
        "versions",
        "describe",
        v[`${prefix}SecretVersion`],
        "--secret",
        v[`${prefix}Secret`],
        "--project",
        v.projectId,
        "--format=json(name,state,createTime)",
      ]);
  return commands;
}

export function evaluatePreflight(
  source,
  packaged,
  input,
  securityPolicy = unverifiedSecurityPolicy(),
) {
  const values = InputsSchema.parse(input);
  const missingInputs = Object.entries(values)
    .filter(([key, value]) => !value && !key.startsWith("prior"))
    .map(([key]) => key);
  const matches = source.fingerprint === packaged.source.fingerprint;
  return {
    schemaVersion: 1,
    candidate: {
      gitRevision: source.gitRevision,
      dirty: source.dirty,
      fingerprint: source.fingerprint,
      packagedFingerprint: packaged.source.fingerprint,
      matchesLocalLinuxEvidence: matches,
      frontendLocalImage: packaged.images.frontend.id,
      backendLocalImage: packaged.images.backend.id,
    },
    localVerdict: matches ? "matches-local-linux-candidate" : "source-mismatch",
    missingInputs,
    firstReleaseRecovery: !(
      values.priorFrontendRevision && values.priorBackendRevision
    ),
    publicReleaseAccepted: false,
    publicationAuthorized: false,
    paidRequests: 0,
    networkRequests: 0,
    security: evaluateSecurityPolicy(securityPolicy, source, packaged),
    externalGates: [
      "Owner authorization for exact cloud resources/publication",
      "Accepted same-candidate RTL-020 live vision/Tailor/account/retention/billing",
      "Published immutable registry digests and active runtime/config/secret versions",
      "IAM enforcement/private backend and authenticated bridge",
      "Confirmed HTTPS origin/domain/Turnstile and real action admission",
      "Authorized bounded hosted smoke and capacity observations",
      "Owner/physical/zoom/hosted visual and lifecycle acceptance",
      "Actual paid-disable verification and compatible immutable recovery/drill scope",
    ],
    readOnlyInspectionCommands: inspectionCommands(values),
  };
}

export async function preparePreflight(
  inputPath = "scripts/release/inputs.example.json",
  securityPath = "scripts/release/security.example.json",
) {
  const input = await readReleaseJson(inputPath);
  const securityPolicy = await readReleaseJson(securityPath);
  const packaged = await readReleaseJson(
    "docs/validation/RTL-025/containers.json",
    131072,
  );
  // Narrow existing evidence checks. A record is not permission or new container execution.
  for (const image of Object.values(packaged.images))
    if (
      image.os !== "linux" ||
      image.architecture !== "amd64" ||
      !/^sha256:[a-f0-9]{64}$/u.test(image.id)
    )
      throw new Error("Invalid local Linux evidence");
  return evaluatePreflight(
    await sourceSnapshot(),
    packaged,
    input,
    securityPolicy,
  );
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  if (process.argv.length > 4)
    throw new Error(
      "Usage: node scripts/release/preflight.mjs [artifacts/local/release-inputs.json] [artifacts/local/release-security.json]",
    );
  const result = await preparePreflight(process.argv[2], process.argv[3]);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.candidate.matchesLocalLinuxEvidence) process.exitCode = 1;
}
