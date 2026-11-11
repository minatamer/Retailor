import { afterEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import { shopifyFixture } from "../../../../test/fixtures/shopify.js";
import { ShopifyCatalogue } from "./catalogue.js";
import { ShopifyCleanup, CLEANUP } from "./cleanup.js";
import { ShopifyWebhooks } from "./webhooks.js";
import { ShopifyRateLimit } from "./rate-limit.js";
import { deny } from "../security/errors.js";
import request from "supertest";
import { createApp } from "../http/app.js";
import { composeRuntime } from "../runtime/compose.js";
import { parseEnvironment } from "../config/environment.js";
import { ShopifyService } from "./service.js";
import { ShopifyLedger } from "./ledger.js";
import { LocalShopifyStore } from "./storage.js";
import { ShopifyAccessRejected } from "./provider.js";
import { startShopifyCleanup } from "./runner.js";

const open: Awaited<ReturnType<typeof shopifyFixture>>[] = [];
async function setup() {
  const h = await shopifyFixture();
  open.push(h);
  const catalogue = new ShopifyCatalogue(h.auth, h.provider),
    cleanup = new ShopifyCleanup(h.auth, catalogue),
    webhooks = new ShopifyWebhooks(h.auth, "fixture-test-only");
  const send = () =>
    catalogue.export(h.cookie, h.proof, h.input, false, h.signal());
  const end = () => cleanup.request(h.cookie, h.proof, "workspace");
  const sweep = () => cleanup.sweep(h.signal());
  const current = () => h.ledger.inspect((data) => data.installations[0]!);
  const webhook = async (
    topic = "app/uninstalled",
    delivery = "delivery-1",
    body: object = { id: 1, myshopify_domain: h.shop },
  ) => {
    const raw = Buffer.from(JSON.stringify(body));
    return webhooks.accept(
      raw,
      createHmac("sha256", "fixture-test-only").update(raw).digest("base64"),
      topic,
      delivery,
    );
  };
  return {
    ...h,
    catalogue,
    cleanup,
    webhooks,
    send,
    end,
    sweep,
    current,
    webhook,
  };
}

it("wakes only after a valid durable request, leaves repeated cleaned requests idle, and reports ended cleanup states", async () => {
  const h = await setup();
  let observed: Promise<unknown> | undefined;
  const wake = vi.fn(() => {
    observed = h.current();
  });
  const detach = h.cleanup.onRequested(wake);
  expect(() => h.cleanup.onRequested(() => {})).toThrow();
  await expect(
    h.cleanup.request(h.cookie, "b".repeat(64), "workspace"),
  ).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(
    h.cleanup.request(h.cookie, h.proof, "foreign"),
  ).rejects.toMatchObject({ code: "FORBIDDEN" });
  expect(wake).not.toHaveBeenCalled();
  expect((await h.auth.status(h.cookie, h.proof, "workspace")).ended).toBe(
    false,
  );
  const ended = await h.end();
  expect(ended.ended).toBe(true);
  expect(ended.state).toBe("cleanup_pending");
  expect(await observed).toMatchObject({
    state: "cleanup_pending",
    endedAt: h.clock(),
  });
  expect(wake).toHaveBeenCalledTimes(1);
  await h.ledger.transact((data) => {
    data.installations[0]!.state = "needs_attention";
  });
  expect(await h.auth.status(h.cookie, h.proof, "workspace")).toMatchObject({
    ended: true,
    state: "needs_attention",
  });
  await h.sweep();
  const cleaned = await h.auth.status(h.cookie, h.proof, "workspace");
  expect(cleaned).toMatchObject({ ended: true, state: "cleaned" });
  await h.end();
  expect(wake).toHaveBeenCalledTimes(1);
  detach();
  const replacement = h.cleanup.onRequested(() => {});
  replacement();
});

it("starts local cleanup on Disconnect without advancing the minute timer or keeping the browser open", async () => {
  const h = await setup();
  const completed: (() => void)[] = [];
  const initial = new Promise<void>((resolve) => completed.push(resolve));
  const settled = new Promise<void>((resolve) => completed.push(resolve));
  const diagnostic = vi.fn(() => completed.shift()?.());
  const stop = startShopifyCleanup(h.cleanup, diagnostic);
  try {
    await initial;
    await h.end();
    // request() acknowledges the fence, not a remote result. Wait for worker
    // completion through its existing diagnostic port, with no extra sweep.
    await settled;
  } finally {
    await stop();
  }
  expect((await h.current()).state).toBe("cleaned");
});
afterEach(async () => {
  await Promise.all(open.splice(0).map((h) => h.close()));
});

describe("durable Shopify cleanup", () => {
  it.each(["reset", "expire", "unknown"] as const)(
    "reclaims only a never-dispatched authorization reservation after %s",
    async (ending) => {
      const h = await setup(),
        shop = "abandoned.myshopify.com";
      const first = await h.auth.session(undefined, {
        schemaVersion: 1,
        workspaceId: "first",
        createdAt: h.clock(),
      });
      await h.auth.connect(first.cookie, first.result.tabProof, {
        schemaVersion: 1,
        workspaceId: "first",
        returnTo: "onboarding",
      });
      const selected = await h.auth.install(
        first.cookie,
        h.provider.installQuery(shop, h.clock()),
      );
      const exchange = vi.spyOn(h.provider, "exchange");
      if (ending === "unknown") {
        exchange.mockRejectedValueOnce(new Error("Unknown exchange result"));
        expect(
          (
            await h.auth.callback(
              first.cookie,
              h.provider.consent(
                shop,
                new URL(selected.authorizationUrl).searchParams.get("state")!,
                true,
                h.clock(),
              ),
              h.signal(),
            )
          ).outcome,
        ).toBe("needs_attention");
      }
      if (ending === "expire") h.advance(600001);
      else
        await h.cleanup.request(first.cookie, first.result.tabProof, "first");
      const second = await h.auth.session(undefined, {
        schemaVersion: 1,
        workspaceId: "second",
        createdAt: h.clock(),
      });
      await h.auth.connect(second.cookie, second.result.tabProof, {
        schemaVersion: 1,
        workspaceId: "second",
        returnTo: "connections",
      });
      const selecting = h.auth.install(
        second.cookie,
        h.provider.installQuery(shop, h.clock()),
      );
      if (ending === "unknown") {
        await expect(selecting).rejects.toMatchObject({ code: "BUSY" });
        expect(exchange).toHaveBeenCalledTimes(1);
      } else {
        expect(new URL((await selecting).authorizationUrl).hostname).toBe(shop);
        await expect(
          h.auth.callback(
            first.cookie,
            h.provider.consent(
              shop,
              new URL(selected.authorizationUrl).searchParams.get("state")!,
              true,
              h.clock(),
            ),
            h.signal(),
          ),
        ).rejects.toMatchObject({ code: "FORBIDDEN" });
        expect(exchange).not.toHaveBeenCalled();
      }
    },
  );
  it("cancels an unselected attempt on reset before it can reserve a store", async () => {
    const h = await setup();
    const issued = await h.auth.session(h.cookie, {
      schemaVersion: 1,
      workspaceId: "unselected",
      createdAt: h.clock(),
    });
    await h.auth.connect(issued.cookie, issued.result.tabProof, {
      schemaVersion: 1,
      workspaceId: "unselected",
      returnTo: "onboarding",
    });
    await h.cleanup.request(
      issued.cookie,
      issued.result.tabProof,
      "unselected",
    );
    await expect(
      h.auth.install(
        issued.cookie,
        h.provider.installQuery("other.myshopify.com", h.clock()),
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(
      await h.ledger.inspect((data) =>
        data.installations.map((item) => item.shop),
      ),
    ).toEqual([h.shop]);
  });
  it("blocks foreground and cleanup work after native access is rejected", async () => {
    const h = await setup();
    await h.send();
    const read = vi
      .spyOn(h.provider, "read")
      .mockRejectedValue(new ShopifyAccessRejected());
    const result = await h.auth.status(h.cookie, h.proof, "workspace");
    await expect(
      h.catalogue.check(
        h.cookie,
        h.proof,
        "workspace",
        result.exports[0]!.id,
        h.signal(),
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect((await h.current()).accessBlocked).toBe(true);
    await h.end();
    await h.sweep();
    expect(read).toHaveBeenCalledTimes(1);
    expect((await h.current()).state).toBe("needs_attention");
    expect(h.provider.snapshot(h.shop)).toHaveLength(1);
  });
  it("does not persist a rotated credential returned after the hard cleanup deadline", async () => {
    const h = await setup();
    await h.end();
    h.advance(CLEANUP.credentialMs - 1);
    vi.spyOn(h.provider, "refresh").mockImplementationOnce(
      async (_shop, tokens) => {
        h.advance(1);
        return {
          ...tokens,
          access: "late_rotated_access",
          expiresAt: h.clock() + 3600000,
        };
      },
    );
    const work = vi.fn();
    await expect(
      h.auth.withMaintenance(h.shop, h.signal(), () => {}, work),
    ).rejects.toMatchObject({ code: "STALE" });
    expect(work).not.toHaveBeenCalled();
    expect((await h.current()).tokens).toBeNull();
  });
  it("caps uncertain uninstall reconciliation without replaying the mutation", async () => {
    const h = await setup();
    await h.end();
    const uninstall = vi
      .spyOn(h.provider, "uninstall")
      .mockRejectedValue(new Error("lost response"));
    const identity = vi.spyOn(h.provider, "identity");
    await h.sweep();
    for (let n = 1; n < CLEANUP.attempts; n++) {
      h.advance((await h.current()).maintenanceDue - h.clock());
      await h.sweep();
    }
    h.advance(60000);
    await h.sweep();
    expect(uninstall).toHaveBeenCalledTimes(1);
    expect(identity).toHaveBeenCalledTimes(7);
    expect((await h.current()).maintenanceAttempts).toBe(8);
  });
  it("preserves the per-shop hourly allowance after a verified disconnect and reconnect", async () => {
    const h = await setup();
    await h.end();
    await h.sweep();
    await h.ledger.transact((data) => {
      data.installations[0]!.calls = { start: h.clock(), count: 119 };
    });
    const connect = await h.begin();
    const exchange = vi.spyOn(h.provider, "exchange");
    await expect(
      h.auth.callback(
        h.cookie,
        h.provider.consent(
          h.shop,
          new URL(connect.authorizationUrl).searchParams.get("state")!,
          true,
          h.clock(),
        ),
        h.signal(),
      ),
    ).rejects.toMatchObject({ code: "BUSY" });
    expect(exchange).not.toHaveBeenCalled();
  });
  it("refuses a different immutable store identity during retained-ledger reauthorization", async () => {
    const h = await setup();
    await h.send();
    await h.ledger.transact((data) => {
      data.installations[0]!.state = "needs_attention";
    });
    const identity = h.provider.identity.bind(h.provider);
    vi.spyOn(h.provider, "identity").mockImplementation(async (...args) => ({
      ...(await identity(...args)),
      id: "gid://shopify/Shop/2",
    }));
    const connect = await h.begin();
    const result = await h.auth.callback(
      h.cookie,
      h.provider.consent(
        h.shop,
        new URL(connect.authorizationUrl).searchParams.get("state")!,
        true,
        h.clock(),
      ),
      h.signal(),
    );
    expect(result.outcome).toBe("needs_attention");
    expect((await h.current()).shopId).toBe("gid://shopify/Shop/1");
  });
  it("keeps the workspace lifetime create cap after verified disconnect and reconnect", async () => {
    const h = await setup();
    for (let n = 0; n < 10; n++) {
      const input = structuredClone(h.input);
      input.product.id = `tee_${n}`;
      await h.catalogue.export(h.cookie, h.proof, input, false, h.signal());
    }
    await h.end();
    await h.sweep();
    const connection = await h.begin();
    await h.auth.callback(
      h.cookie,
      h.provider.consent(
        h.shop,
        new URL(connection.authorizationUrl).searchParams.get("state")!,
        true,
        h.clock(),
      ),
      h.signal(),
    );
    const extra = structuredClone(h.input);
    extra.product.id = "eleventh";
    const create = vi.spyOn(h.provider, "create");
    await expect(
      h.catalogue.export(h.cookie, h.proof, extra, false, h.signal()),
    ).rejects.toMatchObject({ code: "BUSY" });
    expect(create).not.toHaveBeenCalled();
  }, 15000);
  it("stops at forty actual provider calls and retains remaining products for a later sweep", async () => {
    const h = await setup();
    await h.send();
    await h.end();
    const template = await h.current(),
      product = h.provider.snapshot(h.shop)[0]!;
    const binding = await h.ledger.inspect((data) => data.bindings[0]!);
    for (let shopIndex = 0; shopIndex < 3; shopIndex++) {
      const shop =
        shopIndex === 0 ? h.shop : `store-${shopIndex}.myshopify.com`;
      const tokens =
        shopIndex === 0
          ? template.tokens!
          : await h.provider.exchange(shop, "fixture_code", h.signal());
      const installation = structuredClone(template);
      // Legacy installations isolate the pre-existing forty-call product budget.
      // Collection lifecycle and its shared admission are covered separately.
      installation.collection = null;
      installation.shop = shop;
      installation.tokens = tokens;
      installation.bindingId = String(shopIndex + 1).repeat(64);
      installation.products = Array.from({ length: 10 }, (_, n) => {
        const row = structuredClone(template.products[0]!);
        row.id = (shopIndex * 10 + n + 1).toString(16).padStart(64, "0");
        row.marker = row.id;
        row.handle = `retailor-demo-${row.marker}`;
        row.remoteId = `gid://shopify/Product/${shopIndex * 10 + n + 100}`;
        h.provider.seed(shop, {
          ...product,
          id: row.remoteId,
          handle: row.handle,
          metafield: { value: row.marker },
        });
        return row;
      });
      await h.ledger.transact((data) => {
        if (shopIndex === 0) {
          data.installations = [];
          data.bindings = [];
        }
        data.installations.push(installation);
        data.bindings.push({
          ...binding,
          id: installation.bindingId,
          shop,
          workspaceId: `workspace_${shopIndex}`,
        });
      });
    }
    const remove = vi.spyOn(h.provider, "remove"),
      uninstall = vi.spyOn(h.provider, "uninstall");
    const result = await h.sweep();
    expect(result.calls).toBe(40);
    expect(remove).toHaveBeenCalledTimes(13);
    expect(uninstall).toHaveBeenCalledTimes(1);
    expect(
      await h.ledger.inspect(
        (data) =>
          data.installations
            .flatMap((item) => item.products)
            .filter((item) => item.state !== "removed").length,
      ),
    ).toBe(17);
    expect(h.provider.snapshot("store-2.myshopify.com")).toHaveLength(10);
  });

  it("aborts an outstanding provider operation at the fifty-five second sweep deadline", async () => {
    const h = await setup();
    await h.send();
    await h.end();
    let entered!: () => void;
    const waiting = new Promise<void>((resolve) => {
      entered = resolve;
    });
    vi.spyOn(h.provider, "remove").mockImplementation(async (context) => {
      entered();
      await new Promise<void>((_resolve, reject) => {
        context.signal.addEventListener(
          "abort",
          () => reject(new Error("aborted")),
          { once: true },
        );
      });
      return false;
    });
    vi.useFakeTimers();
    try {
      const running = h.sweep();
      await waiting;
      await vi.advanceTimersByTimeAsync(55000);
      await running;
      expect((await h.current()).lease).toBeNull();
      expect((await h.current()).products[0]?.state).toBe("removal_pending");
      expect((await h.current()).tokens).not.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
  it("loads persisted ownership in a new service and cleans after backend restart", async () => {
    const h = await setup();
    await h.send();
    await h.auth.close();
    h.advance(7_200_000);
    const auth = new ShopifyService(
      new ShopifyLedger(
        new LocalShopifyStore(h.directory),
        "f".repeat(64),
        "fixture-app",
      ),
      h.provider,
      "fixture-app",
      h.clock,
    );
    try {
      const catalogue = new ShopifyCatalogue(auth, h.provider);
      const cleanup = new ShopifyCleanup(auth, catalogue);
      await cleanup.sweep(h.signal());
      expect(h.provider.snapshot(h.shop)).toHaveLength(0);
      expect(
        await auth.ledger.inspect((data) => data.installations[0]?.state),
      ).toBe("cleaned");
    } finally {
      await auth.close();
    }
  });

  it("prevents two live runner instances from deleting or uninstalling concurrently", async () => {
    const h = await setup();
    await h.send();
    await h.end();
    let release!: () => void, entered!: () => void;
    const waiting = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const original = h.provider.remove.bind(h.provider);
    const remove = vi
      .spyOn(h.provider, "remove")
      .mockImplementationOnce(async (...args) => {
        entered();
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return original(...args);
      });
    const first = h.sweep();
    await waiting;
    const other = new ShopifyCleanup(h.auth, h.catalogue);
    expect((await other.sweep(h.signal())).claimed).toBe(false);
    release();
    await first;
    expect(remove).toHaveBeenCalledTimes(1);
    expect((await h.current()).state).toBe("cleaned");
  });
  it("removes one owned product while preserving connection and a merchant sentinel", async () => {
    const h = await setup(),
      result = await h.send(),
      remote = h.provider.snapshot(h.shop)[0]!;
    h.provider.seed(h.shop, {
      ...remote,
      id: "gid://shopify/Product/999",
      handle: "sentinel",
      metafield: null,
    });
    await h.cleanup.request(h.cookie, h.proof, "workspace", result.export.id);
    await expect(h.send()).rejects.toMatchObject({ code: "STALE" });
    await h.sweep();
    expect(h.provider.snapshot(h.shop).map((product) => product.id)).toEqual([
      "gid://shopify/Product/999",
    ]);
    expect((await h.current()).state).toBe("connected");
    expect((await h.current()).products[0]?.state).toBe("removed");
    expect((await h.current()).tokens).not.toBeNull();
  });
  it("deletes before uninstall, erases credentials, and handles a zero-product end", async () => {
    const h = await setup();
    await h.send();
    const remove = vi.spyOn(h.provider, "remove"),
      original = h.provider.uninstall.bind(h.provider);
    const uninstall = vi
      .spyOn(h.provider, "uninstall")
      .mockImplementation(async (context) => {
        expect(h.provider.snapshot(h.shop)).toHaveLength(0);
        expect(remove).toHaveBeenCalledTimes(1);
        return original(context);
      });
    expect((await h.end()).state).toBe("cleanup_pending");
    await h.sweep();
    expect((await h.current()).state).toBe("cleaned");
    expect((await h.current()).tokens).toBeNull();
    expect(uninstall).toHaveBeenCalledTimes(1);
    await h.sweep();
    expect(uninstall).toHaveBeenCalledTimes(1);
    const empty = await setup();
    await empty.end();
    await empty.sweep();
    expect((await empty.current()).state).toBe("cleaned");
  });
  it("discovers original expiry with no browser request and bounds retention", async () => {
    const h = await setup();
    await h.send();
    const expiresAt = h.clock() + 7_200_000;
    h.advance(7_200_000);
    await h.sweep();
    expect((await h.current()).endedAt).toBe(expiresAt);
    expect((await h.current()).state).toBe("cleaned");
    h.advance(CLEANUP.metadataMs - 1);
    await h.sweep();
    expect(await h.ledger.inspect((data) => data.installations.length)).toBe(1);
    h.advance(1);
    await h.sweep();
    expect(await h.ledger.inspect((data) => data.installations)).toEqual([]);
  });
  it("records late creates after end and cleans them after the foreground lease releases", async () => {
    const h = await setup(),
      original = h.provider.create.bind(h.provider);
    vi.spyOn(h.provider, "create").mockImplementationOnce(async (...args) => {
      const result = await original(...args);
      await h.end();
      await h.sweep();
      expect(h.provider.snapshot(h.shop)).toHaveLength(1);
      return result;
    });
    await expect(h.send()).rejects.toMatchObject({ code: "STALE" });
    expect((await h.current()).products[0]?.remoteId).toBeTruthy();
    await h.sweep();
    expect(h.provider.snapshot(h.shop)).toHaveLength(0);
    expect((await h.current()).state).toBe("cleaned");
  });
  it("honors Retry-After, caps attempts and erases credentials even if cleanup never succeeds", async () => {
    const h = await setup();
    await h.send();
    await h.end();
    const remove = vi
      .spyOn(h.provider, "remove")
      .mockRejectedValue(new ShopifyRateLimit(3600000));
    await h.sweep();
    expect(remove).toHaveBeenCalledTimes(1);
    h.advance(60000);
    await h.sweep();
    expect(remove).toHaveBeenCalledTimes(1);
    for (let n = 2; n <= 8; n++) {
      h.advance((await h.current()).products[0]!.cleanupDue - h.clock());
      await h.sweep();
      expect(remove).toHaveBeenCalledTimes(n);
    }
    await h.sweep();
    expect(remove).toHaveBeenCalledTimes(8);
    expect((await h.current()).state).toBe("needs_attention");
    h.advance(
      (await h.current()).endedAt! + CLEANUP.credentialMs - 1 - h.clock(),
    );
    await h.sweep();
    expect((await h.current()).tokens).not.toBeNull();
    h.advance(1);
    await h.sweep();
    expect((await h.current()).tokens).toBeNull();
    expect((await h.current()).state).toBe("needs_attention");
  });
  it("does not blindly replay an unknown uninstall", async () => {
    const h = await setup();
    await h.end();
    const uninstall = vi
      .spyOn(h.provider, "uninstall")
      .mockRejectedValueOnce(new Error("lost uninstall result"));
    await h.sweep();
    h.advance(120000);
    await h.sweep();
    expect(uninstall).toHaveBeenCalledTimes(1);
    expect((await h.current()).uninstallDispatched).toBe(true);
    expect((await h.current()).state).toBe("needs_attention");
  });
  it("requires a fresh private-runner heartbeat for native writes", async () => {
    const h = await setup();
    await expect(h.cleanup.beforeWrite(h.signal())).rejects.toMatchObject({
      code: "UNAVAILABLE",
    });
    await h.sweep();
    await h.cleanup.beforeWrite(h.signal());
    h.advance(120001);
    await expect(h.cleanup.beforeWrite(h.signal())).rejects.toMatchObject({
      code: "UNAVAILABLE",
    });
  });
  it("serializes two sweep instances and recovers an expired worker claim", async () => {
    const h = await setup();
    await h.ledger.transact((data) => {
      data.maintenance = {
        owner: "a".repeat(64),
        expiresAt: h.clock() + 75000,
      };
    });
    expect((await h.sweep()).claimed).toBe(false);
    h.advance(75001);
    expect((await h.sweep()).claimed).toBe(true);
  });
});

describe("signed lifecycle and privacy deliveries", () => {
  it("review regression: own uninstall delivery preserves verified cleaned state", async () => {
    const h = await setup();
    await h.end();
    await h.sweep();
    await h.webhook();
    expect((await h.current()).state).toBe("cleaned");
  });
  it("review regression: a newer delivery is not discarded by an older identity probe", async () => {
    const h = await setup();
    await h.webhook();
    const identity = h.provider.identity.bind(h.provider);
    vi.spyOn(h.provider, "identity").mockImplementationOnce(async (...args) => {
      const result = await identity(...args);
      await h.webhook("shop/redact", "newer-redaction", {
        shop_id: 1,
        shop_domain: h.shop,
      });
      return result;
    });
    await h.sweep();
    expect((await h.current()).notice).toBe("redact");
    expect((await h.current()).state).toBe("needs_attention");
  });
  it("review regression: an uncertain foreground refresh is not replayed by maintenance", async () => {
    const h = await setup();
    h.advance(3590000);
    const refresh = vi
      .spyOn(h.provider, "refresh")
      .mockRejectedValueOnce(new Error("lost rotated credentials"));
    await expect(
      h.auth.withConnection(
        h.cookie,
        h.proof,
        "workspace",
        h.signal(),
        async () => {},
      ),
    ).rejects.toThrow("lost rotated credentials");
    await h.end();
    await h.sweep();
    expect(refresh).toHaveBeenCalledTimes(1);
    expect((await h.current()).refreshUnknown).toBe(true);
  });
  it("reconnects the same unexpired proof only for retained cleanup without extending the session", async () => {
    const h = await setup();
    await h.send();
    const before = await h.current();
    vi.spyOn(h.provider, "identity").mockImplementationOnce(async () =>
      deny("FORBIDDEN", 403),
    );
    await h.webhook();
    await h.sweep();
    const connect = await h.begin();
    const params = {
      code: "recovery",
      shop: h.shop,
      state: new URL(connect.authorizationUrl).searchParams.get("state")!,
      timestamp: String(Math.floor(h.clock() / 1000)),
    };
    const canonical = Object.entries(params)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([key, value]) => `${key}=${value}`)
      .join("&");
    await h.auth.callback(
      h.cookie,
      new URLSearchParams({
        ...params,
        hmac: createHmac("sha256", "fixture-test-only")
          .update(canonical)
          .digest("hex"),
      }).toString(),
      h.signal(),
    );
    const recovered = await h.current();
    expect(recovered.state).toBe("cleanup_pending");
    expect(recovered.expiresAt).toBe(before.expiresAt);
    expect(recovered.products[0]?.remoteId).toBe(before.products[0]?.remoteId);
    await h.sweep();
    expect((await h.current()).state).toBe("cleaned");
  });
  it("verifies bounded raw HTTP bytes and retains the private bridge Origin requirement", async () => {
    const h = await setup();
    const app = createApp(
      {
        ...composeRuntime(parseEnvironment({}), () => "req_webhook"),
        shopify: h.auth,
        shopifyCatalogue: h.catalogue,
        shopifyCleanup: h.cleanup,
        shopifyWebhooks: h.webhooks,
      },
      () => {},
    );
    const body = JSON.stringify({ id: 1, myshopify_domain: h.shop });
    const post = (signature: string) =>
      request(app)
        .post("/v1/shopify/webhook")
        .set("Origin", "http://127.0.0.1:4310")
        .set("Content-Type", "application/json")
        .set("x-shopify-topic", "app/uninstalled")
        .set("x-shopify-webhook-id", "http-delivery")
        .set("x-shopify-hmac-sha256", signature)
        .send(body);
    expect(
      (await request(app).post("/v1/shopify/webhook").send({})).status,
    ).toBe(403);
    expect((await post("a".repeat(43) + "=")).status).toBe(401);
    expect(
      (
        await post(
          createHmac("sha256", "fixture-test-only")
            .update(body)
            .digest("base64"),
        )
      ).body.accepted,
    ).toBe(true);
    const ended = await request(app)
      .post("/v1/shopify/disconnect")
      .set("Origin", "http://127.0.0.1:4310")
      .set("Cookie", `retailor_shopify=${h.cookie}`)
      .set("x-retailor-shopify-tab", h.proof)
      .send({ schemaVersion: 1, workspaceId: "workspace" });
    expect(ended.status).toBe(200);
    expect(ended.body.state).toBe("cleanup_pending");
  });
  it("rejects invalid/raw-modified/oversized signatures and prevents topic/header substitution", async () => {
    const h = await setup();
    await expect(
      h.webhooks.accept(Buffer.from("{"), undefined, "shop/redact", "id"),
    ).rejects.toMatchObject({ status: 401 });
    await expect(
      h.webhooks.accept(new Uint8Array(65537), "x", "shop/redact", "id"),
    ).rejects.toMatchObject({ status: 413 });
    await expect(
      h.webhook("shop/redact", "x", {
        shop_id: 1,
        shop_domain: h.shop,
        customer: { id: 4 },
      }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
    expect((await h.current()).state).toBe("connected");
  });
  it("acknowledges without refresh and preserves a current install after a stale uninstall", async () => {
    const h = await setup();
    const refresh = vi.spyOn(h.provider, "refresh"),
      identity = vi.spyOn(h.provider, "identity");
    await h.webhook();
    await h.webhook();
    expect(refresh).not.toHaveBeenCalled();
    expect(identity).not.toHaveBeenCalled();
    expect(await h.ledger.inspect((data) => data.deliveries.length)).toBe(1);
    expect((await h.current()).state).toBe("needs_attention");
    await h.sweep();
    expect((await h.current()).state).toBe("connected");
    expect((await h.current()).tokens).not.toBeNull();
  });
  it("reports externally revoked access honestly and erases applicable redacted metadata", async () => {
    const h = await setup();
    await h.send();
    vi.spyOn(h.provider, "identity").mockImplementation(async () =>
      deny("FORBIDDEN", 403),
    );
    await h.webhook();
    await h.sweep();
    expect((await h.current()).state).toBe("needs_attention");
    expect((await h.current()).tokens).toBeNull();
    expect(h.provider.snapshot(h.shop)).toHaveLength(1);
    await h.webhook("shop/redact", "redaction", {
      shop_id: 1,
      shop_domain: h.shop,
    });
    await h.sweep();
    expect(await h.ledger.inspect((data) => data.installations)).toEqual([]);
  });
});
