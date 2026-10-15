import { afterEach, describe, expect, it } from "vitest";
import { environment, file } from "../../../test/workspace";
import { generateScenario } from "@retailor/commerce/scenarios";
import { facts, allActivityScope } from "@retailor/commerce/facts";
import { storeItems } from "../storefront/browse";
import { stockOf } from "@retailor/commerce/selectors";
import { SESSION_KEY } from "../session/projection";
const environments: ReturnType<typeof environment>[] = [];
afterEach(() => environments.splice(0).forEach((env) => env.dispose()));
async function setup(realScenario = false) {
  const env = environment();
  environments.push(env);
  const controller = await env.open(
    realScenario ? { scenarioFactory: generateScenario } : {},
  );
  await controller.photos.add([file("one"), file("two")]);
  await controller.draftCatalogue();
  controller.publish();
  controller.useCurrentLook();
  controller.keepWordmark();
  controller.acceptDesign();
  controller.go("dashboard");
  return { env, controller };
}
function apply(controller: Awaited<ReturnType<typeof setup>>["controller"]) {
  controller.reviewOwnerOperation();
  const review = controller.getSnapshot().ownerReview;
  expect(review, controller.getSnapshot().ownerNotice).not.toBeNull();
  if (review) controller.confirmOwnerOperation(review);
  return review;
}
describe("reviewed owner forms and atomic scenario identity", () => {
  it("keeps expense filters bounded and ephemeral, and gracefully retires saved visits navigation without losing records", async () => {
    const { env, controller } = await setup(true);
    const graph = controller.getSnapshot().state.graph;
    controller.setOwnerExpenseFilters({
      month: "2026-10",
      category: "marketing",
      sort: "oldest",
    });
    const filters = controller.getSnapshot().ownerExpenseFilters;
    controller.setOwnerExpenseFilters({ month: "2026-99" });
    expect(controller.getSnapshot().ownerExpenseFilters).toBe(filters);
    controller.ownerNavigate("traffic");
    expect(controller.getSnapshot().state.ownerView).toBe("overview");
    expect(controller.getSnapshot().state.graph).toBe(graph);
    const raw = JSON.parse(env.storage.getItem(SESSION_KEY)!);
    raw.ownerView = "traffic";
    env.storage.setItem(SESSION_KEY, JSON.stringify(raw));
    controller.dispose();
    const restored = await env.open();
    expect(restored.getSnapshot().state.ownerView).toBe("overview");
    expect(restored.getSnapshot().state.graph.traffic).toEqual(graph.traffic);
    expect(restored.getSnapshot().state.graph.buyers).toEqual(graph.buyers);
    expect(restored.getSnapshot().ownerExpenseFilters).toEqual({
      month: "",
      category: "all",
      sort: "newest",
    });
    restored.setOwnerExpenseFilters({ month: "2026-09" });
    await restored.reset();
    expect(restored.getSnapshot().ownerExpenseFilters.month).toBe("");
  });
  it("saves an expense only after explicit review, reports the operation and retains immutable posted history", async () => {
    const { controller } = await setup();
    const before = controller.getSnapshot().state.graph;
    controller.openOwnerOperation("saveExpenseDraft");
    controller.editOwnerField("amount", "12.34");
    controller.editOwnerField("note", "Packaging supplies");
    controller.reviewOwnerOperation();
    expect(controller.getSnapshot().state.graph).toBe(before);
    expect(controller.getSnapshot().ownerReview?.command.payload).toMatchObject(
      { amount: 1234, note: "Packaging supplies" },
    );
    controller.closeOwnerOperation();
    expect(controller.getSnapshot().state.graph).toBe(before);
    controller.openOwnerOperation("saveExpenseDraft");
    controller.editOwnerField("amount", "12.34");
    const review = apply(controller)!;
    expect(controller.getSnapshot()).toMatchObject({
      ownerForm: null,
      ownerNotice: "Expense draft saved.",
      ownerNoticeTone: "success",
    });
    const saved = controller.getSnapshot().state.graph;
    controller.confirmOwnerOperation(review);
    expect(controller.getSnapshot().state.graph).toBe(saved);
    controller.ownerNavigate("expenses");
    expect(controller.getSnapshot().ownerNotice).toBe("");
    expect(controller.getSnapshot().state.graph).toBe(saved);
    controller.dismissOwnerNotice();
    expect(controller.getSnapshot().ownerNotice).toBe("");
  });
  it("identifies the missing stock reason, preserves unrelated edits and reviews only after correction", async () => {
    const { controller } = await setup();
    const graph = controller.getSnapshot().state.graph;
    const variant = graph.products[0]!.variants[0]!;
    controller.openOwnerOperation("adjustStock", variant.id);
    controller.reviewOwnerOperation();
    expect(controller.getSnapshot()).toMatchObject({
      ownerReview: null,
      ownerNoticeTone: "error",
      ownerIssues: [
        {
          field: "reason",
          label: "Explain this change",
          message: "Explain this change: this field is required.",
        },
      ],
    });
    expect(controller.getSnapshot().state.graph).toBe(graph);
    controller.editOwnerField("units", "2");
    expect(controller.getSnapshot().ownerIssues[0]?.field).toBe("reason");
    expect(controller.getSnapshot().ownerNoticeTone).toBe("info");
    controller.moveOwnerForm("tailor");
    expect(controller.getSnapshot().ownerIssues[0]?.field).toBe("reason");
    controller.editOwnerField("reason", "Counted remaining stock");
    expect(controller.getSnapshot().ownerIssues).toEqual([]);
    controller.reviewOwnerOperation();
    expect(controller.getSnapshot().ownerReview?.command).toMatchObject({
      type: "adjustStock",
      payload: { units: 2, reason: "Counted remaining stock" },
    });
    expect(controller.getSnapshot().ownerNoticeTone).toBe("info");
    expect(controller.getSnapshot().state.graph).toBe(graph);
    controller.closeOwnerOperation();
    expect(controller.getSnapshot().ownerIssues).toEqual([]);
  });
  it("identifies a malformed variant price without changing the product and clears validation on reset", async () => {
    const { controller } = await setup();
    const graph = controller.getSnapshot().state.graph;
    controller.openOwnerOperation("updateProduct", graph.products[0]!.id);
    const rows = controller.getSnapshot().ownerForm!.variants;
    controller.editOwnerRows(
      "variants",
      rows.map((row, i) => (i ? row : { ...row, price: "12.345" })),
    );
    controller.reviewOwnerOperation();
    expect(controller.getSnapshot().ownerIssues).toMatchObject([
      {
        field: "variants.0.price",
        message: expect.stringContaining("two decimal places"),
      },
    ]);
    expect(controller.getSnapshot().ownerReview).toBeNull();
    expect(controller.getSnapshot().state.graph).toBe(graph);
    await controller.reset();
    expect(controller.getSnapshot().ownerIssues).toEqual([]);
    expect(controller.getSnapshot().ownerNoticeTone).toBe("info");
  });
  it("keeps the other row error when only one invalid variant field is corrected", async () => {
    const { controller } = await setup();
    controller.openOwnerOperation(
      "updateProduct",
      controller.getSnapshot().state.graph.products[0]!.id,
    );
    controller.editOwnerRows(
      "variants",
      controller
        .getSnapshot()
        .ownerForm!.variants.map((row, i) =>
          i ? row : { ...row, size: "", colour: "" },
        ),
    );
    controller.reviewOwnerOperation();
    expect(
      controller.getSnapshot().ownerIssues.map((issue) => issue.field),
    ).toEqual(expect.arrayContaining(["variants.0.size", "variants.0.colour"]));
    controller.editOwnerRows(
      "variants",
      controller
        .getSnapshot()
        .ownerForm!.variants.map((row, i) => (i ? row : { ...row, size: "M" })),
    );
    expect(
      controller.getSnapshot().ownerIssues.map((issue) => issue.field),
    ).toEqual(["variants.0.colour"]);
  });
  it("adds the next owner size from current edits, applies new stock once and preserves original identities", async () => {
    const { controller } = await setup();
    const product = controller.getSnapshot().state.graph.products[0]!;
    controller.openOwnerOperation("updateProduct", product.id);
    const form = controller.getSnapshot().ownerForm!;
    controller.editOwnerRows(
      "variants",
      form.variants.map((row, i) =>
        i === form.variants.length - 1
          ? { ...row, price: "71.05", cost: "31.61", stock: row.stock }
          : row,
      ),
    );
    const before = controller.getSnapshot().state.graph;
    const id = controller.addOwnerVariant()!;
    const next = controller.getSnapshot().ownerForm!.variants.at(-1)!;
    expect(next).toMatchObject({
      id,
      size: "34/32",
      colour: form.variants.at(-1)!.colour,
      price: "71.05",
      cost: "31.61",
      stock: form.variants.at(-1)!.stock,
    });
    expect(controller.getSnapshot().state.graph).toBe(before);
    const review = apply(controller)!;
    const graph = controller.getSnapshot().state.graph;
    const changed = graph.products.find((row) => row.id === product.id)!;
    expect(
      changed.variants.slice(0, product.variants.length).map((row) => row.id),
    ).toEqual(product.variants.map((row) => row.id));
    expect(changed.variants.at(-1)).toMatchObject({
      id,
      price: 7105,
      unitCost: 3161,
      openingStock: Number(next.stock),
    });
    expect(stockOf(graph, id)).toBe(Number(next.stock));
    controller.confirmOwnerOperation(review);
    expect(controller.getSnapshot().state.graph).toBe(graph);
  });
  it("keeps unknown sizes editable, does not overwrite original stock and stops at 24 owner options", async () => {
    const { controller } = await setup();
    const product = controller.getSnapshot().state.graph.products[0]!;
    controller.openOwnerOperation("updateProduct", product.id);
    controller.editOwnerField("sizingSystemId", "one-size-demo");
    controller.addOwnerVariant();
    expect(controller.getSnapshot().ownerForm!.variants.at(-1)!.size).toBe("");
    controller.reviewOwnerOperation();
    expect(controller.getSnapshot().ownerReview).toBeNull();
    expect(controller.getSnapshot().state.graph.products[0]).toEqual(product);
    for (let i = 0; i < 30; i++) controller.addOwnerVariant();
    expect(controller.getSnapshot().ownerForm!.variants).toHaveLength(24);
    expect(controller.addOwnerVariant()).toBeUndefined();
    expect(
      controller
        .getSnapshot()
        .ownerForm!.variants.slice(0, product.variants.length)
        .map((row) => row.id),
    ).toEqual(product.variants.map((row) => row.id));
  });
  it("requires a validated real photo, preserves dirty human fields and publishes the same new garment", async () => {
    const { controller } = await setup();
    controller.openOwnerOperation("createProduct");
    const form = controller.getSnapshot().ownerForm!;
    controller.editOwnerField("title", "New jacket");
    controller.editOwnerField("category", "jackets");
    controller.reviewOwnerOperation();
    expect(controller.getSnapshot().ownerReview).toBeNull();
    controller.editOwnerField(
      "title",
      "Late suggestion",
      "suggestion",
      form.id,
    );
    expect(controller.getSnapshot().ownerForm!.fields.title).toBe("New jacket");
    await controller.uploadOwnerPhoto(file("new-jacket-photo"));
    expect(controller.getSnapshot().ownerForm!.photoIds).toHaveLength(1);
    const review = apply(controller)!;
    const created = controller
      .getSnapshot()
      .state.graph.products.find((p) => p.id === form.targetId)!;
    expect(created).toMatchObject({ title: "New jacket", category: "jackets" });
    expect(controller.photos.availableIds().has(created.imageIds[0]!)).toBe(
      true,
    );
    const graph = controller.getSnapshot().state.graph;
    controller.confirmOwnerOperation(review);
    expect(controller.getSnapshot().state.graph).toBe(graph);
    controller.go("storefront");
    expect(
      controller
        .getSnapshot()
        .state.graph.products.some((p) => p.id === created.id),
    ).toBe(true);
  });
  it("keeps excessive delivered draft amounts editable before rendering or applying a review", async () => {
    const { controller } = await setup();
    const v = controller.getSnapshot().state.graph.products[0]!.variants[0]!;
    controller.openOwnerOperation("saveOrderDraft");
    controller.editOwnerRows("lines", [{ variantId: v.id, quantity: "1" }]);
    controller.editOwnerField("delivery", "9000000.00");
    controller.editOwnerField("tax", "9000000.00");
    controller.reviewOwnerOperation();
    expect(controller.getSnapshot().ownerReview).toBeNull();
    expect(controller.getSnapshot().state.graph.orderDrafts).toHaveLength(0);
    controller.editOwnerField("delivery", "6.00");
    controller.editOwnerField("tax", "0.00");
    apply(controller);
    expect(controller.getSnapshot().state.graph.orderDrafts).toHaveLength(1);
  });
  it("marks a multi-photo product unavailable when a required alternate is lost and reports failed bag adds", async () => {
    const { controller } = await setup();
    const [p, second] = controller.getSnapshot().state.graph.products;
    controller.openOwnerOperation("updateProduct", p!.id);
    controller.editOwnerRows("photoIds", [...p!.imageIds, ...second!.imageIds]);
    apply(controller);
    controller.go("storefront");
    controller.photos.reportUnavailable(second!.imageIds[0]!);
    const item = storeItems(
      controller.getSnapshot().state.graph,
      controller.photos.availableIds(),
    ).find((item) => item.product.id === p!.id)!;
    expect(item.available).toBe(false);
    controller.addToBag(p!.id, p!.variants[0]!.id, 1);
    expect(controller.getSnapshot().bagOpen).toBe(true);
    expect(controller.getSnapshot().bagNotice).toContain("photo");
    expect(controller.getSnapshot().state.graph.bag).toHaveLength(0);
  });
  it("preserves dirty raw fields across store/owner switching and keeps only the latest unposted Undo executable", async () => {
    const { controller } = await setup();
    controller.openOwnerOperation("saveExpenseDraft");
    controller.editOwnerField("amount", "12.50");
    controller.editOwnerField("note", "Human draft");
    const form = controller.getSnapshot().ownerForm;
    controller.go("storefront");
    controller.go("dashboard");
    expect(controller.getSnapshot().ownerForm).toBe(form);
    expect(controller.getSnapshot().ownerReview).toBeNull();
    apply(controller);
    const receipt = controller.getSnapshot().state.graph.receipts.at(-1)!;
    controller.openOwnerOperation("undo", receipt.id);
    apply(controller);
    expect(controller.getSnapshot().state.graph.expenseDrafts).toHaveLength(0);
    controller.openOwnerOperation("undo", receipt.id);
    controller.reviewOwnerOperation();
    expect(controller.getSnapshot().ownerReview).toBeNull();
  });
  it("drafts without sale effects, places an owner order once and preserves historical cost after later changes", async () => {
    const { controller } = await setup();
    const variant =
        controller.getSnapshot().state.graph.products[0]!.variants[0]!,
      before = stockOf(controller.getSnapshot().state.graph, variant.id);
    controller.openOwnerOperation("saveOrderDraft");
    controller.editOwnerRows("lines", [
      { variantId: variant.id, quantity: "2" },
    ]);
    apply(controller);
    const draft = controller.getSnapshot().state.graph.orderDrafts[0]!;
    expect(controller.getSnapshot().state.graph.orders).toHaveLength(0);
    expect(stockOf(controller.getSnapshot().state.graph, variant.id)).toBe(
      before,
    );
    controller.openOwnerOperation("placeOrder", draft.id);
    const review = apply(controller)!;
    const graph = controller.getSnapshot().state.graph,
      order = graph.orders[0]!;
    expect(order.actor).toBe("owner");
    expect(order.trafficId).toBeUndefined();
    expect(stockOf(graph, variant.id)).toBe(before - 2);
    expect(controller.getSnapshot().state.orderDisplays).toMatchObject([
      { orderId: order.id, scope: { currency: "USD", snapshot: null } },
    ]);
    controller.confirmOwnerOperation(review);
    expect(controller.getSnapshot().state.graph.orders).toHaveLength(1);
    controller.openOwnerOperation("setUnitCost", variant.id);
    controller.editOwnerField("cost", "99.00");
    apply(controller);
    expect(
      controller.getSnapshot().state.graph.orders[0]!.lines[0]!.unitCost,
    ).toBe(variant.unitCost);
    controller.openOwnerOperation("advanceOrder", order.id);
    apply(controller);
    expect(stockOf(controller.getSnapshot().state.graph, variant.id)).toBe(
      before - 2,
    );
    controller.openOwnerOperation("advanceOrder", order.id);
    apply(controller);
    expect(controller.getSnapshot().state.graph.orders[0]!.state).toBe(
      "fulfilled",
    );
  });
  it("archives and restores a linked product without rewriting order snapshots, and fences late row suggestions", async () => {
    const { controller } = await setup();
    const p = controller.getSnapshot().state.graph.products[0]!,
      v = p.variants[0]!;
    controller.openOwnerOperation("saveOrderDraft");
    controller.editOwnerRows("lines", [{ variantId: v.id, quantity: "1" }]);
    apply(controller);
    controller.openOwnerOperation(
      "placeOrder",
      controller.getSnapshot().state.graph.orderDrafts[0]!.id,
    );
    apply(controller);
    const order = controller.getSnapshot().state.graph.orders[0]!;
    controller.openOwnerOperation("updateProduct", p.id);
    const form = controller.getSnapshot().ownerForm!;
    controller.editOwnerRows(
      "variants",
      form.variants.map((row) => ({ ...row, price: "70.00" })),
    );
    controller.editOwnerRows("variants", form.variants, "suggestion", form.id);
    expect(controller.getSnapshot().ownerForm!.variants[0]!.price).toBe(
      "70.00",
    );
    controller.editOwnerField("productState", "archived");
    apply(controller);
    expect(controller.getSnapshot().state.graph.products[0]!.archived).toBe(
      true,
    );
    controller.openOwnerOperation("updateProduct", p.id);
    controller.editOwnerField("productState", "active");
    apply(controller);
    expect(controller.getSnapshot().state.graph.products[0]!.archived).toBe(
      false,
    );
    expect(controller.getSnapshot().state.graph.orders[0]).toEqual(order);
  });
  it("uses independent received/restock and refund effects through the real typed forms", async () => {
    const { controller } = await setup();
    const variant =
      controller.getSnapshot().state.graph.products[0]!.variants[0]!;
    controller.openOwnerOperation("saveOrderDraft");
    controller.editOwnerRows("lines", [
      { variantId: variant.id, quantity: "1" },
    ]);
    apply(controller);
    controller.openOwnerOperation(
      "placeOrder",
      controller.getSnapshot().state.graph.orderDrafts[0]!.id,
    );
    apply(controller);
    const order = controller.getSnapshot().state.graph.orders[0]!,
      line = order.lines[0]!;
    controller.openOwnerOperation("advanceOrder", order.id);
    apply(controller);
    controller.openOwnerOperation("requestReturn", order.id);
    controller.editOwnerField("reason", "sizing");
    controller.editOwnerRows("unitsSelection", [
      { lineId: line.id, units: [0] },
    ]);
    apply(controller);
    const returned = controller.getSnapshot().state.graph.returns[0]!;
    controller.openOwnerOperation("advanceReturn", returned.id);
    apply(controller);
    controller.openOwnerOperation("receiveReturn", returned.id);
    controller.editOwnerRows("unitsSelection", [
      { lineId: line.id, units: [0] },
    ]);
    apply(controller);
    expect(controller.getSnapshot().state.graph.refunds).toHaveLength(0);
    const stock = stockOf(controller.getSnapshot().state.graph, variant.id);
    controller.openOwnerOperation("issueRefund", order.id);
    controller.editOwnerRows("refunds", [
      { lineId: line.id, amount: (line.unitNet[0]! / 100).toFixed(2) },
    ]);
    apply(controller);
    expect(stockOf(controller.getSnapshot().state.graph, variant.id)).toBe(
      stock,
    );
    controller.openOwnerOperation("restockReturn", returned.id);
    apply(controller);
    expect(stockOf(controller.getSnapshot().state.graph, variant.id)).toBe(
      stock + 1,
    );
    const metrics = facts(
      controller.getSnapshot().state.graph,
      allActivityScope(controller.getSnapshot().state.graph),
    );
    expect(metrics.find((f) => f.factId === "sold_cost")!.numerator).toBe(0);
  });
  it("previews/cancels without changes, fences stale confirmations and replaces only business activity", async () => {
    const { controller } = await setup(true);
    const state = controller.getSnapshot().state;
    expect(state.scenario?.preset).toBe("healthy");
    expect(state.graph.orders).toHaveLength(14);
    controller.prepareScenario("loss");
    const preview = controller.getSnapshot().scenarioReview!;
    expect(controller.getSnapshot().state).toBe(state);
    controller.cancelScenario();
    expect(controller.getSnapshot().state).toBe(state);
    controller.prepareScenario("loss");
    const next = controller.getSnapshot().scenarioReview!;
    controller.openOwnerOperation("saveExpenseDraft");
    controller.editOwnerField("amount", "12.50");
    apply(controller);
    controller.confirmScenario(next);
    expect(controller.getSnapshot().state.graph.scenarioId).toBe(
      state.graph.scenarioId,
    );
    controller.prepareScenario("loss");
    const current = controller.getSnapshot().scenarioReview!;
    controller.confirmScenario(current);
    const replaced = controller.getSnapshot().state;
    expect(replaced.graph.scenarioId).not.toBe(state.graph.scenarioId);
    expect(replaced.graph.workspaceId).toBe(state.graph.workspaceId);
    expect(replaced.graph.photos).toEqual(state.graph.photos);
    expect(replaced.acceptedDesign).toBe(state.acceptedDesign);
    expect(replaced.scenario?.preset).toBe("loss");
    expect(replaced.graph.orders).toHaveLength(6);
    expect(replaced.shopping.lastOrderId).toBeNull();
    expect(controller.getSnapshot().ownerForm).toBeNull();
    controller.confirmScenario(preview);
    expect(controller.getSnapshot().state).toBe(replaced);
  });
  it("keeps an empty accepted store recoverable and never revives a stale raw form on refresh", async () => {
    const { env, controller } = await setup();
    for (const product of controller.getSnapshot().state.graph.products) {
      controller.openOwnerOperation("removeProduct", product.id);
      apply(controller);
    }
    expect(controller.getSnapshot().state.graph.products).toHaveLength(0);
    controller.openOwnerOperation("createProduct");
    controller.editOwnerField("title", "Unfinished");
    const restored = await env.open();
    expect(restored.getSnapshot().state.stage).toBe("dashboard");
    expect(restored.getSnapshot().state.graph.products).toHaveLength(0);
    expect(restored.getSnapshot().ownerForm).toBeNull();
  });
});
