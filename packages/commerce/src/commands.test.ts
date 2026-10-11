import { describe, it, expect } from "vitest";
import { applyCommand } from "./commands.js";
import { previewCommand } from "./effects.js";
import { parseGraph } from "./graph.js";
import { stockOf, refundable } from "./selectors.js";
import { Harness, product, photo, NOW, ANCHOR } from "../test/fixtures.js";

describe("photo-backed clothing and stable variant authority", () => {
  it("removes an unused option from the bag while preserving its product", () => {
    const h = new Harness(),
      input = product("tee", 3800, 1600);
    input.variants.push({
      ...input.variants[0]!,
      id: "tee_l",
      size: "L",
      sku: "TEE-L",
    });
    h.step("updateProduct", input);
    h.step("setBagLine", { variantId: "tee_l", quantity: 1 });
    h.step("updateProduct", product("tee", 3800, 1600));
    expect(h.graph.bag).toEqual([]);
    expect(
      h.graph.products.find((item) => item.id === "tee")!.variants,
    ).toHaveLength(1);
  });
  it("rejects absent/unavailable/non-clothing photos and atomic dangling references", () => {
    const h = new Harness(),
      before = JSON.stringify(h.graph),
      input = product("goods");
    expect(
      applyCommand(
        h.graph,
        h.command("createProduct", { ...input, imageIds: [] }),
        h.context,
      ).ok,
    ).toBe(false);
    expect(
      applyCommand(
        h.graph,
        {
          ...h.command("createProduct", input),
          payload: { ...input, category: "shoes" },
        },
        h.context,
      ).ok,
    ).toBe(false);
    expect(
      applyCommand(h.graph, h.command("createProduct", input), {
        now: NOW,
        availablePhotoIds: new Set(),
      }),
    ).toMatchObject({ ok: false, code: "unavailable-photo" });
    expect(JSON.stringify(h.graph)).toBe(before);
  });
  it("edits future price/cost/copy while preserving placed snapshots and opening units", () => {
    const h = new Harness();
    h.place();
    const placed = h.graph.orders[0]!,
      current = h.graph.products[0]!,
      input = {
        ...product("shirt"),
        title: "New shirt",
        variants: current.variants.map(
          ({ openedAt: _openedAt, ...variant }) => ({
            ...variant,
            price: 5900,
            unitCost: 2900,
          }),
        ),
      };
    h.step("updateProduct", input);
    expect(h.graph.orders[0]).toEqual(placed);
    expect(h.graph.products[0]!.variants[0]!.price).toBe(5900);
    const bad = {
      ...input,
      variants: input.variants.map((variant) => ({
        ...variant,
        openingStock: 99,
      })),
    };
    expect(
      applyCommand(h.graph, h.command("updateProduct", bad), h.context),
    ).toMatchObject({ ok: false, code: "stock" });
  });
  it("archives referenced products/options, deletes only unreferenced items and repairs bag links", () => {
    const h = new Harness();
    h.step("setBagLine", { variantId: "tee_m", quantity: 1 });
    h.step("removeProduct", { productId: "tee" });
    expect(h.graph.products.map((item) => item.id)).toEqual(["shirt"]);
    expect(h.graph.bag).toEqual([]);
    h.place();
    h.step("removeProduct", { productId: "shirt" });
    expect(h.graph.products[0]!.archived).toBe(true);
    expect(h.graph.orders[0]!.lines[0]!.productId).toBe("shirt");
  });
  it("blocks photo replacement for historical identity and referenced option reuse", () => {
    const h = new Harness();
    h.place();
    const changed = photo("photo_shirt", 12);
    expect(
      applyCommand(
        h.graph,
        h.command("registerPhotos", { photos: [changed] }),
        h.context,
      ),
    ).toMatchObject({ ok: false, code: "relation" });
    const input = product("shirt");
    input.variants[0]!.size = "XL";
    expect(
      applyCommand(h.graph, h.command("updateProduct", input), h.context),
    ).toMatchObject({ ok: false, code: "relation" });
  });
});
describe("atomic placement, adjustment and stock/cost separation", () => {
  it("rejects the whole oversold order without touching any line", () => {
    const h = new Harness();
    h.step("saveOrderDraft", {
      id: "multi",
      actor: "owner",
      lines: [
        { variantId: "shirt_m", quantity: 2 },
        { variantId: "tee_m", quantity: 5 },
      ],
      discount: 0,
      delivery: 0,
      tax: 0,
    });
    h.step("adjustStock", {
      variantId: "tee_m",
      units: -8,
      kind: "correction",
      reason: "Disclosed count correction",
    });
    const before = JSON.stringify(h.graph);
    expect(
      applyCommand(
        h.graph,
        h.command("placeOrder", { draftId: "multi", orderId: "bad" }),
        h.context,
      ),
    ).toMatchObject({ ok: false, code: "stock" });
    expect(stockOf(h.graph, "shirt_m")).toBe(10);
    expect(JSON.stringify(h.graph)).toBe(before);
  });
  it("rejects stale quotes, missing photo bytes and repeated ship/fulfil effects", () => {
    const h = new Harness();
    h.step("saveOrderDraft", {
      id: "draft",
      actor: "owner",
      lines: [{ variantId: "shirt_m", quantity: 1 }],
      discount: 0,
      delivery: 0,
      tax: 0,
    });
    const changed = product("shirt");
    changed.variants[0]!.price = 5500;
    h.step("updateProduct", changed);
    expect(
      applyCommand(
        h.graph,
        h.command("placeOrder", { draftId: "draft", orderId: "A" }),
        h.context,
      ),
    ).toMatchObject({ ok: false, code: "price-changed" });
    h.place("B", "tee_m", 1, 0, NOW);
    h.step("advanceOrder", { orderId: "B", state: "shipped" });
    h.step("advanceOrder", { orderId: "B", state: "fulfilled" });
    expect(stockOf(h.graph, "tee_m")).toBe(9);
    expect(
      applyCommand(
        h.graph,
        h.command("advanceOrder", { orderId: "B", state: "fulfilled" }),
        h.context,
      ),
    ).toMatchObject({ ok: false, code: "transition" });
    h.step("saveOrderDraft", {
      id: "photo_lost",
      actor: "owner",
      lines: [{ variantId: "tee_m", quantity: 1 }],
      discount: 0,
      delivery: 0,
      tax: 0,
    });
    expect(
      applyCommand(
        h.graph,
        h.command("placeOrder", { draftId: "photo_lost", orderId: "C" }),
        { now: NOW, availablePhotoIds: new Set() },
      ),
    ).toMatchObject({ ok: false, code: "unavailable-photo" });
  });
  it("reverses cancellation exactly once and forbids cancellation after a refund", () => {
    const h = new Harness();
    h.place("B", "tee_m", 1, 0);
    const { command } = h.step("cancelOrder", { orderId: "B" });
    expect(stockOf(h.graph, "tee_m")).toBe(10);
    expect(refundable(h.graph, "B")).toEqual({
      lines: [{ lineId: h.graph.orders[0]!.lines[0]!.id, amount: 0 }],
      delivery: 0,
      tax: 0,
    });
    expect(applyCommand(h.graph, command, h.context)).toMatchObject({
      ok: true,
      replayed: true,
    });
    expect(stockOf(h.graph, "tee_m")).toBe(10);
    expect(
      applyCommand(
        h.graph,
        h.command("advanceOrder", { orderId: "B", state: "shipped" }),
        h.context,
      ),
    ).toMatchObject({ ok: false, code: "transition" });
    h.place("A", "shirt_m", 1, 0);
    const line = h.graph.orders.find((order) => order.id === "A")!.lines[0]!;
    h.step("issueRefund", {
      id: "goodwill",
      orderId: "A",
      lines: [{ lineId: line.id, amount: 1 }],
      delivery: 0,
      tax: 0,
    });
    expect(
      applyCommand(
        h.graph,
        h.command("cancelOrder", { orderId: "A" }),
        h.context,
      ),
    ).toMatchObject({ ok: false, code: "transition" });
  });
  it("requires received inspected units, prevents duplicate physical returns/restocks and retains damaged cost", () => {
    const h = new Harness();
    h.place();
    expect(
      applyCommand(
        h.graph,
        h.command("requestReturn", {
          id: "too_soon",
          orderId: "A",
          reason: "sizing",
          lines: [{ lineId: h.graph.orders[0]!.lines[0]!.id, units: [0] }],
        }),
        h.context,
      ),
    ).toMatchObject({ ok: false, code: "transition" });
    h.step("advanceOrder", { orderId: "A", state: "shipped" });
    h.receive();
    expect(stockOf(h.graph, "shirt_m")).toBe(8);
    h.step("restockReturn", { returnId: "R" });
    expect(stockOf(h.graph, "shirt_m")).toBe(9);
    expect(
      applyCommand(
        h.graph,
        h.command("restockReturn", { returnId: "R" }),
        h.context,
      ),
    ).toMatchObject({ ok: false, code: "transition" });
    expect(
      applyCommand(
        h.graph,
        h.command("requestReturn", {
          id: "duplicate",
          orderId: "A",
          reason: "sizing",
          lines: [{ lineId: h.graph.orders[0]!.lines[0]!.id, units: [0] }],
        }),
        h.context,
      ).ok,
    ).toBe(false);
    const damaged = new Harness();
    damaged.place();
    damaged.step("advanceOrder", { orderId: "A", state: "shipped" });
    damaged.receive("damaged", "A", false, NOW, "damaged");
    expect(
      applyCommand(
        damaged.graph,
        damaged.command("restockReturn", { returnId: "damaged" }),
        damaged.context,
      ),
    ).toMatchObject({ ok: false, code: "transition" });
    expect(damaged.graph.writeoffs).toHaveLength(0);
    expect(stockOf(damaged.graph, "shirt_m")).toBe(8);
  });
  it("bounds merchandise/delivery/tax separately and keeps captured cent remainders", () => {
    const h = new Harness(),
      input = product("goods", 101, 24);
    h.step("createProduct", input);
    h.place("odd", "goods_m", 3, 203, NOW);
    const order = h.graph.orders[0]!,
      line = order.lines[0]!;
    expect(line.unitNet).toEqual([34, 33, 33]);
    h.step("issueRefund", {
      id: "first",
      orderId: "odd",
      lines: [{ lineId: line.id, amount: 34 }],
      delivery: 600,
      tax: 0,
    });
    expect(refundable(h.graph, "odd")).toEqual({
      lines: [{ lineId: line.id, amount: 66 }],
      delivery: 0,
      tax: 0,
    });
    expect(
      applyCommand(
        h.graph,
        h.command("issueRefund", {
          id: "over",
          orderId: "odd",
          lines: [{ lineId: line.id, amount: 67 }],
          delivery: 0,
          tax: 0,
        }),
        h.context,
      ),
    ).toMatchObject({ ok: false, code: "refund-limit" });
    expect(
      applyCommand(
        h.graph,
        h.command("issueRefund", {
          id: "shipping_twice",
          orderId: "odd",
          lines: [],
          delivery: 1,
          tax: 0,
        }),
        h.context,
      ),
    ).toMatchObject({ ok: false, code: "refund-limit" });
    h.step("issueRefund", {
      id: "remaining",
      orderId: "odd",
      lines: [{ lineId: line.id, amount: 66 }],
      delivery: 0,
      tax: 0,
    });
    expect(stockOf(h.graph, "goods_m")).toBe(7);
  });
});
describe("immutable expenses and bounded reasoned loss", () => {
  it("keeps drafts without finance effect and appends corrections/voids", () => {
    const h = new Harness();
    h.step("saveExpenseDraft", {
      id: "marketing",
      category: "marketing",
      amount: 1000,
      note: "Demo campaign",
    });
    expect(h.graph.expenses).toEqual([]);
    h.step("postExpense", { draftId: "marketing" });
    const original = h.graph.expenses[0]!;
    h.step("correctExpense", {
      id: "correction",
      expenseId: "marketing",
      amount: -200,
      note: "Revised demo bill",
    });
    h.step("voidExpense", {
      id: "void",
      expenseId: "marketing",
      note: "Reviewed void",
    });
    expect(h.graph.expenses.map((item) => item.amount)).toEqual([
      1000, -200, -800,
    ]);
    expect(h.graph.expenses[0]).toEqual(original);
    expect(
      applyCommand(
        h.graph,
        h.command("correctExpense", {
          id: "late",
          expenseId: "marketing",
          amount: 1,
          note: "",
        }),
        h.context,
      ),
    ).toMatchObject({ ok: false, code: "transition" });
    expect(
      applyCommand(
        h.graph,
        {
          ...h.command("saveExpenseDraft", {
            id: "inventory",
            category: "operations",
            amount: 1000,
            note: "",
          }),
          payload: {
            id: "inventory",
            category: "inventory",
            amount: 1000,
            note: "",
          },
        },
        h.context,
      ).ok,
    ).toBe(false);
  });
  it("captures future cost, cannot write off unavailable units, and preserves correction history", () => {
    const h = new Harness();
    h.place();
    h.step("setUnitCost", { variantId: "shirt_m", cost: 3000 });
    expect(h.graph.orders[0]!.lines[0]!.unitCost).toBe(2400);
    h.step("writeoffStock", {
      id: "warehouse",
      variantId: "shirt_m",
      quantity: 1,
      reason: "Available warehouse damage",
    });
    expect(h.graph.writeoffs[0]!.unitCost).toBe(3000);
    expect(stockOf(h.graph, "shirt_m")).toBe(7);
    expect(
      applyCommand(
        h.graph,
        h.command("writeoffStock", {
          id: "too_many",
          variantId: "shirt_m",
          quantity: 8,
          reason: "Damage",
        }),
        h.context,
      ),
    ).toMatchObject({ ok: false, code: "stock" });
    h.step("adjustStock", {
      variantId: "shirt_m",
      units: 1,
      kind: "correction",
      reason: "Correcting counted available stock",
    });
    expect(
      h.graph.movements.filter((item) => item.kind === "writeoff"),
    ).toHaveLength(1);
    expect(stockOf(h.graph, "shirt_m")).toBe(8);
  });
});
describe("review fencing, replay and latest eligible Undo", () => {
  it("rejects changed payload identity, stale revisions/identities/expiry and preserves input", () => {
    const h = new Harness();
    const { command } = h.step("setBagLine", {
      variantId: "shirt_m",
      quantity: 1,
    });
    expect(applyCommand(h.graph, command, h.context)).toMatchObject({
      ok: true,
      replayed: true,
    });
    expect(
      applyCommand(
        h.graph,
        { ...command, payload: { variantId: "shirt_m", quantity: 2 } },
        h.context,
      ),
    ).toMatchObject({ ok: false, code: "replay" });
    expect(
      applyCommand(
        h.graph,
        {
          ...h.command("setBagLine", { variantId: "shirt_m", quantity: 1 }),
          expectedRevision: 0,
        },
        h.context,
      ),
    ).toMatchObject({ ok: false, code: "stale" });
    expect(
      applyCommand(h.graph, { ...command, workspaceId: "old" }, h.context),
    ).toMatchObject({ ok: false, code: "stale" });
    expect(
      applyCommand(
        h.graph,
        h.command(
          "setBagLine",
          { variantId: "shirt_m", quantity: 1 },
          { expiresAt: NOW },
        ),
        h.context,
      ),
    ).toMatchObject({ ok: false, code: "expired" });
    expect(
      applyCommand(
        h.graph,
        h.command("setBagLine", { variantId: "shirt_m", quantity: 1 }),
        { ...h.context, now: h.graph.expiresAt },
      ),
    ).toMatchObject({ ok: false, code: "expired" });
  });
  it("Undo makes a new revision and never erases financial history", () => {
    const h = new Harness();
    const { result } = h.step("setBagLine", {
        variantId: "shirt_m",
        quantity: 1,
      }),
      revision = h.graph.revision;
    h.step("undo", { receiptId: result.receipt.id });
    expect(h.graph.bag).toEqual([]);
    expect(h.graph.revision).toBe(revision + 1);
    expect(
      applyCommand(
        h.graph,
        h.command("undo", { receiptId: result.receipt.id }),
        h.context,
      ),
    ).toMatchObject({ ok: false, code: "undo" });
    h.place();
    const last = h.graph.receipts.at(-1)!;
    expect(
      applyCommand(
        h.graph,
        h.command("undo", { receiptId: last.id }),
        h.context,
      ),
    ).toMatchObject({ ok: false, code: "undo" });
    expect(h.graph.orders).toHaveLength(1);
  });
  it("Undo restores copy and unposted drafts, but a later command invalidates eligibility", () => {
    const h = new Harness(),
      input = { ...product("shirt"), productId: "shirt", title: "Edited" };
    const copy = {
      productId: input.productId,
      title: input.title,
      description: input.description,
      category: input.category,
      imageIds: input.imageIds,
      sizingSystemId: input.sizingSystemId,
      attributes: input.attributes,
    };
    const { result } = h.step("updateProductCopy", copy);
    h.step("undo", { receiptId: result.receipt.id });
    expect(h.graph.products[0]!.title).toBe("Cream shirt");
    const saved = h.step("saveExpenseDraft", {
      id: "draft",
      category: "operations",
      amount: 300,
      note: "",
    });
    h.step("undo", { receiptId: saved.result.receipt.id });
    expect(h.graph.expenseDrafts).toEqual([]);
    const bag = h.step("setBagLine", { variantId: "shirt_m", quantity: 1 });
    h.step("setUnitCost", { variantId: "shirt_m", cost: 2000 });
    expect(
      applyCommand(
        h.graph,
        h.command("undo", { receiptId: bag.result.receipt.id }),
        h.context,
      ),
    ).toMatchObject({ ok: false, code: "undo" });
  });
  it("previews actual edited values without mutation and returns frozen valid graphs", () => {
    const h = new Harness(),
      before = JSON.stringify(h.graph),
      command = h.command("setBagLine", { variantId: "shirt_m", quantity: 2 });
    const preview = previewCommand(h.graph, command, h.context);
    expect(preview).toMatchObject({
      ok: true,
      effect: { netSales: 0, stock: [] },
    });
    expect(JSON.stringify(h.graph)).toBe(before);
    const result = applyCommand(h.graph, command, h.context);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.isFrozen(result.graph.products[0]!.variants)).toBe(true);
      expect(parseGraph(result.graph)).toEqual(result.graph);
    }
  });
  it("fails clearly at 160 receipts without evicting replay protection", () => {
    const h = new Harness();
    h.step("addTraffic", {
      sessions: [
        {
          id: "visit",
          actor: "owner",
          origin: "guest_action",
          startedAt: NOW,
          lastAt: NOW,
          productIds: [],
        },
      ],
    });
    let first: unknown;
    while (h.graph.receipts.length < 160) {
      const { command } = h.step("touchTraffic", {
        sessionId: "visit",
        stage: "visit",
      });
      first ??= command;
    }
    const before = JSON.stringify(h.graph);
    expect(
      applyCommand(
        h.graph,
        h.command("touchTraffic", { sessionId: "visit", stage: "visit" }),
        h.context,
      ),
    ).toMatchObject({ ok: false, code: "limit" });
    expect(applyCommand(h.graph, first, h.context)).toMatchObject({
      ok: true,
      replayed: true,
    });
    expect(JSON.stringify(h.graph)).toBe(before);
  });
  it("rejects corrupt graphs instead of repairing ledger history silently", () => {
    const h = new Harness();
    h.place();
    expect(() => parseGraph({ ...h.graph, movements: [] })).toThrow();
    expect(() =>
      parseGraph({
        ...h.graph,
        orders: h.graph.orders.map((order) => ({ ...order, total: 1 })),
      }),
    ).toThrow();
    expect(
      applyCommand(
        h.graph,
        h.command(
          "adjustStock",
          {
            variantId: "shirt_m",
            units: -10,
            kind: "correction",
            reason: "Would oversell history",
          },
          { at: ANCHOR, origin: "seeded_scenario" },
        ),
        h.context,
      ).ok,
    ).toBe(false);
  });
});
