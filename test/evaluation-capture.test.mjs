import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { evaluationPlan } from "../scripts/evaluate/plan.mjs";
import {
  authorizationDigest,
  validateAuthorization,
  createCaptureSession,
} from "../scripts/evaluate/capture.mjs";
import { composeRuntime } from "../apps/backend/src/runtime/compose.js";
import { parseEnvironment } from "../apps/backend/src/config/environment.js";
import { assistantFixture } from "../apps/backend/test/assistant-fixture.js";
import { executeEvaluation } from "../scripts/evaluate/run.mjs";
const candidate = "b".repeat(40),
  origin = "http://127.0.0.1:4310";
function approved(caseIds = ["shopper_category"]) {
  const plan = evaluationPlan(candidate, {});
  return validateAuthorization(
    {
      schemaVersion: 1,
      approvalId: randomUUID(),
      candidate,
      planDigest: authorizationDigest(plan),
      ownerApproved: true,
      accountAndRetentionVerified: true,
      logoOutputEnvelopeVerified: false,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      caseIds,
    },
    plan,
  );
}
describe("operator-only bounded metadata capture", () => {
  it("rejects mismatched/unapproved/expired/duplicate/logo scopes before transport and configuration", async () => {
    const plan = evaluationPlan(candidate, {}),
      authorization = approved();
    for (const patch of [
      { ownerApproved: false },
      { candidate: "c".repeat(40) },
      { planDigest: "0".repeat(64) },
      { expiresAt: "2020-01-01T00:00:00.000Z" },
      { caseIds: ["shopper_category", "shopper_category"] },
      { caseIds: ["logos_optional"] },
    ])
      expect(() =>
        validateAuthorization({ ...authorization, ...patch }, plan),
      ).toThrow();
    const environment = vi.spyOn(process, "loadEnvFile");
    await expect(
      executeEvaluation(["--capture", "missing-operator-authorization.json"]),
    ).rejects.toThrow();
    expect(environment).not.toHaveBeenCalled();
  });
  it("preserves production validation while recording only safe counts/IDs/usage and refusing another case", async () => {
    const emitted = [],
      session = createCaptureSession(
        approved(),
        (row) => emitted.push(row),
        "fixture",
      );
    const upstream = vi.fn(
      async () =>
        new Response("{}", { headers: { "x-request-id": "req_fixture123" } }),
    );
    const observedFetch = session.fetcher(upstream);
    const base = composeRuntime(parseEnvironment({}), randomUUID),
      provider = base.assistant.provider;
    const app = session.wrap({
      ...base,
      assistant: {
        ...base.assistant,
        provider: {
          begin(prepared) {
            const delegate = provider.begin(prepared);
            return {
              async next(outputs, finalOnly, signal, dispatch, usage) {
                dispatch();
                await observedFetch("https://api.openai.com/v1/responses", {
                  method: "POST",
                  signal,
                });
                usage({ input: 100, output: 20 });
                return delegate.next(
                  outputs,
                  finalOnly,
                  signal,
                  () => {},
                  () => {},
                );
              },
            };
          },
        },
      },
    });
    const payload = assistantFixture("shopper", new Date().toISOString());
    payload.prompt = "Show jeans. private-content-marker";
    const result = await request(app)
      .post("/v1/assistant/shopper")
      .set("Origin", origin)
      .send({ payload, action: null, grant: null });
    expect(result.status).toBe(200);
    expect(upstream).toHaveBeenCalledTimes(1);
    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toMatchObject({
      execution: "fixture",
      outcome: "unknown",
      providerRequests: 1,
      requestIds: ["req_fixture123"],
      usage: { inputTokens: 100, outputTokens: 20 },
      measuredCostMicroUsd: null,
    });
    expect(JSON.stringify(emitted)).not.toContain("private-content-marker");
    expect(JSON.stringify(emitted)).not.toContain("graph");
    payload.operationId = "unapproved_extra";
    expect(
      (
        await request(app)
          .post("/v1/assistant/shopper")
          .set("Origin", origin)
          .send({ payload, action: null, grant: null })
      ).status,
    ).toBe(503);
    expect(upstream).toHaveBeenCalledTimes(1);
    expect((await request(app).get("/v1/config")).body.tailor.available).toBe(
      false,
    );
    expect((await request(app).get("/v1/ready")).status).toBe(503);
  });
  it("stops after unknown usage and never dispatches an out-of-scope fetch", async () => {
    const session = createCaptureSession(approved(), () => {}, "fixture");
    const outside = vi.fn();
    await expect(
      session.fetcher(outside)("https://other.example", { method: "POST" }),
    ).rejects.toMatchObject({ code: "OPERATOR_REQUIRED" });
    expect(outside).not.toHaveBeenCalled();
    const another = createCaptureSession(
      approved(["shopper_category", "shopper_eur_budget"]),
      () => {},
      "fixture",
    );
    const base = composeRuntime(parseEnvironment({}), randomUUID),
      provider = base.assistant.provider;
    const app = another.wrap({
      ...base,
      assistant: {
        ...base.assistant,
        provider: {
          begin(prepared) {
            const delegate = provider.begin(prepared);
            return {
              next(outputs, finalOnly, signal, dispatch) {
                dispatch();
                return delegate.next(
                  outputs,
                  finalOnly,
                  signal,
                  () => {},
                  () => {},
                );
              },
            };
          },
        },
      },
    });
    const payload = assistantFixture("shopper", new Date().toISOString());
    payload.prompt = "Show jeans";
    expect(
      (
        await request(app)
          .post("/v1/assistant/shopper")
          .set("Origin", origin)
          .send({ payload, action: null, grant: null })
      ).status,
    ).toBe(200);
    expect(another.rows[0].usage).toBeNull();
    expect(another.stopped).toBe(true);
  });
});
