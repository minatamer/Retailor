import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { ShopifyShopSchema } from "@retailor/contracts/shopify";
import type { ShopifyService } from "./service.js";
import { deny } from "../security/errors.js";

export const SHOPIFY_TOPICS = [
  "app/uninstalled",
  "customers/data_request",
  "customers/redact",
  "shop/redact",
] as const;
const id = z
  .union([
    z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    z.string().regex(/^\d{1,20}$/u),
  ])
  .transform(String);
export class ShopifyWebhooks {
  constructor(
    readonly auth: ShopifyService,
    private readonly secret: string,
  ) {}
  async accept(
    body: Uint8Array,
    signature: string | undefined,
    topic: string | undefined,
    delivery: string | undefined,
  ) {
    if (body.byteLength > 65536) return deny("TOO_LARGE", 413);
    const expected = createHmac("sha256", this.secret).update(body).digest();
    if (
      !signature ||
      !/^[A-Za-z0-9+/]{43}=$/u.test(signature) ||
      !timingSafeEqual(expected, Buffer.from(signature, "base64"))
    )
      return deny("FORBIDDEN", 401);
    if (
      !SHOPIFY_TOPICS.some((value) => value === topic) ||
      !delivery ||
      !/^[A-Za-z0-9-]{1,100}$/u.test(delivery)
    )
      return deny("INVALID_INPUT", 400);
    let value: unknown;
    try {
      value = JSON.parse(new TextDecoder("utf8", { fatal: true }).decode(body));
    } catch {
      return deny("INVALID_INPUT", 400);
    }
    // HMAC authenticates body bytes, not arbitrary topic/shop headers. Bind the
    // canonical shop and ID from the verified topic-specific payload itself.
    const payload =
      topic === "app/uninstalled"
        ? z.object({ id, myshopify_domain: ShopifyShopSchema }).safeParse(value)
        : topic === "shop/redact"
          ? z
              .strictObject({ shop_id: id, shop_domain: ShopifyShopSchema })
              .safeParse(value)
          : z
              .object({
                shop_id: id,
                shop_domain: ShopifyShopSchema,
                customer: z.object({ id }),
              })
              .safeParse(value);
    if (!payload.success) return deny("INVALID_INPUT", 400);
    const parsed = payload.data;
    const shop =
      "myshopify_domain" in parsed
        ? parsed.myshopify_domain
        : parsed.shop_domain;
    const shopId = `gid://shopify/Shop/${"id" in parsed ? parsed.id : parsed.shop_id}`;
    const key = createHash("sha256")
      .update(`${topic}:${delivery}`)
      .digest("hex");
    await this.auth.ledger.transact((data) => {
      const now = this.auth.clock();
      data.deliveries = data.deliveries.filter(
        (entry) => entry.expiresAt > now,
      );
      if (data.deliveries.some((entry) => entry.key === key)) return;
      if (data.deliveries.length >= 256) return deny("BUSY", 503);
      data.deliveries.push({ key, expiresAt: now + 7 * 86400000 });
      const installation = data.installations.find(
        (item) =>
          item.shop === shop &&
          item.appId === this.auth.appId &&
          (!item.shopId || item.shopId === shopId),
      );
      if (
        !installation ||
        topic === "customers/data_request" ||
        topic === "customers/redact"
      )
        return;
      if (installation.state === "cleaned" && !installation.tokens) {
        if (topic === "shop/redact") {
          data.installations = data.installations.filter(
            (item) => item !== installation,
          );
          data.bindings = data.bindings.filter(
            (item) => item.id !== installation.bindingId,
          );
        }
        return;
      }
      installation.notice =
        topic === "shop/redact"
          ? "redact"
          : (installation.notice ?? "uninstalled");
      installation.state = "needs_attention";
      installation.noticeVersion++;
      installation.maintenanceDue = 0;
      const binding = data.bindings.find(
        (item) => item.id === installation.bindingId,
      );
      if (binding) binding.generation++;
    });
    // Customer/order records and webhook payloads are never retained. Acknowledge
    // durably without HTTP, refresh, uninstall or destructive assumptions.
    return { schemaVersion: 1 as const, accepted: true as const };
  }
}
