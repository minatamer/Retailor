import { expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../http/app.js";
import { composeRuntime } from "../runtime/compose.js";
import { parseEnvironment } from "../config/environment.js";
import { fixtureLogos } from "./fake.js";
import { createHash } from "node:crypto";
import { PaidAdmission } from "../security/admission.js";
it("binds actual live payload to the shared admitted action without contacting a paid provider", async () => {
  const gate = new PaidAdmission({
    secret: "s".repeat(32),
    budgetMicroUsd: 5000000,
    challenge: { verify: async () => true },
  });
  const provider = fixtureLogos(),
    generate = vi.fn(provider.generate.bind(provider)),
    base = composeRuntime(parseEnvironment({}), () => "request_test");
  const app = createApp({
    ...base,
    recognition: { admission: gate, provider: { interpret: async () => ({}) } },
    logos: { mode: "live", admission: gate, provider: { generate } },
  });
  const body = input(),
    action = {
      schemaVersion: 1,
      action: "logos",
      mode: "live",
      workspaceId: body.workspaceId,
      operationId: body.operationId,
      createdAt: body.createdAt,
      expiresAt: body.expiresAt,
      nameDigest: createHash("sha256").update(body.context.name).digest("hex"),
      theme: body.context.theme,
      typography: body.context.typography,
      designRevision: 0,
      count: 3,
      promptPolicy: "clothing-brand-v1",
      outputPolicy: "transparent-png-v1",
      disclosureVersion: "brand-context-v1",
    };
  const admitted = await request(app)
    .post("/v1/admission")
    .set("Origin", origin)
    .send({ action, challengeProof: "proof" });
  expect(admitted.status).toBe(200);
  const cookie = String(admitted.headers["set-cookie"]?.[0]).split(";")[0]!;
  const send = (name: string) =>
    request(app)
      .post("/v1/brand/logos")
      .set("Origin", origin)
      .set("Cookie", cookie)
      .send({
        ...body,
        mode: "live",
        context: { ...body.context, name },
        action,
        grant: admitted.body.grant,
      });
  expect((await send("Changed name")).status).toBe(403);
  expect(generate).not.toHaveBeenCalled();
  expect((await send(body.context.name)).status).toBe(200);
  expect(generate).toHaveBeenCalledTimes(1);
  expect(gate.counters()).toEqual({ active: 0, reservedMicroUsd: 2000000 });
  expect((await send(body.context.name)).status).toBe(403);
  expect(generate).toHaveBeenCalledTimes(1);
});
const origin = "http://127.0.0.1:4310";
function input(operationId = "batch_one") {
  const createdAt = new Date().toISOString();
  return {
    schemaVersion: 1,
    mode: "fake",
    workspaceId: "workspace_test",
    operationId,
    createdAt,
    expiresAt: new Date(Date.parse(createdAt) + 7200000).toISOString(),
    context: {
      name: "West & Woven",
      theme: "ink",
      typography: "editorial",
      designRevision: 0,
      themeConfirmed: true,
      typographyConfirmed: true,
    },
    action: null,
    grant: null,
  };
}
it("connects distinct real alpha PNGs, forbids replay/third batch and bounds strict JSON before provider entry", async () => {
  const base = composeRuntime(parseEnvironment({}), () => "request_test"),
    provider = fixtureLogos();
  const generate = vi.fn(provider.generate.bind(provider));
  const app = createApp({
    ...base,
    logos: { mode: "fake", provider: { generate } },
  });
  const body = input(),
    send = (value: object) =>
      request(app).post("/v1/brand/logos").set("Origin", origin).send(value);
  expect((await send({ ...body, prompt: "arbitrary" })).status).toBe(400);
  expect(
    (
      await send({
        ...body,
        context: { ...body.context, themeConfirmed: false },
      })
    ).status,
  ).toBe(400);
  expect((await send({ ...body, large: "x".repeat(65536) })).status).toBe(413);
  expect(generate).not.toHaveBeenCalled();
  const result = await send(body);
  expect(result.status).toBe(200);
  expect(result.body.candidates).toHaveLength(3);
  expect(
    new Set(result.body.candidates.map((c: { hash: string }) => c.hash)).size,
  ).toBe(3);
  expect((await send(body)).status).toBe(403);
  expect((await send({ ...body, operationId: "batch_two" })).status).toBe(200);
  expect((await send({ ...body, operationId: "batch_three" })).status).toBe(
    403,
  );
  expect(generate).toHaveBeenCalledTimes(2);
});
it("leaves unavailable live logos closed and config reveals dispatch nothing", async () => {
  const generate = vi.fn(async () => []),
    factory = vi.fn(() => ({ generate }));
  const runtime = composeRuntime(
    parseEnvironment({
      FAKE_MODE: "false",
      LOGO_GENERATION_ENABLED: "true",
      LOGO_POLICY_APPROVED: "true",
    }),
    () => "request_test",
    undefined,
    undefined,
    undefined,
    factory,
  );
  const app = createApp(runtime);
  for (const route of ["health", "ready", "config"])
    await request(app).get(`/v1/${route}`);
  expect(factory).not.toHaveBeenCalled();
  expect(generate).not.toHaveBeenCalled();
  expect(
    (
      await request(app)
        .post("/v1/brand/logos")
        .set("Origin", origin)
        .send(input())
    ).status,
  ).toBe(503);
});
it("retains the two-process and one-workspace fake capacity until cancellation releases a lease", async () => {
  const generate = vi.fn(
    (_context, signal: AbortSignal, accounting: { dispatch(): void }) => {
      accounting.dispatch();
      return new Promise<Uint8Array[]>((_resolve, reject) =>
        signal.addEventListener("abort", () => reject(new Error("cancelled")), {
          once: true,
        }),
      );
    },
  );
  const base = composeRuntime(parseEnvironment({}), () => "request_test"),
    app = createApp({
      ...base,
      logos: { mode: "fake", provider: { generate } },
    });
  const body = input();
  const first = request(app)
    .post("/v1/brand/logos")
    .set("Origin", origin)
    .send(body);
  const running = first.then(
    (value) => value,
    () => undefined,
  );
  await vi.waitFor(() => expect(generate).toHaveBeenCalledTimes(1));
  const second = request(app)
    .post("/v1/brand/logos")
    .set("Origin", origin)
    .send({ ...body, workspaceId: "second_workspace" });
  const runningSecond = second.then(
    (value) => value,
    () => undefined,
  );
  await vi.waitFor(() => expect(generate).toHaveBeenCalledTimes(2));
  expect(
    (
      await request(app)
        .post("/v1/brand/logos")
        .set("Origin", origin)
        .send({ ...body, workspaceId: "third_workspace" })
    ).status,
  ).toBe(429);
  expect(
    (
      await request(app)
        .post("/v1/brand/logos")
        .set("Origin", origin)
        .send({ ...body, operationId: "same_workspace" })
    ).status,
  ).toBe(429);
  first.abort();
  second.abort();
  await Promise.all([running, runningSecond]);
});
