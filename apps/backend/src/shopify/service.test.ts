import { afterEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import request from "supertest";
import { ShopifyService, shopifyCookie } from "./service.js";
import { ShopifyLedger } from "./ledger.js";
import { LocalShopifyStore } from "./storage.js";
import { verifyShopifyQuery } from "./provider.js";
import type { ShopifyProvider } from "./provider.js";
import type { Tokens } from "./model.js";
import { createApp } from "../http/app.js";
import { composeRuntime } from "../runtime/compose.js";
import { parseEnvironment } from "../config/environment.js";
import { OperationFailure } from "../security/errors.js";

const roots: string[] = [],
  services: ShopifyService[] = [];
const shop = "retailor-test.myshopify.com",
  secret = "test-only-secret";
async function setup() {
  let now = 1_794_305_000_000;
  const directory = await mkdtemp(join(tmpdir(), "retailor-shopify-"));
  roots.push(directory);
  const exchange = vi.fn(async (): Promise<Tokens> => ({
    access: "test_access",
    refresh: "test_refresh",
    expiresAt: now + 3600000,
    refreshExpiresAt: now + 7776000000,
    scope: "write_products",
  }));
  const refresh = vi.fn(async (): Promise<Tokens> => ({
    access: "rotated_access",
    refresh: "rotated_refresh",
    expiresAt: now + 3600000,
    refreshExpiresAt: now + 7776000000,
    scope: "write_products",
  }));
  const identity = vi.fn(async () => ({
    id: "gid://shopify/Shop/1",
    shop,
    name: "Test store",
    currency: "USD",
    development: true,
  }));
  const provider: ShopifyProvider = {
    simulated: true,
    installationUrl: () =>
      "https://admin.shopify.com/?organization_id=1&no_redirect=true&redirect=/oauth/redirect_from_developer_dashboard?client_id%3Dtest-app",
    authorizationUrl: (domain, state) =>
      `https://${domain}/admin/oauth/authorize?state=${state}`,
    verifyQuery: (query, time) => verifyShopifyQuery(query, secret, time),
    exchange,
    refresh,
    identity,
  };
  const service = new ShopifyService(
    new ShopifyLedger(
      new LocalShopifyStore(directory),
      "a".repeat(64),
      "test-app",
    ),
    provider,
    "test-app",
    () => now,
  );
  services.push(service);
  const issued = await service.session(undefined, {
    schemaVersion: 1,
    workspaceId: "workspace",
    createdAt: now,
  });
  function signed(state: string, overrides: Record<string, string> = {}) {
    const entries = {
      code: "code",
      shop,
      state,
      timestamp: String(Math.floor(now / 1000)),
      ...overrides,
    };
    const message = Object.entries(entries)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, value]) => `${key}=${value}`)
      .join("&");
    return new URLSearchParams({
      ...entries,
      hmac: createHmac("sha256", secret).update(message).digest("hex"),
    }).toString();
  }
  function installQuery(selectedShop = shop) {
    const params = {
      shop: selectedShop,
      timestamp: String(Math.floor(now / 1000)),
    };
    const message = Object.entries(params)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, value]) => `${key}=${value}`)
      .join("&");
    return new URLSearchParams({
      ...params,
      hmac: createHmac("sha256", secret).update(message).digest("hex"),
    }).toString();
  }
  async function begin() {
    await service.connect(issued.cookie, issued.result.tabProof, {
      schemaVersion: 1,
      workspaceId: "workspace",
      returnTo: "onboarding",
    });
    const result = await service.install(issued.cookie, installQuery());
    return new URL(result.authorizationUrl).searchParams.get("state")!;
  }
  async function connect() {
    const state = await begin();
    expect(
      (
        await service.callback(
          issued.cookie,
          signed(state),
          new AbortController().signal,
        )
      ).outcome,
    ).toBe("connected");
    return state;
  }
  return {
    directory,
    service,
    provider,
    exchange,
    refresh,
    identity,
    issued,
    signed,
    installQuery,
    begin,
    connect,
    clock: () => now,
    advance: (ms: number) => {
      now += ms;
    },
  };
}
afterEach(async () => {
  for (const service of services.splice(0)) await service.close();
  for (const directory of roots.splice(0)) {
    expect(
      resolve(directory).startsWith(resolve(tmpdir(), "retailor-shopify-")),
    ).toBe(true);
    await rm(directory, { recursive: true, force: true });
  }
});
describe("session-bound standalone Shopify authorization", () => {
  it("starts without reserving a shop and binds only the signed Shopify selection", async () => {
    const h = await setup();
    const result = await h.service.connect(
      h.issued.cookie,
      h.issued.result.tabProof,
      {
        schemaVersion: 1,
        workspaceId: "workspace",
        returnTo: "connections",
      },
    );
    expect(result.authorizationUrl).toBe(h.provider.installationUrl());
    expect(
      await h.service.ledger.inspect((data) => ({
        count: data.installations.length,
        shop: data.bindings[0]!.pending!.shop,
      })),
    ).toEqual({ count: 0, shop: null });
    expect(
      (
        await h.service.status(
          h.issued.cookie,
          h.issued.result.tabProof,
          "workspace",
        )
      ).state,
    ).toBe("authorizing");
    expect(h.exchange).not.toHaveBeenCalled();
    const selected = "chosen-on-shopify.myshopify.com";
    const response = await h.service.install(
      h.issued.cookie,
      h.installQuery(selected),
    );
    expect(new URL(response.authorizationUrl).hostname).toBe(selected);
    expect(
      await h.service.install(h.issued.cookie, h.installQuery(selected)),
    ).toEqual(response);
    await expect(
      h.service.install(h.issued.cookie, h.installQuery()),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    const state = new URL(response.authorizationUrl).searchParams.get("state")!;
    await expect(
      h.service.callback(
        h.issued.cookie,
        h.signed(state),
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(h.exchange).not.toHaveBeenCalled();
  });
  it("rejects unsolicited, forged, cross-browser and expired store selections", async () => {
    const h = await setup();
    await expect(
      h.service.install(h.issued.cookie, h.installQuery()),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await h.service.connect(h.issued.cookie, h.issued.result.tabProof, {
      schemaVersion: 1,
      workspaceId: "workspace",
      returnTo: "onboarding",
    });
    for (const [cookie, query] of [
      [undefined, h.installQuery()],
      ["b".repeat(64), h.installQuery()],
      [h.issued.cookie, h.installQuery() + "&shop=other.myshopify.com"],
      [h.issued.cookie, h.installQuery().replace("retailor-test", "tampered")],
      [h.issued.cookie, h.signed("a".repeat(64))],
    ] as const)
      await expect(h.service.install(cookie, query)).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    h.advance(600001);
    await expect(
      h.service.install(h.issued.cookie, h.installQuery()),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(
      await h.service.ledger.inspect((data) => data.installations.length),
    ).toBe(0);
    expect(h.exchange).not.toHaveBeenCalled();
  });
  it("prevents ambiguous concurrent browser attempts and rejects legacy ambiguity", async () => {
    const h = await setup();
    await h.service.connect(h.issued.cookie, h.issued.result.tabProof, {
      schemaVersion: 1,
      workspaceId: "workspace",
      returnTo: "onboarding",
    });
    const second = await h.service.session(h.issued.cookie, {
      schemaVersion: 1,
      workspaceId: "second",
      createdAt: h.clock(),
    });
    await expect(
      h.service.connect(second.cookie, second.result.tabProof, {
        schemaVersion: 1,
        workspaceId: "second",
        returnTo: "connections",
      }),
    ).rejects.toMatchObject({ code: "BUSY" });
    await h.service.ledger.transact((data) => {
      data.bindings[1]!.pending = structuredClone(data.bindings[0]!.pending);
    });
    await expect(
      h.service.install(h.issued.cookie, h.installQuery()),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(h.exchange).not.toHaveBeenCalled();
  });
  it("commits a rotated token across a known conditional-write conflict without replaying refresh", async () => {
    const h = await setup();
    await h.connect();
    h.advance(3_550_000);
    const store = h.service.ledger.store,
      original = store.replace.bind(store);
    h.refresh.mockImplementation(async () => {
      let conflict = true;
      vi.spyOn(store, "replace").mockImplementation(async (version, bytes) => {
        if (conflict) {
          conflict = false;
          throw new OperationFailure("STALE", 409);
        }
        await original(version, bytes);
      });
      return {
        access: "rotated_access",
        refresh: "rotated_refresh",
        expiresAt: h.clock() + 3600000,
        refreshExpiresAt: h.clock() + 7776000000,
        scope: "write_products",
      };
    });
    expect(
      await h.service.withConnection(
        h.issued.cookie,
        h.issued.result.tabProof,
        "workspace",
        new AbortController().signal,
        async (_shop, tokens) => tokens.access,
      ),
    ).toBe("rotated_access");
    expect(h.refresh).toHaveBeenCalledTimes(1);
    expect(
      await h.service.ledger.inspect(
        (data) => data.installations[0]?.tokens?.refresh,
      ),
    ).toBe("rotated_refresh");
  });
  it("retains refreshed credentials for cleanup but never dispatches after expiry during refresh", async () => {
    const h = await setup();
    await h.connect();
    h.advance(7_199_500);
    h.refresh.mockImplementation(async () => {
      h.advance(1000);
      return {
        access: "rotated_access",
        refresh: "rotated_refresh",
        expiresAt: h.clock() + 3600000,
        refreshExpiresAt: h.clock() + 7776000000,
        scope: "write_products",
      };
    });
    const operation = vi.fn(async () => "too late");
    await expect(
      h.service.withConnection(
        h.issued.cookie,
        h.issued.result.tabProof,
        "workspace",
        new AbortController().signal,
        operation,
      ),
    ).rejects.toMatchObject({ code: "STALE" });
    expect(operation).not.toHaveBeenCalled();
    expect(
      await h.service.ledger.inspect((data) => ({
        state: data.installations[0]?.state,
        refresh: data.installations[0]?.tokens?.refresh,
      })),
    ).toEqual({ state: "cleanup_pending", refresh: "rotated_refresh" });
  });
  it("resumes a pending signed consent after a real local adapter restart", async () => {
    const h = await setup(),
      state = await h.begin();
    await h.service.close();
    const resumed = new ShopifyService(
      new ShopifyLedger(
        new LocalShopifyStore(h.directory),
        "a".repeat(64),
        "test-app",
      ),
      h.provider,
      "test-app",
      h.clock,
    );
    services.push(resumed);
    const install = await resumed.install(h.issued.cookie, h.installQuery());
    expect(new URL(install.authorizationUrl).searchParams.get("state")).toBe(
      state,
    );
    expect(
      (
        await resumed.callback(
          h.issued.cookie,
          h.signed(state),
          new AbortController().signal,
        )
      ).outcome,
    ).toBe("connected");
    expect(
      (
        await resumed.status(
          h.issued.cookie,
          h.issued.result.tabProof,
          "workspace",
        )
      ).state,
    ).toBe("connected");
  });
  it("holds the shop lease through refresh and operation settlement", async () => {
    const h = await setup();
    await h.connect();
    h.advance(3_550_000);
    let finish: () => void = () => {},
      entered: () => void = () => {};
    const waiting = new Promise<void>((resolve) => {
        finish = resolve;
      }),
      started = new Promise<void>((resolve) => {
        entered = resolve;
      });
    const first = h.service.withConnection(
      h.issued.cookie,
      h.issued.result.tabProof,
      "workspace",
      new AbortController().signal,
      async () => {
        entered();
        await waiting;
        return "done";
      },
    );
    await started;
    const other = vi.fn(async () => "duplicate");
    await expect(
      h.service.withConnection(
        h.issued.cookie,
        h.issued.result.tabProof,
        "workspace",
        new AbortController().signal,
        other,
      ),
    ).rejects.toMatchObject({ code: "BUSY" });
    expect(other).not.toHaveBeenCalled();
    expect(h.refresh).toHaveBeenCalledTimes(1);
    finish();
    expect(await first).toBe("done");
  });
  it("binds consent to the original session and consumes callback once without product writes", async () => {
    const h = await setup(),
      state = await h.connect();
    expect(
      await h.service.status(
        h.issued.cookie,
        h.issued.result.tabProof,
        "workspace",
      ),
    ).toMatchObject({
      state: "connected",
      name: "Test store",
      currency: "USD",
      productCount: 0,
    });
    await expect(
      h.service.callback(
        h.issued.cookie,
        h.signed(state),
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(h.exchange).toHaveBeenCalledTimes(1);
    expect(h.identity).toHaveBeenCalledTimes(1);
  });
  it("rejects wrong cookie/proof/workspace/shop and stale/duplicate callbacks before token dispatch", async () => {
    const h = await setup(),
      state = await h.begin();
    const invalid: [string, string, string][] = [
      ["b".repeat(64), h.issued.result.tabProof, "workspace"],
      [h.issued.cookie, "b".repeat(64), "workspace"],
      [h.issued.cookie, h.issued.result.tabProof, "other"],
    ];
    for (const [cookie, proof, id] of invalid)
      await expect(h.service.status(cookie, proof, id)).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    for (const query of [
      h.signed(state, { shop: "other.myshopify.com" }),
      h.signed(state) + "&code=code",
    ])
      await expect(
        h.service.callback(
          h.issued.cookie,
          query,
          new AbortController().signal,
        ),
      ).rejects.toThrow();
    h.advance(600001);
    await expect(
      h.service.callback(
        h.issued.cookie,
        h.signed(state),
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(h.exchange).not.toHaveBeenCalled();
  });
  it("keeps the original lifetime for late connection and rejects fresh seals for old or copied workspaces", async () => {
    const h = await setup();
    h.advance(3_600_000);
    await h.connect();
    expect(
      (
        await h.service.status(
          h.issued.cookie,
          h.issued.result.tabProof,
          "workspace",
        )
      ).expiresAt,
    ).toBe(h.issued.result.expiresAt);
    await expect(
      h.service.session(h.issued.cookie, {
        schemaVersion: 1,
        workspaceId: "workspace",
        createdAt: h.clock(),
      }),
    ).rejects.toMatchObject({ code: "STALE" });
    await expect(
      h.service.session(undefined, {
        schemaVersion: 1,
        workspaceId: "old",
        createdAt: h.clock() - 30001,
      }),
    ).rejects.toMatchObject({ code: "STALE" });
    h.advance(3_600_001);
    await expect(
      h.service.status(h.issued.cookie, h.issued.result.tabProof, "workspace"),
    ).rejects.toMatchObject({ code: "STALE" });
  });
  it("prevents another tab from replacing the same shop's credentials", async () => {
    const h = await setup();
    await h.connect();
    const second = await h.service.session(h.issued.cookie, {
      schemaVersion: 1,
      workspaceId: "second",
      createdAt: h.clock(),
    });
    expect(second.cookie).toBe(h.issued.cookie);
    await h.service.connect(second.cookie, second.result.tabProof, {
      schemaVersion: 1,
      workspaceId: "second",
      returnTo: "connections",
    });
    await expect(
      h.service.install(second.cookie, h.installQuery()),
    ).rejects.toMatchObject({ code: "BUSY" });
    expect(h.exchange).toHaveBeenCalledTimes(1);
    await expect(
      h.service.status(second.cookie, h.issued.result.tabProof, "second"),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("handles denial and non-test shops without granting catalogue authority", async () => {
    const h = await setup(),
      state = await h.begin();
    expect(
      (
        await h.service.callback(
          h.issued.cookie,
          h.signed(state, { code: "", error: "access_denied" }),
          new AbortController().signal,
        )
      ).outcome,
    ).toBe("cancelled");
    expect(h.exchange).not.toHaveBeenCalled();
    h.identity.mockResolvedValue({
      id: "gid://shopify/Shop/2",
      shop,
      name: "Production",
      currency: "USD",
      development: false,
    });
    const next = await h.begin();
    expect(
      (
        await h.service.callback(
          h.issued.cookie,
          h.signed(next),
          new AbortController().signal,
        )
      ).outcome,
    ).toBe("needs_attention");
    await expect(
      h.service.withConnection(
        h.issued.cookie,
        h.issued.result.tabProof,
        "workspace",
        new AbortController().signal,
        async () => true,
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("rotates refresh atomically and never silently replays an unknown refresh", async () => {
    const h = await setup();
    await h.connect();
    h.advance(3_550_000);
    const operation = vi.fn(
      async (_installation: unknown, tokens: Tokens) => tokens.access,
    );
    expect(
      await h.service.withConnection(
        h.issued.cookie,
        h.issued.result.tabProof,
        "workspace",
        new AbortController().signal,
        operation,
      ),
    ).toBe("rotated_access");
    expect(h.refresh).toHaveBeenCalledTimes(1);
    h.advance(3_550_000);
    h.refresh.mockRejectedValue(new Error("private-refresh-detail"));
    await expect(
      h.service.withConnection(
        h.issued.cookie,
        h.issued.result.tabProof,
        "workspace",
        new AbortController().signal,
        operation,
      ),
    ).rejects.toThrow("private-refresh-detail");
    await expect(
      h.service.withConnection(
        h.issued.cookie,
        h.issued.result.tabProof,
        "workspace",
        new AbortController().signal,
        operation,
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(h.refresh).toHaveBeenCalledTimes(2);
    expect(
      (
        await h.service.status(
          h.issued.cookie,
          h.issued.result.tabProof,
          "workspace",
        )
      ).state,
    ).toBe("needs_attention");
  });
  it("bounds bootstrap, connect attempts and reads at the exact limit", async () => {
    const h = await setup();
    for (let i = 0; i < 60; i++)
      await h.service.status(
        h.issued.cookie,
        h.issued.result.tabProof,
        "workspace",
      );
    await expect(
      h.service.status(h.issued.cookie, h.issued.result.tabProof, "workspace"),
    ).rejects.toMatchObject({ code: "BUSY" });
    for (let i = 0; i < 10; i++) await h.begin();
    await expect(h.begin()).rejects.toMatchObject({ code: "BUSY" });
    for (let i = 1; i < 128; i++)
      await h.service.session(h.issued.cookie, {
        schemaVersion: 1,
        workspaceId: `workspace_${i}`,
        createdAt: h.clock(),
      });
    await expect(
      h.service.session(h.issued.cookie, {
        schemaVersion: 1,
        workspaceId: "excess",
        createdAt: h.clock(),
      }),
    ).rejects.toMatchObject({ code: "BUSY" });
  });
  it("integrates fixed routes, retains Origin protection and keeps config/health inert", async () => {
    const h = await setup(),
      runtime = composeRuntime(parseEnvironment({}), () => "req_shopify");
    const app = createApp({ ...runtime, shopify: h.service });
    expect((await request(app).get("/v1/health")).status).toBe(200);
    expect((await request(app).get("/v1/config")).status).toBe(200);
    expect(h.exchange).not.toHaveBeenCalled();
    expect(
      (await request(app).post("/v1/shopify/session").send({})).status,
    ).toBe(403);
    const bootstrap = await request(app)
      .post("/v1/shopify/session")
      .set("Origin", runtime.frontendOrigin)
      .send({
        schemaVersion: 1,
        workspaceId: "http_workspace",
        createdAt: h.clock(),
      });
    expect(bootstrap.status).toBe(200);
    const cookies = bootstrap.headers["set-cookie"];
    const header = typeof cookies === "string" ? cookies : (cookies?.[0] ?? "");
    expect(header).toContain("HttpOnly");
    expect(header).toContain("SameSite=Lax");
    const response = await request(app)
      .post("/v1/shopify/status")
      .set("Origin", runtime.frontendOrigin)
      .set("Cookie", `retailor_shopify=${shopifyCookie(header)}`)
      .set("x-retailor-shopify-tab", "b".repeat(64))
      .send({ schemaVersion: 1, workspaceId: "http_workspace" });
    expect(response.status).toBe(403);
    expect(response.text).not.toContain("test_refresh");
  });
});
