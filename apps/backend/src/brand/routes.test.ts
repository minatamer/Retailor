import { expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../http/app.js";
import { composeRuntime } from "../runtime/compose.js";
import { parseEnvironment } from "../config/environment.js";
import { localLogos } from "./local.js";
import { createHash } from "node:crypto";
import { PaidAdmission } from "../security/admission.js";
import { action as catalogueAction } from "../../../../test/fixtures/recognition.js";

it("generates local production logos with paid AI off, retaining challenge, cookie and exact-context grants", async () => {
  const frontendOrigin = "https://store.example";
  const runtime = composeRuntime(
    parseEnvironment({
      APP_ENV: "production",
      FAKE_MODE: "false",
      FRONTEND_ORIGIN: frontendOrigin,
      TURNSTILE_SECRET_KEY: "injected-secret",
      TURNSTILE_SITE_KEY: "public-test",
      GRANT_SIGNING_SECRET: "s".repeat(32),
    }),
    () => "request_native",
  );
  const verify = vi.fn(async (proof: string) => proof === "valid-proof");
  const gate = new PaidAdmission({
    secret: "s".repeat(32),
    challenge: { verify },
  });
  expect(runtime.recognition).toBeUndefined();
  expect(runtime.assistant).toBeUndefined();
  runtime.logos!.admission = gate;
  const generate = vi.spyOn(runtime.logos!.provider, "generate");
  const network = vi.spyOn(globalThis, "fetch");
  const application = createApp(runtime);
  const config = (await request(application).get("/v1/config")).body;
  expect(config).toMatchObject({
    paidEnabled: false,
    mode: "live",
    logos: { available: true, reason: "ready" },
    admissionSiteKey: "public-test",
  });
  const body = input();
  const action = {
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
    designRevision: body.context.designRevision,
    count: 3,
    generatorPolicy: "local-fonts-v1",
    outputPolicy: "transparent-png-v1",
  };
  const admit = (challengeProof: unknown) =>
    request(application)
      .post("/v1/admission")
      .set("Origin", frontendOrigin)
      .send({ action, challengeProof });
  expect((await admit(null)).status).toBe(400);
  expect((await admit("invalid-proof")).status).toBe(403);
  const admitted = await admit("valid-proof");
  expect(admitted.status).toBe(200);
  const cookie = String(admitted.headers["set-cookie"]?.[0]).split(";")[0]!;
  const send = (withCookie: boolean, name = body.context.name) => {
    const operation = request(application)
      .post("/v1/brand/logos")
      .set("Origin", frontendOrigin);
    if (withCookie) operation.set("Cookie", cookie);
    return operation.send({
      ...body,
      mode: "live",
      context: { ...body.context, name },
      action,
      grant: admitted.body.grant,
    });
  };
  expect((await send(false)).status).toBe(403);
  expect((await send(true, "Different name")).status).toBe(403);
  expect(generate).not.toHaveBeenCalled();
  const response = await send(true);
  expect(response.status).toBe(200);
  expect(response.body.candidates).toHaveLength(3);
  expect(
    new Set(response.body.candidates.map((row: { hash: string }) => row.hash))
      .size,
  ).toBe(3);
  expect((await send(true)).status).toBe(403);
  expect(
    (
      await request(application)
        .post("/v1/admission")
        .set("Origin", frontendOrigin)
        .send({ action: catalogueAction(), challengeProof: "valid-proof" })
    ).status,
  ).toBe(503);
  expect(verify).toHaveBeenCalledTimes(2);
  expect(generate).toHaveBeenCalledOnce();
  expect(gate.counters().active).toBe(0);
  expect(gate.usageCounters()).toEqual({
    inputTokens: 0,
    outputTokens: 0,
    unknownDispatches: 0,
  });
  expect(network).not.toHaveBeenCalled();
  network.mockRestore();
});
it("binds actual live payload to the shared admitted action without contacting a paid provider", async () => {
  const gate = new PaidAdmission({
    secret: "s".repeat(32),
    challenge: { verify: async () => true },
  });
  const provider = localLogos(),
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
      generatorPolicy: "local-fonts-v1",
      outputPolicy: "transparent-png-v1",
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
  expect(gate.counters()).toEqual({ active: 0 });
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
    provider = localLogos();
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
