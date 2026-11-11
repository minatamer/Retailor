import { describe, expect, it } from "vitest";
import {
  assertPreserved,
  serviceSnapshot,
  SHOPIFY_RELEASE,
} from "../scripts/release/shopify-hosted.mjs";
function service() {
  return {
    metadata: {
      name: SHOPIFY_RELEASE.backend,
      annotations: { "run.googleapis.com/ingress": "all" },
    },
    spec: {
      template: {
        metadata: {
          name: "old-revision",
          annotations: { "autoscaling.knative.dev/maxScale": "1" },
        },
        spec: {
          serviceAccountName:
            "retailor-backend@retailor-511714.iam.gserviceaccount.com",
          containerConcurrency: 4,
          timeoutSeconds: 240,
          containers: [
            {
              image: "old-image",
              resources: { limits: { cpu: "1", memory: "1Gi" } },
              env: [
                { name: "FRONTEND_ORIGIN", value: SHOPIFY_RELEASE.origin },
                { name: "PAID_DEMO_ENABLED", value: "true" },
                {
                  name: "OPENAI_API_KEY",
                  valueFrom: {
                    secretKeyRef: { name: "OPENAI_API_KEY", key: "1" },
                  },
                },
                { name: "PRIVATE_INLINE_TEST", value: "PRIVATE_SENTINEL" },
              ],
            },
          ],
        },
      },
    },
    status: { traffic: [{ revisionName: "old-revision", percent: 100 }] },
  };
}
function candidate(original) {
  const next = structuredClone(original),
    c = next.spec.template.spec.containers[0];
  c.image = "new-immutable-image";
  next.spec.template.metadata.name = "new-revision";
  for (const [name, key] of Object.entries(SHOPIFY_RELEASE.secrets))
    c.env.push({ name, valueFrom: { secretKeyRef: { name, key } } });
  return next;
}
describe("existing deployment preservation", () => {
  it("allows only the image and two exact backend secret references, without revealing inline secrets", () => {
    const original = service(),
      before = serviceSnapshot(original, "backend"),
      after = serviceSnapshot(candidate(original), "backend");
    expect(assertPreserved(before, after)).toBe(true);
    expect(JSON.stringify(before)).not.toContain("PRIVATE_SENTINEL");
    expect(after.integrationSecretCount).toBe(2);
  });
  it.each([
    "origin",
    "paid",
    "identity",
    "resources",
    "scale",
    "existing-secret",
  ])("detects unintended %s changes", (field) => {
    const original = service(),
      next = candidate(original),
      spec = next.spec.template.spec,
      c = spec.containers[0];
    if (field === "origin") c.env[0].value = "https://other.example";
    if (field === "paid") c.env[1].value = "false";
    if (field === "identity") spec.serviceAccountName = "foreign@example.com";
    if (field === "resources") c.resources.limits.memory = "2Gi";
    if (field === "scale")
      next.spec.template.metadata.annotations[
        "autoscaling.knative.dev/maxScale"
      ] = "2";
    if (field === "existing-secret") c.env[2].valueFrom.secretKeyRef.key = "2";
    expect(() =>
      assertPreserved(
        serviceSnapshot(original, "backend"),
        serviceSnapshot(next, "backend"),
      ),
    ).toThrow("configuration changed");
  });
  it("rejects unpinned or inline Shopify values and frontend bindings", () => {
    const original = service(),
      next = candidate(original),
      env = next.spec.template.spec.containers[0].env;
    env.find(
      (e) => e.name === "SHOPIFY_CLIENT_SECRET",
    ).valueFrom.secretKeyRef.key = "latest";
    expect(() => serviceSnapshot(next, "backend")).toThrow("binding");
    const inline = candidate(original),
      entry = inline.spec.template.spec.containers[0].env.find(
        (e) => e.name === "SHOPIFY_CLIENT_SECRET",
      );
    delete entry.valueFrom;
    entry.value = "PRIVATE_INLINE_SHOPIFY";
    expect(() => serviceSnapshot(inline, "backend")).toThrow("binding");
    const front = candidate(original);
    front.metadata.name = SHOPIFY_RELEASE.frontend;
    expect(() => serviceSnapshot(front, "frontend")).toThrow("frontend");
  });
});
