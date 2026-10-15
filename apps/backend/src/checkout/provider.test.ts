import { describe, expect, it, vi } from "vitest";
import { stripeSandbox } from "./provider.js";
import { checkoutFixture } from "../../test/checkout-fixture.js";
import { checkoutQuote } from "@retailor/commerce/checkout";

describe("fixed sandbox Stripe transport", () => {
  it("sends visible variants, real selected image URLs, exact discount and per-session name without collecting app payment fields", async () => {
    const input = checkoutFixture();
    const fetcher = vi.fn<typeof fetch>(async (url, init) => {
      const path = String(url);
      expect(init?.redirect).toBe("error");
      if (path.endsWith("/coupons"))
        return Response.json({ id: "coupon_test", livemode: false });
      return Response.json({
        id: "cs_test_result",
        livemode: false,
        status: "open",
        payment_status: "unpaid",
        amount_total: input.expectedTotal,
        currency: "usd",
        url: "https://checkout.stripe.com/c/pay/cs_test_result",
      });
    });
    const provider = stripeSandbox(
      "rk_test_fixture",
      "http://127.0.0.1:4310",
      fetcher,
    );
    await provider.create(
      {
        attemptId: input.attemptId,
        quote: checkoutQuote(
          input.graph,
          new Set(input.availablePhotoIds),
          input.scope,
          true,
        ),
        name: input.brand.name,
        theme: input.brand.theme,
        images: new Map([
          ["photo", "https://storage.googleapis.com/private/selected"],
        ]),
        expiresAt: Date.now() + 1_801_000,
      },
      new AbortController().signal,
    );
    expect(fetcher).toHaveBeenCalledTimes(2);
    const body = fetcher.mock.calls[1]![1]!.body as URLSearchParams;
    expect(body.get("branding_settings[display_name]")).toBe(
      "Moonthread — Demo",
    );
    expect(body.get("line_items[0][price_data][product_data][name]")).toContain(
      "Blue · 30/30",
    );
    expect(body.get("line_items[0][price_data][product_data][images][0]")).toBe(
      "https://storage.googleapis.com/private/selected",
    );
    expect(body.get("line_items[0][quantity]")).toBe("2");
    expect(body.get("discounts[0][coupon]")).toBe("coupon_test");
    expect(body.get("success_url")).toBe(
      "http://127.0.0.1:4310/demo?checkout=success&attempt=checkout_test",
    );
    expect(body.has("customer_email")).toBe(false);
    expect(body.get("adaptive_pricing[enabled]")).toBe("false");
    expect(body.get("allowed_payment_method_types[0]")).toBe("card");
    expect(body.get("wallet_options[link][display]")).toBe("never");
    expect(body.has("saved_payment_method_options[payment_method_save]")).toBe(
      false,
    );
    expect(body.has("payment_intent_data[setup_future_usage]")).toBe(false);
    expect(body.has("customer_creation")).toBe(false);
  });
  it("rejects live keys/results, foreign redirect URLs and raw upstream errors", async () => {
    const fetcher = vi.fn<typeof fetch>();
    expect(() =>
      stripeSandbox("sk_live_forbidden", "http://127.0.0.1:4310", fetcher),
    ).toThrow();
    expect(fetcher).not.toHaveBeenCalled();
    const provider = stripeSandbox(
      "sk_test_fixture",
      "http://127.0.0.1:4310",
      fetcher,
    );
    fetcher.mockResolvedValueOnce(
      Response.json(
        { error: { message: "private exception text" } },
        { status: 403 },
      ),
    );
    await expect(
      provider.get("cs_test_result", new AbortController().signal),
    ).rejects.toMatchObject({
      code: "OPERATOR_REQUIRED",
      message: "OPERATOR_REQUIRED",
    });
    fetcher.mockResolvedValueOnce(
      Response.json({
        id: "cs_test_result",
        livemode: true,
        status: "complete",
        payment_status: "paid",
        amount_total: 6000,
        currency: "usd",
        url: "https://evil.example/payment",
      }),
    );
    await expect(
      provider.get("cs_test_result", new AbortController().signal),
    ).rejects.toMatchObject({ code: "UPSTREAM_FAILED" });
  });
});
