import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../http/app.js";
import { composeRuntime } from "../runtime/compose.js";
import { parseEnvironment } from "../config/environment.js";
import { PaidAdmission } from "../security/admission.js";
import { CheckoutService } from "./service.js";
import { checkoutFixture, CHECKOUT_NOW } from "../../test/checkout-fixture.js";
import type { prepareProviderImages } from "../catalogue/sanitize.js";

describe("guarded checkout HTTP operations", () => {
  it("is disabled without sandbox configuration and dispatches nothing from health/config", async () => {
    const app = createApp(
      composeRuntime(parseEnvironment({}), () => "request_test"),
    );
    expect((await request(app).get("/v1/config")).body.checkout.available).toBe(
      false,
    );
    expect((await request(app).get("/v1/health")).status).toBe(200);
    expect(
      (
        await request(app)
          .post("/v1/checkout/identity")
          .set("Origin", "http://127.0.0.1:4310")
          .send({ schemaVersion: 1 })
      ).status,
    ).toBe(503);
  });
  it("requires the signed issued cookie and exact origin; never trusts a workspace label", async () => {
    const input = checkoutFixture();
    const create = vi.fn(async () => ({
      id: "cs_test_http",
      livemode: false as const,
      status: "open" as const,
      payment_status: "unpaid" as const,
      amount_total: input.expectedTotal,
      currency: "usd" as const,
      url: "https://checkout.stripe.com/c/pay/cs_test_http",
    }));
    const service = new CheckoutService(
      { create, get: create, expire: create },
      {
        put: async () => "https://storage.googleapis.com/signed",
        remove: async () => {},
      },
      true,
      () => CHECKOUT_NOW,
      vi.fn<typeof prepareProviderImages>(
        async (_manifest, files) => new Map(files),
      ),
    );
    const admission = new PaidAdmission({
      secret: "s".repeat(32),
      clock: () => CHECKOUT_NOW,
      challenge: { verify: async () => false },
    });
    const app = createApp({
      ...composeRuntime(parseEnvironment({}), () => "request_test"),
      checkout: { admission, service },
    });
    const post = (
      operation: string,
      body: object,
      cookie?: string,
      origin = "http://127.0.0.1:4310",
    ) => {
      const req = request(app)
        .post(`/v1/checkout/${operation}`)
        .set("Origin", origin);
      if (cookie) req.set("Cookie", cookie);
      return req.send(body);
    };
    expect((await post("start", input)).status).toBe(403);
    expect(create).not.toHaveBeenCalled();
    const identity = await post("identity", { schemaVersion: 1 });
    expect(identity.status).toBe(200);
    const cookie = String(identity.headers["set-cookie"]![0]).split(";")[0]!;
    expect(identity.headers["set-cookie"]![0]).toContain("HttpOnly");
    expect(identity.headers["set-cookie"]![0]).toContain("SameSite=Strict");
    expect(
      (await post("start", input, cookie, "https://foreign.example")).status,
    ).toBe(403);
    expect(
      (await post("start", { ...input, extra: "untrusted" }, cookie)).status,
    ).toBe(400);
    expect((await post("start", input, cookie)).status).toBe(200);
    expect(
      (
        await post(
          "status",
          { schemaVersion: 1, attemptId: input.attemptId },
          "retailor_safety=forged.signature",
        )
      ).status,
    ).toBe(403);
    expect(create).toHaveBeenCalledTimes(1);
  });
});
