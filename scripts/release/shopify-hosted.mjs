import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const SHOPIFY_RELEASE = Object.freeze({
  project: "retailor-511714",
  region: "europe-west1",
  origin: "https://tryretailor.com",
  ledgerBucket: "retailor-511714-shopify-ledger",
  scheduler: "retailor-shopify-cleanup",
  schedulerIdentity:
    "retailor-shopify-cleanup@retailor-511714.iam.gserviceaccount.com",
  backend: "retailor-backend",
  frontend: "retailor-frontend",
  backendAudience: "https://retailor-backend-xmacampiyq-ew.a.run.app",
  secrets: { SHOPIFY_CLIENT_SECRET: "1", SHOPIFY_ENCRYPTION_KEY: "1" },
});
const publicEnv = new Set([
  "APP_ENV",
  "FAKE_MODE",
  "PAID_DEMO_ENABLED",
  "FRONTEND_ORIGIN",
  "PORT",
  "RETAILOR_DEV",
  "RETAILOR_FRONTEND_ORIGIN",
  "RETAILOR_BACKEND_ORIGIN",
  "RETAILOR_BACKEND_AUDIENCE",
  "RETAILOR_ORIGIN_GUARD_ENABLED",
  "RETAILOR_ORIGIN_GUARD",
  "BACKEND_ORIGIN",
  "BACKEND_AUDIENCE",
]);
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  return value;
}
const hash = (value) =>
  createHash("sha256")
    .update(JSON.stringify(canonical(value)))
    .digest("hex");
function roleName(role) {
  if (role !== "frontend" && role !== "backend")
    throw new Error("Unknown Retailor role");
  return SHOPIFY_RELEASE[role];
}
/** Hash all preserved configuration; emit only selected public values/references. */
export function serviceSnapshot(service, role) {
  const name = roleName(role);
  if (service?.metadata?.name !== name)
    throw new Error("Unexpected Cloud Run service");
  const template = structuredClone(service.spec?.template);
  const containers = template?.spec?.containers;
  if (!Array.isArray(containers) || containers.length !== 1)
    throw new Error("Unexpected container layout");
  const container = containers[0],
    image = container.image;
  delete container.image;
  const env = container.env ?? [];
  const integration = env.filter((e) =>
    Object.hasOwn(SHOPIFY_RELEASE.secrets, e.name),
  );
  if (role === "frontend" && integration.length)
    throw new Error("Shopify secrets must not enter frontend");
  for (const entry of integration) {
    const ref = entry.valueFrom?.secretKeyRef;
    if (
      entry.value !== undefined ||
      ref?.name !== entry.name ||
      ref?.key !== SHOPIFY_RELEASE.secrets[entry.name]
    )
      throw new Error("Unexpected Shopify secret binding");
  }
  container.env = env
    .filter((e) => !Object.hasOwn(SHOPIFY_RELEASE.secrets, e.name))
    .sort((a, b) => a.name.localeCompare(b.name));
  if (template.metadata) {
    delete template.metadata.name;
    for (const key of [
      "client.knative.dev/user-image",
      "run.googleapis.com/client-name",
      "run.googleapis.com/client-version",
    ])
      if (template.metadata.annotations)
        delete template.metadata.annotations[key];
  }
  const publicEntries = env.map((e) => ({
    name: e.name,
    ...(e.valueFrom
      ? { valueFrom: e.valueFrom }
      : publicEnv.has(e.name)
        ? { value: e.value }
        : { valueHash: hash(e.value) }),
  }));
  return {
    schemaVersion: 1,
    service: name,
    role,
    image,
    preservedDigest: hash({
      template,
      ingress:
        service.metadata.annotations?.["run.googleapis.com/ingress"] ?? null,
    }),
    serviceAccount: template.spec.serviceAccountName,
    concurrency: template.spec.containerConcurrency,
    timeoutSeconds: template.spec.timeoutSeconds,
    resources: container.resources,
    annotations: template.metadata?.annotations ?? {},
    env: publicEntries,
    integrationSecretCount: integration.length,
    url: service.status?.url,
    revision: service.status?.latestReadyRevisionName,
    traffic: service.status?.traffic ?? [],
  };
}
export function assertPreserved(before, after) {
  if (
    before.service !== after.service ||
    before.role !== after.role ||
    before.preservedDigest !== after.preservedDigest
  )
    throw new Error("Existing deployment configuration changed");
  if (after.role === "backend" && after.integrationSecretCount !== 2)
    throw new Error("Both pinned Shopify bindings are required");
  return true;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const [operation, role, arg1, arg2] = process.argv.slice(2);
  try {
    if (operation === "plan")
      process.stdout.write(`${JSON.stringify(SHOPIFY_RELEASE, null, 2)}\n`);
    else if (operation === "snapshot")
      process.stdout.write(
        `${JSON.stringify(serviceSnapshot(JSON.parse(readFileSync(0, "utf8")), role), null, 2)}\n`,
      );
    else if (operation === "compare") {
      assertPreserved(
        JSON.parse(readFileSync(arg1, "utf8")),
        JSON.parse(readFileSync(arg2, "utf8")),
      );
      process.stdout.write(
        "Existing service configuration preserved; only image and pinned Shopify bindings differ.\n",
      );
    } else throw new Error("Unknown read-only release operation");
  } catch {
    process.stderr.write(
      "Retailor Shopify deployment metadata check failed. No configuration or secret payload was printed.\n",
    );
    process.exitCode = 1;
  }
}
