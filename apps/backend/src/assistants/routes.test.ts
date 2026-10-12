import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../http/app.js";
import { composeRuntime } from "../runtime/compose.js";
import { parseEnvironment } from "../config/environment.js";
import { PaidAdmission } from "../security/admission.js";
import { assistantFixture } from "../../test/assistant-fixture.js";
import { AssistantPayloadSchema } from "@retailor/contracts/assistant";
const origin = "http://127.0.0.1:4310";
describe("fixed assistant HTTP roles", () => {
  it("keeps fake responses current, rejects foreign role/mode and caps combined example turns", async () => {
    const app = createApp(
      composeRuntime(parseEnvironment({}), () => "request_test"),
    );
    const payload = assistantFixture("shopper", new Date().toISOString());
    payload.prompt = "Show jeans under $60";
    const send = (path = "shopper", body = payload) =>
      request(app)
        .post(`/v1/assistant/${path}`)
        .set("Origin", origin)
        .send({ payload: body, action: null, grant: null });
    expect((await send("owner")).status).toBe(403);
    const result = await send();
    expect(result.status).toBe(200);
    expect(result.body.reply.navigation.maximum).toBe(6000);
    expect((await send()).status).toBe(403);
    for (let i = 1; i < 12; i++) {
      payload.operationId = `turn_${i}`;
      payload.context.role = i % 2 ? "creator" : "owner";
      expect((await send(payload.context.role)).status).toBe(200);
    }
    payload.operationId = "over_cap";
    expect((await send(payload.context.role)).status).toBe(403);
    expect((await send("shopper", { ...payload, mode: "live" })).status).toBe(
      400,
    );
  });
  it("binds actual payload digest/role and spends a single shared lease only on provider dispatch", async () => {
    const gate = new PaidAdmission({
      secret: "s".repeat(32),
      budgetMicroUsd: 5000000,
      challenge: { verify: async () => true },
    });
    const next = vi.fn(
      async (
        _outputs,
        _finalOnly,
        _signal,
        dispatch: () => void,
        usage: (u: { input: number; output: number }) => void,
      ) => {
        dispatch();
        usage({ input: 100, output: 50 });
        return {
          kind: "reply" as const,
          reply: {
            text: "The current facts are ready.",
            references: [],
            claims: [],
            navigation: null,
            proposal: null,
          },
        };
      },
    );
    const base = composeRuntime(parseEnvironment({}), () => "request_test");
    const app = createApp({
      ...base,
      recognition: {
        admission: gate,
        provider: { interpret: async () => ({}) },
      },
      assistant: {
        mode: "live",
        admission: gate,
        provider: { begin: () => ({ next }) },
      },
    });
    const payload = assistantFixture("owner", new Date().toISOString());
    payload.mode = "live";
    const g = payload.context.graph;
    const action = {
      schemaVersion: 1,
      action: "assistant",
      mode: "live",
      role: "owner",
      workspaceId: g.workspaceId,
      operationId: payload.operationId,
      scenarioId: g.scenarioId,
      dataRevision: g.revision,
      createdAt: g.createdAt,
      expiresAt: g.expiresAt,
      disclosureVersion: "tailor-context-v1",
      digest: createHash("sha256")
        .update(JSON.stringify(AssistantPayloadSchema.parse(payload)))
        .digest("hex"),
    };
    const admitted = await request(app)
      .post("/v1/admission")
      .set("Origin", origin)
      .send({ action, challengeProof: "proof" });
    expect(admitted.status).toBe(200);
    const cookie = String(admitted.headers["set-cookie"]?.[0]).split(";")[0]!;
    const send = (body = payload) =>
      request(app)
        .post("/v1/assistant/owner")
        .set("Origin", origin)
        .set("Cookie", cookie)
        .send({ payload: body, action, grant: admitted.body.grant });
    expect((await send({ ...payload, prompt: "changed" })).status).toBe(403);
    expect(next).not.toHaveBeenCalled();
    expect((await send()).status).toBe(200);
    expect(next).toHaveBeenCalledTimes(1);
    expect(gate.counters()).toEqual({ active: 0, reservedMicroUsd: 1000000 });
    expect(gate.usageCounters()).toEqual({
      inputTokens: 100,
      outputTokens: 50,
      unknownDispatches: 0,
    });
    expect((await send()).status).toBe(403);
  });
  it("leaves paid-off live unavailable and rejects oversize before invoking a provider", async () => {
    const base = composeRuntime(
        parseEnvironment({ FAKE_MODE: "false" }),
        () => "request_test",
      ),
      app = createApp(base);
    expect(
      (
        await request(app)
          .post("/v1/assistant/owner")
          .set("Origin", origin)
          .send({})
      ).status,
    ).toBe(503);
    const fake = createApp(
      composeRuntime(parseEnvironment({}), () => "request_test"),
    );
    expect(
      (
        await request(fake)
          .post("/v1/assistant/owner")
          .set("Origin", origin)
          .send({ padding: "x".repeat(768 * 1024) })
      ).status,
    ).toBe(413);
  });
});
