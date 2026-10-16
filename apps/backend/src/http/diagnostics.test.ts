import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "./app.js";
import { parseEnvironment } from "../config/environment.js";
import { composeRuntime } from "../runtime/compose.js";
import { CurrencyService } from "../currency/service.js";
import { fixtureCurrency } from "../currency/provider.js";
import type { FxSnapshot } from "@retailor/contracts/currency";
import { failureDiagnostic, reportFailure } from "./diagnostics.js";
class BrokenCurrency extends CurrencyService {
  override async quote(): Promise<FxSnapshot> {
    throw new TypeError("PRIVATE_MARKER cookie/key/prompt detail");
  }
}
describe("private failure correlation", () => {
  it("returns the same generic public envelope and records only fixed private metadata", async () => {
    const runtime = composeRuntime(
      parseEnvironment({}),
      () => "req_private_test",
      undefined,
      () => new BrokenCurrency(fixtureCurrency(), true),
    );
    const sink = vi.fn();
    const app = createApp(runtime, sink);
    await request(app).get("/v1/health").expect(200);
    await request(app).get("/v1/config").expect(200);
    expect(sink).not.toHaveBeenCalled();
    const response = await request(app).get("/v1/currency/usd-eur").expect(500);
    expect(response.body.error.code).toBe("UPSTREAM_FAILED");
    expect(JSON.stringify(response.body)).not.toContain("PRIVATE_MARKER");
    expect(sink).toHaveBeenCalledTimes(1);
    const event = sink.mock.calls[0]![0];
    expect(event).toMatchObject({
      requestId: "req_private_test",
      operation: "currency/usd-eur",
      code: "UPSTREAM_FAILED",
      status: 500,
      exception: "TypeError",
    });
    expect(event.locations.length).toBeGreaterThan(0);
    expect(JSON.stringify(event)).not.toContain("PRIVATE_MARKER");
    expect(JSON.stringify(event)).not.toContain("cookie/key/prompt");
  });
  it("bounds untrusted diagnostic attributes and does not break HTTP when the private sink fails", async () => {
    const error = new Error("PRIVATE_MARKER");
    error.name = "PRIVATE_NAME";
    error.stack = "Error: PRIVATE_MARKER\n at work (/app/dist/routes.js:42:3)";
    const event = failureDiagnostic(
      error,
      "invalid ref\nPRIVATE_MARKER",
      "/v1/unknown?PRIVATE_MARKER",
      "UPSTREAM_FAILED",
      500,
    );
    expect(event).toMatchObject({
      requestId: "request_unavailable",
      operation: "unknown",
      exception: "unknown",
      locations: ["routes.js:42:3"],
    });
    expect(JSON.stringify(event)).not.toContain("PRIVATE");
    error.name = "ProviderBadRequest PRIVATE";
    expect(
      failureDiagnostic(
        error,
        "req_test",
        "/v1/assistant/owner",
        "UPSTREAM_FAILED",
        502,
      ).exception,
    ).toBe("unknown");
    const stderr = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    reportFailure(() => {
      throw new Error("PRIVATE_SINK");
    }, event);
    expect(stderr).toHaveBeenCalledTimes(1);
    expect(stderr.mock.calls[0]![0]).not.toContain("PRIVATE_SINK");
    const runtime = composeRuntime(
      parseEnvironment({ FAKE_MODE: "false" }),
      () => "req_missing",
    );
    const response = await request(
      createApp(runtime, () => {
        throw new Error("PRIVATE_SINK");
      }),
    )
      .post("/v1/admission")
      .set("origin", runtime.frontendOrigin)
      .send({})
      .expect(503);
    expect(response.body.error.code).toBe("UNAVAILABLE");
    expect(JSON.stringify(response.body)).not.toContain("PRIVATE");
  });
});
