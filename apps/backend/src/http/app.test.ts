import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { parseEnvironment } from "../config/environment.js";
import { composeRuntime } from "../runtime/compose.js";
import { createApp } from "./app.js";
import { PaidAdmission } from "../security/admission.js";
import { action } from "../../../../test/fixtures/recognition.js";
import { fixtureAssistant } from "../assistants/fake.js";
import { fixtureLogos } from "../brand/fake.js";
import { HealthSchema } from "@retailor/contracts/api";
function app(env: Record<string, string | undefined> = {}) {
  return createApp(composeRuntime(parseEnvironment(env), () => "req_test"));
}
const liveEnvironment = {
  FAKE_MODE: "false",
  PAID_DEMO_ENABLED: "true",
  OPENAI_API_KEY: "injected-test-key",
  TURNSTILE_SECRET_KEY: "injected-test-key",
  TURNSTILE_SITE_KEY: "public-test-key",
  GRANT_SIGNING_SECRET: "s".repeat(32),
};
describe("safe runtime composition", () => {
  it("enables all live AI including logos from the master and keys, without a money gate or health dispatch", async () => {
    const verify = vi.fn(async () => true),
      interpret = vi.fn(async () => ({}));
    const gate = new PaidAdmission({
      secret: "s".repeat(32),
      challenge: { verify },
    });
    const recognition = vi.fn(() => ({
      admission: gate,
      provider: { interpret },
    }));
    const assistant = vi.fn(() => fixtureAssistant()),
      logos = vi.fn(() => fixtureLogos());
    const runtime = composeRuntime(
      parseEnvironment(liveEnvironment),
      () => "req_test",
      recognition,
      undefined,
      assistant,
      logos,
    );
    expect(recognition).toHaveBeenCalledTimes(1);
    expect(assistant).toHaveBeenCalledTimes(1);
    expect(logos).toHaveBeenCalledTimes(1);
    const application = createApp(runtime);
    const health = await request(application).get("/v1/health");
    expect(HealthSchema.parse(health.body)).toEqual({
      schemaVersion: 1,
      service: "retailor-backend",
      status: "alive",
    });
    expect((await request(application).get("/v1/ready")).status).toBe(200);
    const config = (await request(application).get("/v1/config")).body;
    expect(config).toMatchObject({
      mode: "live",
      paidEnabled: true,
      vision: { available: true },
      tailor: { available: true },
      logos: { available: true },
    });
    expect(verify).not.toHaveBeenCalled();
    expect(interpret).not.toHaveBeenCalled();
    const identity = gate.safety(undefined).identity;
    for (const workspace of ["first", "second"]) {
      const value = action(workspace),
        grant = await gate.admit(
          value,
          "proof",
          identity,
          new AbortController().signal,
        );
      const lease = gate.begin(value, grant.grant, identity);
      lease.dispatch();
      lease.finish();
    }
    expect(runtime.capabilities.vision.available).toBe(true);
    expect(gate.counters()).toEqual({ active: 0 });
    expect(gate.usageCounters().unknownDispatches).toBe(2);
  });
  it.each([
    "PAID_DEMO_ENABLED",
    "OPENAI_API_KEY",
    "TURNSTILE_SECRET_KEY",
    "TURNSTILE_SITE_KEY",
    "GRANT_SIGNING_SECRET",
  ])(
    "keeps every live port inert when %s is off/missing, even with all other credentials",
    (key) => {
      const recognition = vi.fn(() => {
        throw new Error("Unexpected live factory");
      });
      const assistant = vi.fn(() => {
        throw new Error("Unexpected live factory");
      });
      const logos = vi.fn(() => {
        throw new Error("Unexpected live factory");
      });
      const runtime = composeRuntime(
        parseEnvironment({
          ...liveEnvironment,
          [key]: key === "PAID_DEMO_ENABLED" ? "false" : "",
        }),
        () => "req_test",
        recognition,
        undefined,
        assistant,
        logos,
      );
      expect(runtime.ready).toBe(false);
      expect(runtime.recognition).toBeUndefined();
      expect(runtime.assistant).toBeUndefined();
      expect(runtime.logos).toBeUndefined();
      expect(runtime.capabilities).toMatchObject({
        mode: "live",
        paidEnabled: false,
        vision: { available: false },
        tailor: { available: false },
        logos: { available: false },
      });
      expect(recognition).not.toHaveBeenCalled();
      expect(assistant).not.toHaveBeenCalled();
      expect(logos).not.toHaveBeenCalled();
    },
  );
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
