import { expect, it, vi } from "vitest";
import request from "supertest";
import { parseEnvironment } from "./environment.js";
import { composeRuntime } from "../runtime/compose.js";
import { createApp } from "../http/app.js";
import * as storage from "../checkout/storage.js";

it("keeps checkout unavailable without a key even with obsolete enablement overrides", () => {
  const factory = vi.fn(() => {
    throw new Error("Checkout factory must stay inert without a key");
  });
  const runtime = composeRuntime(
    parseEnvironment({ STRIPE_SANDBOX_ENABLED: "true" }),
    () => "req_config",
    undefined,
    undefined,
    undefined,
    undefined,
    factory,
  );
  expect(runtime.checkout).toBeUndefined();
  expect(runtime.capabilities.checkout.available).toBe(false);
  expect(factory).not.toHaveBeenCalled();
});

it.each(["sk_test_config", "rk_test_config"])(
  "uses fixed storage with %s and ignores obsolete destination/enablement overrides without dispatching",
  async (key) => {
    const images = vi.spyOn(storage, "checkoutImages");
    const runtime = composeRuntime(
      parseEnvironment({
        STRIPE_API_KEY: key,
        STRIPE_SANDBOX_ENABLED: "false",
        CHECKOUT_STORAGE_PROJECT: "foreign-project",
        CHECKOUT_STORAGE_BUCKET: "foreign-bucket",
      }),
      () => "req_config",
    );
    expect(images).toHaveBeenCalledExactlyOnceWith(
      "retailor-511714",
      "retailor-511714-checkout-photos",
    );
    expect(runtime.checkout).toBeDefined();
    expect(runtime.checkout!.admission).toBe(runtime.logos!.admission);
    const app = createApp(runtime);
    expect((await request(app).get("/v1/health")).status).toBe(200);
    const config = await request(app).get("/v1/config");
    expect(config.body.checkout).toEqual({ available: true, reason: "ready" });
    expect(config.body.paidEnabled).toBe(false);
    const publicJson = JSON.stringify(config.body);
    for (const hidden of [
      key,
      "retailor-511714",
      "foreign-project",
      "foreign-bucket",
    ])
      expect(publicJson).not.toContain(hidden);
    expect(fetch).not.toHaveBeenCalled();
  },
);

it.each(["sk_live_config", "rk_live_config", "sk_test_", "not-a-stripe-key"])(
  "rejects non-test or malformed credentials %s even when the obsolete flag says disabled",
  (key) => {
    const parsed = () =>
      parseEnvironment({
        STRIPE_API_KEY: key,
        STRIPE_SANDBOX_ENABLED: "false",
      });
    expect(parsed).toThrow();
    try {
      parsed();
    } catch (error) {
      expect(error).toMatchObject({
        issues: [{ path: ["STRIPE_API_KEY"] }],
      });
    }
  },
);
