import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { SHOPIFY_LIMITS, ShopifyShopSchema } from "@retailor/contracts/shopify";
import { boundedBytes } from "../security/bounded.js";
import { deny, OperationFailure } from "../security/errors.js";
import type { Tokens } from "./model.js";
import { ShopifyRateLimit, shopifyRetryAfter } from "./rate-limit.js";

export interface ShopifyIdentity {
  id: string;
  shop: string;
  name: string;
  currency: string;
  development: boolean;
}
export class ShopifyAccessRejected extends OperationFailure {
  constructor() {
    super("FORBIDDEN", 403);
  }
}
export interface ShopifyProvider {
  readonly simulated: boolean;
  installationUrl(): string;
  consent?(shop: string, state: string, approved: boolean, now: number): string;
  installQuery?(shop: string, now: number): string;
  authorizationUrl(shop: string, state: string): string;
  verifyQuery(query: string, now: number): URLSearchParams;
  exchange(shop: string, code: string, signal: AbortSignal): Promise<Tokens>;
  refresh(shop: string, tokens: Tokens, signal: AbortSignal): Promise<Tokens>;
  identity(
    shop: string,
    access: string,
    signal: AbortSignal,
  ): Promise<ShopifyIdentity>;
}
export function equalHex(left: string, right: string) {
  return (
    /^[a-f0-9]{64}$/u.test(left) &&
    /^[a-f0-9]{64}$/u.test(right) &&
    timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"))
  );
}
export function verifyShopifyQuery(query: string, secret: string, now: number) {
  if (Buffer.byteLength(query) > 8192) return deny("TOO_LARGE", 413);
  const params = new URLSearchParams(query);
  const allowed = new Set([
    "hmac",
    "shop",
    "state",
    "code",
    "timestamp",
    "host",
    "error",
    "error_description",
  ]);
  for (const key of params.keys()) {
    if (!allowed.has(key) || params.getAll(key).length !== 1)
      return deny("FORBIDDEN", 403);
  }
  const supplied = params.get("hmac") ?? "",
    timestamp = params.get("timestamp") ?? "";
  if (
    !/^\d{10}$/u.test(timestamp) ||
    Math.abs(now - Number(timestamp) * 1000) > 300_000 ||
    !ShopifyShopSchema.safeParse(params.get("shop")).success
  )
    return deny("FORBIDDEN", 403);
  const message = [...params.entries()]
    .filter(([key]) => key !== "hmac")
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  if (
    !equalHex(
      createHmac("sha256", secret).update(message).digest("hex"),
      supplied,
    )
  )
    return deny("FORBIDDEN", 403);
  return params;
}
function parseProviderJson(bytes: Uint8Array): unknown {
  const text = new TextDecoder("utf8", { fatal: true }).decode(bytes);
  let depth = 0,
    quoted = false,
    escaped = false,
    nodes = 0;
  for (const character of text) {
    if (quoted) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') quoted = false;
    } else if (character === '"') quoted = true;
    else if (character === "{" || character === "[") {
      if (++depth > 16) return deny("UPSTREAM_FAILED", 502);
    } else if (character === "}" || character === "]") depth--;
    else if (character === "," || character === ":") {
      if (++nodes > 16384) return deny("UPSTREAM_FAILED", 502);
    }
  }
  return JSON.parse(text);
}
const TokenResponseSchema = z.object({
  access_token: z
    .string()
    .min(1)
    .max(4096)
    .regex(/^[A-Za-z0-9_-]+$/u),
  refresh_token: z
    .string()
    .min(1)
    .max(4096)
    .regex(/^[A-Za-z0-9_-]+$/u),
  expires_in: z.number().int().min(1).max(86400),
  refresh_token_expires_in: z.number().int().min(1).max(31_536_000),
  scope: z.string().max(4096),
});
const IdentityResponseSchema = z.object({
  data: z.object({
    shop: z.object({
      id: z
        .string()
        .max(100)
        .regex(/^gid:\/\/shopify\/Shop\/\d+$/u),
      myshopifyDomain: ShopifyShopSchema,
      name: z.string().min(1).max(200),
      currencyCode: z.string().regex(/^[A-Z]{3}$/u),
      plan: z.object({ partnerDevelopment: z.boolean() }),
    }),
  }),
});

export class LiveShopifyProvider implements ShopifyProvider {
  readonly simulated = false;
  constructor(
    private readonly config: {
      clientId: string;
      secret: string;
      redirectUri: string;
      developmentInstallUrl: string;
    },
    private readonly http: typeof fetch = fetch,
    private readonly clock: () => number = Date.now,
  ) {}
  installationUrl() {
    return this.config.developmentInstallUrl;
  }
  authorizationUrl(shop: string, state: string) {
    ShopifyShopSchema.parse(shop);
    const url = new URL(`https://${shop}/admin/oauth/authorize`);
    url.search = new URLSearchParams({
      client_id: this.config.clientId,
      scope: "write_products",
      redirect_uri: this.config.redirectUri,
      state,
    }).toString();
    return url.href;
  }
  verifyQuery(query: string, now: number) {
    return verifyShopifyQuery(query, this.config.secret, now);
  }
  private async request(
    shop: string,
    path:
      | "oauth/access_token"
      | `api/${typeof SHOPIFY_LIMITS.apiVersion}/graphql.json`,
    body: object,
    access: string | null,
    signal: AbortSignal,
  ) {
    ShopifyShopSchema.parse(shop);
    const encoded = JSON.stringify(body);
    if (Buffer.byteLength(encoded) > SHOPIFY_LIMITS.providerRequestBytes)
      return deny("TOO_LARGE", 413);
    const controller = new AbortController(),
      timer = setTimeout(() => controller.abort(), SHOPIFY_LIMITS.providerMs);
    const deadline = AbortSignal.any([signal, controller.signal]);
    try {
      deadline.throwIfAborted();
      const response = await this.http(`https://${shop}/admin/${path}`, {
        method: "POST",
        redirect: "error",
        signal: deadline,
        body: encoded,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Accept-Encoding": "identity",
          ...(access ? { "X-Shopify-Access-Token": access } : {}),
        },
      });
      if (
        response.headers.get("content-encoding") &&
        response.headers.get("content-encoding") !== "identity"
      ) {
        await response.body?.cancel();
        return deny("UPSTREAM_FAILED", 502);
      }
      if (!response.ok) {
        await response.body?.cancel();
        if (response.status === 401 || response.status === 403)
          throw new ShopifyAccessRejected();
        if (response.status === 429)
          throw new ShopifyRateLimit(
            shopifyRetryAfter(
              response.headers.get("retry-after"),
              this.clock(),
            ),
          );
        return deny(
          response.status === 429
            ? "BUSY"
            : response.status === 401 || response.status === 403
              ? "FORBIDDEN"
              : "UPSTREAM_FAILED",
          response.status === 429
            ? 429
            : response.status === 401 || response.status === 403
              ? 403
              : 502,
        );
      }
      if (
        path.endsWith("graphql.json") &&
        response.headers.get("x-shopify-api-version") !==
          SHOPIFY_LIMITS.apiVersion
      ) {
        await response.body?.cancel();
        return deny("UPSTREAM_FAILED", 502);
      }
      if (
        !/^application\/json(?:;|$)/iu.test(
          response.headers.get("content-type") ?? "",
        )
      ) {
        await response.body?.cancel();
        return deny("UPSTREAM_FAILED", 502);
      }
      return parseProviderJson(
        await boundedBytes(
          response,
          SHOPIFY_LIMITS.providerResponseBytes,
          deadline,
        ),
      );
    } finally {
      clearTimeout(timer);
      controller.abort();
    }
  }
  /** Server-owned product use cases supply fixed query templates; never an API proxy. */
  graphql(
    shop: string,
    access: string,
    query: string,
    variables: Record<string, unknown>,
    signal: AbortSignal,
  ) {
    return this.request(
      shop,
      `api/${SHOPIFY_LIMITS.apiVersion}/graphql.json`,
      { query, variables },
      access,
      signal,
    );
  }
  private tokens(result: unknown): Tokens {
    const parsed = TokenResponseSchema.safeParse(result);
    if (
      !parsed.success ||
      !parsed.data.scope.split(",").includes("write_products")
    )
      return deny("FORBIDDEN", 403);
    const data = parsed.data,
      now = this.clock();
    return {
      access: data.access_token,
      refresh: data.refresh_token,
      expiresAt: now + data.expires_in * 1000,
      refreshExpiresAt: now + data.refresh_token_expires_in * 1000,
      scope: data.scope,
    };
  }
  async exchange(shop: string, code: string, signal: AbortSignal) {
    if (!/^[A-Za-z0-9_-]{1,1000}$/u.test(code)) return deny("FORBIDDEN", 403);
    return this.tokens(
      await this.request(
        shop,
        "oauth/access_token",
        {
          client_id: this.config.clientId,
          client_secret: this.config.secret,
          code,
          expiring: 1,
        },
        null,
        signal,
      ),
    );
  }
  async refresh(shop: string, tokens: Tokens, signal: AbortSignal) {
    if (tokens.refreshExpiresAt <= this.clock()) return deny("FORBIDDEN", 403);
    return this.tokens(
      await this.request(
        shop,
        "oauth/access_token",
        {
          client_id: this.config.clientId,
          client_secret: this.config.secret,
          grant_type: "refresh_token",
          refresh_token: tokens.refresh,
        },
        null,
        signal,
      ),
    );
  }
  async identity(shop: string, access: string, signal: AbortSignal) {
    const result = await this.request(
      shop,
      `api/${SHOPIFY_LIMITS.apiVersion}/graphql.json`,
      {
        query:
          "query RetailorShopIdentity { shop { id name myshopifyDomain currencyCode plan { partnerDevelopment } } }",
      },
      access,
      signal,
    );
    if (result && typeof result === "object" && "errors" in result)
      return deny("UPSTREAM_FAILED", 502);
    const parsed = IdentityResponseSchema.safeParse(result);
    if (!parsed.success || parsed.data.data.shop.myshopifyDomain !== shop)
      return deny("FORBIDDEN", 403);
    const data = parsed.data.data.shop;
    return {
      id: data.id,
      shop: data.myshopifyDomain,
      name: data.name,
      currency: data.currencyCode,
      development: data.plan.partnerDevelopment,
    };
  }
}
