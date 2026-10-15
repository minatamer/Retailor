import { z } from "zod";
import { CheckoutUrlSchema } from "@retailor/contracts/checkout";
import type { CheckoutQuote } from "@retailor/commerce/checkout";
import type { CheckoutStart } from "@retailor/contracts/checkout";
type Theme = CheckoutStart["brand"]["theme"];
import { boundedBytes } from "../security/bounded.js";
import { deny } from "../security/errors.js";

const SessionSchema = z.object({
  id: z.string().regex(/^cs_test_[A-Za-z0-9_]+$/u),
  livemode: z.literal(false),
  status: z.enum(["open", "complete", "expired"]),
  payment_status: z.enum(["paid", "unpaid", "no_payment_required"]),
  amount_total: z.number().int().nonnegative(),
  currency: z.enum(["usd", "eur"]),
  url: CheckoutUrlSchema.nullable(),
});
export type StripeSession = z.infer<typeof SessionSchema>;
export interface CheckoutPayment {
  create(
    input: {
      attemptId: string;
      quote: CheckoutQuote;
      name: string;
      theme: Theme;
      images: ReadonlyMap<string, string>;
      expiresAt: number;
    },
    signal: AbortSignal,
  ): Promise<StripeSession>;
  get(id: string, signal: AbortSignal): Promise<StripeSession>;
  expire(id: string, signal: AbortSignal): Promise<StripeSession>;
}
export function stripeSandbox(
  key: string,
  origin: string,
  fetcher: typeof fetch = fetch,
): CheckoutPayment {
  if (!/^(?:sk|rk)_test_[A-Za-z0-9]+$/u.test(key))
    throw new Error("Sandbox credentials required");
  const request = async (
    path: string,
    signal: AbortSignal,
    body?: URLSearchParams,
    idempotency?: string,
  ): Promise<unknown> => {
    const owned = AbortSignal.any([signal, AbortSignal.timeout(15_000)]);
    const response = await fetcher(`https://api.stripe.com/v1/${path}`, {
      method: body ? "POST" : "GET",
      signal: owned,
      redirect: "error",
      headers: {
        Authorization: `Bearer ${key}`,
        "Stripe-Version": "2026-09-30.endive",
        ...(body
          ? { "Content-Type": "application/x-www-form-urlencoded" }
          : {}),
        ...(idempotency ? { "Idempotency-Key": idempotency } : {}),
      },
      ...(body ? { body } : {}),
    });
    const bytes = await boundedBytes(response, 64 * 1024, owned);
    if (!response.ok)
      return deny(
        response.status === 401 || response.status === 403
          ? "OPERATOR_REQUIRED"
          : "UPSTREAM_FAILED",
        502,
      );
    try {
      return JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(bytes),
      );
    } catch {
      return deny("UPSTREAM_FAILED", 502);
    }
  };
  const session = (value: unknown) => {
    const parsed = SessionSchema.safeParse(value);
    return parsed.success ? parsed.data : deny("UPSTREAM_FAILED", 502);
  };
  const checkedId = (id: string) =>
    /^cs_test_[A-Za-z0-9_]+$/u.test(id) ? id : deny("FORBIDDEN", 403);
  return {
    async create(input, signal) {
      const { quote } = input;
      let coupon: string | undefined;
      if (quote.discountAmount) {
        const data = new URLSearchParams({
          amount_off: String(quote.discountAmount),
          currency: quote.currency.toLowerCase(),
          duration: "once",
          name: quote.discountName,
          max_redemptions: "1",
          redeem_by: String(Math.floor(input.expiresAt / 1000)),
        });
        const result = z
          .object({
            id: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/u),
            livemode: z.literal(false),
          })
          .safeParse(
            await request(
              "coupons",
              signal,
              data,
              `checkout-coupon-${input.attemptId}`,
            ),
          );
        if (!result.success) return deny("UPSTREAM_FAILED", 502);
        coupon = result.data.id;
      }
      const palette = {
        navy: "#242b60",
        ink: "#252820",
        cobalt: "#2347bd",
        oxblood: "#682f3c",
        pine: "#244a3d",
      };
      const data = new URLSearchParams({
        mode: "payment",
        "allowed_payment_method_types[0]": "card",
        "wallet_options[link][display]": "never",
        "adaptive_pricing[enabled]": "false",
        "branding_settings[display_name]": `${input.name} — Demo`,
        "branding_settings[button_color]": palette[input.theme],
        "branding_settings[background_color]": "#ffffff",
        "custom_text[submit][message]":
          "Sandbox demonstration. Use test details only. No real payment or shipment.",
        client_reference_id: input.attemptId,
        expires_at: String(Math.floor(input.expiresAt / 1000)),
        success_url: `${origin}/demo?checkout=success&attempt=${encodeURIComponent(input.attemptId)}`,
        cancel_url: `${origin}/demo?checkout=cancel&attempt=${encodeURIComponent(input.attemptId)}`,
      });
      for (const [index, line] of quote.lines.entries()) {
        const image = input.images.get(line.photoId);
        if (!image) return deny("INVALID_INPUT", 400);
        data.set(
          `line_items[${index}][price_data][currency]`,
          quote.currency.toLowerCase(),
        );
        data.set(
          `line_items[${index}][price_data][unit_amount]`,
          String(line.unitAmount),
        );
        data.set(
          `line_items[${index}][price_data][product_data][name]`,
          line.name,
        );
        data.set(
          `line_items[${index}][price_data][product_data][images][0]`,
          image,
        );
        data.set(`line_items[${index}][quantity]`, String(line.quantity));
      }
      if (quote.adjustment) {
        const index = quote.lines.length;
        data.set(
          `line_items[${index}][price_data][currency]`,
          quote.currency.toLowerCase(),
        );
        data.set(
          `line_items[${index}][price_data][unit_amount]`,
          String(quote.adjustment),
        );
        data.set(
          `line_items[${index}][price_data][product_data][name]`,
          "Currency rounding adjustment",
        );
        data.set(`line_items[${index}][quantity]`, "1");
      }
      if (quote.shipping) {
        data.set(
          "shipping_options[0][shipping_rate_data][type]",
          "fixed_amount",
        );
        data.set(
          "shipping_options[0][shipping_rate_data][fixed_amount][amount]",
          String(quote.shipping),
        );
        data.set(
          "shipping_options[0][shipping_rate_data][fixed_amount][currency]",
          quote.currency.toLowerCase(),
        );
        data.set(
          "shipping_options[0][shipping_rate_data][display_name]",
          "Sample delivery · nothing is shipped",
        );
      }
      if (coupon) data.set("discounts[0][coupon]", coupon);
      return session(
        await request(
          "checkout/sessions",
          signal,
          data,
          `checkout-session-${input.attemptId}`,
        ),
      );
    },
    async get(id, signal) {
      return session(
        await request(`checkout/sessions/${checkedId(id)}`, signal),
      );
    },
    async expire(id, signal) {
      return session(
        await request(
          `checkout/sessions/${checkedId(id)}/expire`,
          signal,
          new URLSearchParams(),
        ),
      );
    },
  };
}
