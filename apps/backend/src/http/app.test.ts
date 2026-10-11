import { describe, it, expect } from "vitest";
import request from "supertest";
import { parseEnvironment } from "../config/environment.js";
import { composeRuntime } from "../runtime/compose.js";
import { createApp } from "./app.js";
import { PaidAdmission } from "../security/admission.js";
import { action } from "../../../../test/fixtures/recognition.js";
function app(env: Record<string, string | undefined> = {}) {
  return createApp(composeRuntime(parseEnvironment(env), () => "req_test"));
}
describe("safe runtime composition", () => {
  it("reports exhausted vision unavailable and rejects another proof before verification", async () => {
    let checks = 0;
    const gate = new PaidAdmission({
      secret: "s".repeat(32),
      budgetMicroUsd: 1_000_000,
      challenge: {
        verify: async () => {
          checks++;
          return true;
        },
      },
    });
    const runtime = composeRuntime(
      parseEnvironment({
        FAKE_MODE: "false",
        PAID_DEMO_ENABLED: "true",
        LIVE_POLICY_APPROVED: "true",
        PROCESS_BUDGET_MICRO_USD: "1000000",
        OPENAI_API_KEY: "injected-test-key",
        TURNSTILE_SECRET_KEY: "injected-test-key",
        TURNSTILE_SITE_KEY: "public-test-key",
        GRANT_SIGNING_SECRET: "s".repeat(32),
      }),
      () => "request_test",
      () => ({ admission: gate, provider: { interpret: async () => ({}) } }),
    );
    const app = createApp(runtime);
    expect((await request(app).get("/v1/config")).body.vision.available).toBe(
      true,
    );
    const value = action(),
      identity = gate.safety(undefined).identity,
      grant = await gate.admit(
        value,
        "proof",
        identity,
        new AbortController().signal,
      );
    const lease = gate.begin(value, grant.grant, identity);
    lease.dispatch();
    lease.finish();
    expect((await request(app).get("/v1/config")).body.vision.available).toBe(
      false,
    );
    await expect(
      gate.admit(
        action("another"),
        "proof",
        identity,
        new AbortController().signal,
      ),
    ).rejects.toThrow("UNAVAILABLE");
    expect(checks).toBe(1);
  });
  it("never constructs live ports until explicit approved policy and budget accompany every prerequisite", () => {
    const factory = () => {
      throw new Error("Live factory must remain inert");
    };
    const candidate = {
      FAKE_MODE: "false",
      PAID_DEMO_ENABLED: "true",
      OPENAI_API_KEY: "test-key",
      TURNSTILE_SECRET_KEY: "test-key",
      TURNSTILE_SITE_KEY: "test-site-key",
      GRANT_SIGNING_SECRET: "s".repeat(32),
    };
    expect(
      composeRuntime(parseEnvironment(candidate), () => "request", factory)
        .capabilities.vision.available,
    ).toBe(false);
    expect(
      composeRuntime(
        parseEnvironment({ ...candidate, LIVE_POLICY_APPROVED: "true" }),
        () => "request",
        factory,
      ).capabilities.vision.available,
    ).toBe(false);
    expect(
      composeRuntime(
        parseEnvironment({
          ...candidate,
          PAID_DEMO_ENABLED: "false",
          LIVE_POLICY_APPROVED: "true",
          PROCESS_BUDGET_MICRO_USD: "1000000",
        }),
        () => "request",
        factory,
      ).capabilities.vision.available,
    ).toBe(false);
  });
  it("does not contact providers for liveness/readiness/config", async () => {
    expect((await request(app()).get("/v1/health")).body.service).toBe(
      "retailor-backend",
    );
    expect((await request(app()).get("/v1/ready")).status).toBe(200);
    const config = await request(app()).get("/v1/config");
    expect(config.body.mode).toBe("fake");
    expect(config.body.paidEnabled).toBe(false);
    expect(config.body.vision.available).toBe(false);
  });
  it("never falls back to fake when live is unavailable", async () => {
    const live = app({ FAKE_MODE: "false", PAID_DEMO_ENABLED: "true" });
    expect((await request(live).get("/v1/ready")).status).toBe(503);
    expect((await request(live).get("/v1/config")).body.mode).toBe("live");
  });
  it("rejects unsafe production config and noncanonical origins", () => {
    expect(() => parseEnvironment({ APP_ENV: "production" })).toThrow();
    expect(() =>
      parseEnvironment({ FRONTEND_ORIGIN: "https://site.example/path" }),
    ).toThrow();
    expect(() =>
      parseEnvironment({ FAKE_MODE: "true", PAID_DEMO_ENABLED: "true" }),
    ).toThrow();
  });
  it("redacts secret configuration and rejects unknown routes/origins", async () => {
    const result = await request(
      app({ OPENAI_API_KEY: "private_key_sentinel" }),
    ).get("/v1/config");
    expect(JSON.stringify(result.body)).not.toContain("private_key_sentinel");
    const denial = await request(app())
      .post("/v1/admission")
      .set("Origin", "https://foreign.example");
    expect(denial.status).toBe(403);
    expect(denial.body.error.code).toBe("FORBIDDEN");
    expect((await request(app()).get("/v1/arbitrary")).status).toBe(404);
  });
});
