import { describe, it, expect } from "vitest";
import request from "supertest";
import { parseEnvironment } from "../config/environment.js";
import { composeRuntime } from "../runtime/compose.js";
import { createApp } from "./app.js";
function app(env: Record<string, string | undefined> = {}) {
  return createApp(composeRuntime(parseEnvironment(env), () => "req_test"));
}
describe("safe runtime composition", () => {
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
