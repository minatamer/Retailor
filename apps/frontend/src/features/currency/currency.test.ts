import { afterEach, describe, expect, it, vi } from "vitest";
import { applyCommand } from "@retailor/commerce/commands";
import type { CommerceCommand } from "@retailor/contracts/commands";
import { environment, file } from "../../../test/workspace";
import { FxSnapshotSchema, USD_SCOPE } from "@retailor/contracts/currency";
import { displayMinor, formatDisplay } from "@retailor/commerce/currency";
import { selectedScope } from "./display";
import { SESSION_KEY } from "../session/projection";
const environments: ReturnType<typeof environment>[] = [];
afterEach(() => {
  environments.splice(0).forEach((env) => env.dispose());
  vi.useRealTimers();
});
const quote = (now: number, patch: Record<string, unknown> = {}) =>
  FxSnapshotSchema.parse({
    schemaVersion: 1,
    snapshotId: "fx_test",
    base: "USD",
    quote: "EUR",
    rateDecimal: "0.5",
    rateDate: "2026-10-05",
    fetchedAt: new Date(now).toISOString(),
    sourceId: "frankfurter-ecb-v2",
    ...patch,
  });
async function openStore(
  fetcher?: (signal: AbortSignal) => Promise<unknown>,
  advance = 0,
) {
  const env = environment();
  environments.push(env);
  env.advance(advance);
  const getter = fetcher ?? vi.fn(async () => quote(env.clock()));
  const controller = await env.open({ currencyQuote: getter });
  await controller.photos.add([file("one"), file("two")]);
  await controller.draftCatalogue();
  controller.publish();
  controller.useCurrentLook();
  controller.keepWordmark();
  controller.acceptDesign();
  return {
    env,
    controller,
    getter,
    graph: controller.getSnapshot().state.graph,
  };
}
async function storeWithPlacedOrder(advance = 0, rateDate = "2026-10-05") {
  const env = environment();
  environments.push(env);
  env.advance(advance);
  const controller = await env.open({
    currencyQuote: async () => quote(env.clock(), { rateDate }),
    scenarioFactory: (initial) => {
      let graph = initial;
      const at = new Date(env.clock()).toISOString();
      const step = (action: Pick<CommerceCommand, "type" | "payload">) => {
        const result = applyCommand(
          graph,
          {
            ...action,
            id: env.id(),
            workspaceId: graph.workspaceId,
            scenarioId: graph.scenarioId,
            expectedRevision: graph.revision,
            at,
            expiresAt: new Date(env.clock() + 120000).toISOString(),
            origin: "seeded_scenario",
          },
          {
            now: at,
            availablePhotoIds: new Set(graph.photos.map((photo) => photo.id)),
          },
        );
        if (!result.ok) throw new Error(result.code);
        graph = result.graph;
      };
      const draftId = env.id();
      step({
        type: "saveOrderDraft",
        payload: {
          id: draftId,
          actor: "owner",
          lines: [
            { variantId: graph.products[0]!.variants[0]!.id, quantity: 1 },
          ],
          discount: 0,
          delivery: 600,
          tax: 0,
        },
      });
      step({ type: "placeOrder", payload: { draftId, orderId: env.id() } });
      return { graph, info: null };
    },
  });
  await controller.photos.add([file("one")]);
  await controller.draftCatalogue();
  controller.publish();
  controller.useCurrentLook();
  controller.keepWordmark();
  controller.acceptDesign();
  await controller.selectCurrency("EUR");
  return { env, controller };
}
describe("one accepted currency display snapshot", () => {
  it("switches both ways without claiming nonexistent price bounds were cleared or changing other filters and records", async () => {
    const { controller, getter } = await openStore();
    controller.browse({
      filters: {
        ...controller.getSnapshot().state.browse.filters,
        category: "jeans",
        search: "denim",
      },
    });
    const { browse, graph } = controller.getSnapshot().state;
    await controller.selectCurrency("EUR");
    expect(controller.getSnapshot().state.currency.selected).toBe("EUR");
    expect(controller.getSnapshot().currencyNotice).toBe(
      "Prices are shown in EUR.",
    );
    await controller.selectCurrency("USD");
    expect(controller.getSnapshot().state.currency.selected).toBe("USD");
    expect(controller.getSnapshot().currencyNotice).toBe(
      "Prices are shown in USD.",
    );
    expect(controller.getSnapshot().state.browse).toEqual(browse);
    expect(controller.getSnapshot().state.graph).toBe(graph);
    await controller.selectCurrency("EUR");
    expect(getter).toHaveBeenCalledTimes(1);
    expect(controller.getSnapshot().currencyNotice).toBe(
      "Prices are shown in EUR.",
    );
  });
  it("clears an actual lower or upper price bound on currency change with a truthful notice", async () => {
    for (const bound of ["minPrice", "maxPrice"] as const) {
      const { controller } = await openStore();
      controller.browse({
        filters: {
          ...controller.getSnapshot().state.browse.filters,
          [bound]: 1000,
          category: "jeans",
        },
      });
      const graph = controller.getSnapshot().state.graph;
      await controller.selectCurrency("EUR");
      expect(controller.getSnapshot().state.browse.filters).toMatchObject({
        minPrice: null,
        maxPrice: null,
        category: "jeans",
      });
      expect(controller.getSnapshot().currencyNotice).toBe(
        "Prices are shown in EUR. Price bounds were cleared for this currency.",
      );
      expect(controller.getSnapshot().state.graph).toBe(graph);
    }
  });
  it("checks confirmation scope after freshness validation rather than recording an expired EUR witness", async () => {
    const { env, controller } = await storeWithPlacedOrder(
      5 * 3600_000 + 59 * 60_000,
      "2026-10-04",
    );
    const state = controller.getSnapshot().state,
      scope = selectedScope(state.currency);
    expect(scope.currency).toBe("EUR");
    env.advance(2 * 60_000);
    controller.rememberOrderDisplay(state.graph.orders[0]!.id, scope);
    expect(controller.getSnapshot().state.currency.selected).toBe("USD");
    expect(controller.getSnapshot().state.orderDisplays).toHaveLength(0);
  });
  it("drops replaced scenario confirmation records and restores the new valid graph after approved rebuild", async () => {
    const { env, controller } = await storeWithPlacedOrder();
    const before = controller.getSnapshot().state;
    controller.rememberOrderDisplay(
      before.graph.orders[0]!.id,
      selectedScope(before.currency),
    );
    expect(controller.getSnapshot().state.orderDisplays).toHaveLength(1);
    const recorded = controller.getSnapshot().state.orderDisplays[0];
    await controller.selectCurrency("USD");
    controller.rememberOrderDisplay(before.graph.orders[0]!.id, USD_SCOPE);
    expect(controller.getSnapshot().state.orderDisplays[0]).toBe(recorded);
    controller.go("catalogue");
    controller.publish(true);
    const after = controller.getSnapshot().state;
    expect(after.graph.scenarioId).not.toBe(before.graph.scenarioId);
    expect(after.orderDisplays).toHaveLength(0);
    expect(after.currency.acceptedSnapshot).toEqual(
      before.currency.acceptedSnapshot,
    );
    const restored = await env.open();
    expect(restored.getSnapshot().state.graph).toEqual(after.graph);
  });
  it("converts source prices, clears monetary bounds explicitly and reuses the same quote through USD/EUR/refresh", async () => {
    const { env, controller, getter } = await openStore();
    controller.browse({
      filters: {
        ...controller.getSnapshot().state.browse.filters,
        maxPrice: 10000,
      },
    });
    const graph = controller.getSnapshot().state.graph;
    await controller.selectCurrency("EUR");
    const state = controller.getSnapshot().state,
      scope = selectedScope(state.currency);
    expect(formatDisplay(6800, scope)).toBe("€34.00");
    expect(state.browse.filters.maxPrice).toBeNull();
    expect(controller.getSnapshot().currencyNotice).toContain(
      "Price bounds were cleared",
    );
    expect(state.graph).toBe(graph);
    const accepted = state.currency.acceptedSnapshot;
    controller.filterDisplayBudget(3400, scope);
    expect(controller.getSnapshot().state.browse.filters.maxPrice).toBe(3400);
    await controller.selectCurrency("USD");
    expect(controller.getSnapshot().state.currency.acceptedSnapshot).toBe(
      accepted,
    );
    await controller.selectCurrency("EUR");
    expect(getter).toHaveBeenCalledTimes(1);
    const restored = await env.open({ currencyQuote: getter });
    await restored.selectCurrency("EUR");
    expect(getter).toHaveBeenCalledTimes(1);
    expect(restored.getSnapshot().state.graph).toEqual(graph);
    expect(restored.getSnapshot().state.currency).toEqual(
      controller.getSnapshot().state.currency,
    );
  });
  it("rejects a stale currency budget/filter witness instead of turning its euro number into dollars", async () => {
    const { controller } = await openStore();
    await controller.selectCurrency("EUR");
    const scope = selectedScope(controller.getSnapshot().state.currency);
    await controller.selectCurrency("USD");
    const before = controller.getSnapshot().state.browse;
    controller.filterDisplayBudget(8000, scope);
    expect(controller.getSnapshot().state.browse).toBe(before);
    controller.browse(
      { filters: { ...before.filters, maxPrice: 8000 } },
      scope,
    );
    expect(controller.getSnapshot().state.browse).toBe(before);
    expect(controller.getSnapshot().currencyNotice).toContain(
      "Currency changed",
    );
    controller.filterDisplayBudget(8000, USD_SCOPE);
    expect(controller.getSnapshot().state.browse.filters.maxPrice).toBe(8000);
  });
  it("keeps USD on unavailable, invalid, stale or undeclared source and never retries automatically", async () => {
    for (const mode of ["outage", "invalid", "stale"] as const) {
      const env = environment();
      environments.push(env);
      const getter = vi.fn(async () => {
        if (mode === "outage") throw new Error("private upstream error");
        return mode === "invalid"
          ? { arbitrary: true }
          : quote(env.clock(), { rateDate: "2026-10-01" });
      });
      const controller = await env.open({ currencyQuote: getter });
      await controller.photos.add([file("one")]);
      await controller.draftCatalogue();
      controller.publish();
      await controller.selectCurrency("EUR");
      expect(controller.getSnapshot().state.currency.selected).toBe("USD");
      expect(getter).toHaveBeenCalledTimes(1);
      expect(controller.getSnapshot().currencyNotice).toBe(
        "Euro pricing is unavailable right now; prices are shown in USD.",
      );
      expect(controller.getSnapshot().currencyNotice).not.toContain(
        "private upstream",
      );
    }
  });
  it("ignores a delayed result after USD selection or reset even when the injected port ignores abort", async () => {
    let release = (_quote: unknown) => {};
    const deferred = new Promise<unknown>((resolve) => {
      release = resolve;
    });
    const { env, controller, graph } = await openStore(async () => deferred);
    const pending = controller.selectCurrency("EUR");
    await controller.selectCurrency("USD");
    release(quote(env.clock()));
    await pending;
    expect(controller.getSnapshot().state.currency.selected).toBe("USD");
    expect(controller.getSnapshot().state.graph).toBe(graph);
    let releaseReset = (_quote: unknown) => {};
    const waiting = new Promise<unknown>((resolve) => {
      releaseReset = resolve;
    });
    const resetCase = await openStore(async () => waiting),
      old = resetCase.controller.getSnapshot().state.graph.workspaceId;
    const oldRequest = resetCase.controller.selectCurrency("EUR");
    await resetCase.controller.reset();
    releaseReset(quote(resetCase.env.clock()));
    await oldRequest;
    expect(resetCase.controller.getSnapshot().state.graph.workspaceId).not.toBe(
      old,
    );
    expect(
      resetCase.controller.getSnapshot().state.currency.acceptedSnapshot,
    ).toBeNull();
    expect(resetCase.controller.getSnapshot().currencyBusy).toBe(false);
  });
  it("ends a non-cooperating frontend request at its deadline without applying a late quote", async () => {
    vi.useFakeTimers();
    const { controller } = await openStore(async () => new Promise(() => {}));
    const pending = controller.selectCurrency("EUR");
    await vi.advanceTimersByTimeAsync(7000);
    await pending;
    expect(controller.getSnapshot().currencyBusy).toBe(false);
    expect(controller.getSnapshot().state.currency.selected).toBe("USD");
    expect(controller.getSnapshot().currencyNotice).toContain("unavailable");
  });
  it("drops corrupt persisted currency data without losing catalogue records or retaining price bounds", async () => {
    const { env, controller } = await openStore();
    await controller.selectCurrency("EUR");
    controller.filterDisplayBudget(
      3400,
      selectedScope(controller.getSnapshot().state.currency),
    );
    const graph = controller.getSnapshot().state.graph;
    const saved = JSON.parse(env.storage.getItem(SESSION_KEY)!);
    saved.currency.acceptedSnapshot.rateDecimal = "0";
    env.storage.setItem(SESSION_KEY, JSON.stringify(saved));
    controller.dispose();
    const restored = await env.open();
    expect(restored.getSnapshot().state.graph).toEqual(graph);
    expect(restored.getSnapshot().state.currency).toEqual({
      selected: "USD",
      acceptedSnapshot: null,
    });
    expect(restored.getSnapshot().state.browse.filters.maxPrice).toBeNull();
    expect(restored.getSnapshot().currencyNotice).toContain("unavailable");
  });
  it("expires a seven-day quote at the UTC calendar boundary while a young workspace stays usable", async () => {
    const env = environment();
    environments.push(env);
    env.advance(5 * 3600_000 + 59 * 60_000);
    const controller = await env.open({
      currencyQuote: async () => quote(env.clock(), { rateDate: "2026-10-04" }),
    });
    await controller.photos.add([file("one")]);
    await controller.draftCatalogue();
    controller.publish();
    controller.useCurrentLook();
    controller.keepWordmark();
    controller.acceptDesign();
    await controller.selectCurrency("EUR");
    const scope = selectedScope(controller.getSnapshot().state.currency);
    expect(displayMinor(1, scope)).toBe(1);
    controller.filterDisplayBudget(8000, scope);
    env.advance(2 * 60_000);
    controller.filterDisplayBudget(8000, scope);
    expect(controller.getSnapshot().state.stage).toBe("storefront");
    expect(controller.getSnapshot().state.currency.selected).toBe("USD");
    expect(controller.getSnapshot().state.browse.filters.maxPrice).toBeNull();
    expect(controller.getSnapshot().currencyNotice).toContain(
      "Currency changed",
    );
  });
});
