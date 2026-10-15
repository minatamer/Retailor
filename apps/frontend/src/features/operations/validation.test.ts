import { describe, expect, it } from "vitest";
import { z } from "zod";
import { emptyGraph } from "@retailor/commerce/graph";
import { CommandSchema } from "@retailor/contracts/commands";
import { ProductSchema } from "@retailor/contracts/product";
import { openOwnerForm, ownerIntent } from "./state";
import {
  ownerInputIssues,
  ownerValue,
  requiredProductIssues,
} from "./validation";

const now = "2026-10-15T12:00:00.000Z";
const graph = emptyGraph({
  workspaceId: "workspace",
  scenarioId: "scenario",
  createdAt: now,
});
let serial = 0;
const open = (type: Parameters<typeof openOwnerForm>[1]) =>
  openOwnerForm(graph, type, "target", () => `form_${++serial}`);
function issuesFor(form: ReturnType<typeof open>) {
  try {
    const intent = ownerIntent(form, graph);
    CommandSchema.parse({
      id: "command",
      workspaceId: graph.workspaceId,
      scenarioId: graph.scenarioId,
      expectedRevision: graph.revision,
      expiresAt: "2026-10-15T12:01:00.000Z",
      at: now,
      origin: "guest_action",
      ...intent,
    });
    return [];
  } catch (error) {
    return ownerInputIssues(form, error);
  }
}
describe("safe field-specific owner validation", () => {
  it.each(["", "   "])(
    "treats a blank stock explanation as the actual required field (%j)",
    (reason) => {
      const form = open("adjustStock");
      form.fields.variantId = "variant";
      form.fields.reason = reason;
      expect(issuesFor(form)).toMatchObject([
        { field: "reason", label: "Explain this change" },
      ]);
    },
  );
  it("keeps signed-unit domain bounds and exact money parsing authoritative", () => {
    const form = open("adjustStock");
    form.fields.reason = "Count correction";
    form.fields.variantId = "variant";
    for (const value of ["1.5", "0", "10001"]) {
      form.fields.units = value;
      expect(issuesFor(form)[0]?.field).toBe("units");
    }
    form.fields.units = "-2";
    expect(issuesFor(form)).toEqual([]);
    const cost = open("setUnitCost");
    cost.fields.variantId = "variant";
    cost.fields.cost = "10.123";
    expect(issuesFor(cost)[0]?.field).toBe("cost");
    cost.fields.cost = "10.23";
    expect(ownerIntent(cost, graph)).toMatchObject({ payload: { cost: 1023 } });
  });
  it("maps aggregate missing choices and row errors to their real control paths", () => {
    const form = open("createProduct");
    form.fields.title = "Shirt";
    form.photoIds = ["photo"];
    form.variants[0]!.size = "";
    form.variants[0]!.colour = "";
    expect(issuesFor(form).map((i) => i.field)).toEqual(
      expect.arrayContaining(["variants.0.size", "variants.0.colour"]),
    );
    const order = open("saveOrderDraft");
    expect(issuesFor(order)[0]?.field).toBe("lines");
    order.lines = [{ variantId: "variant", quantity: "6" }];
    expect(issuesFor(order)[0]?.field).toBe("lines.0.quantity");
  });
  it("requires available photo bytes even for a named product", () => {
    const form = open("createProduct");
    form.fields.title = "Shirt";
    form.photoIds = ["lost"];
    expect(requiredProductIssues(form, new Set())[0]?.field).toBe("photoIds");
    expect(requiredProductIssues(form, new Set(["lost"]))).toEqual([]);
  });
  it("identifies missing fields before linked-colour checks and names an inconsistent colour edit", () => {
    const product = ProductSchema.parse({
      id: "linked",
      title: "Shirt",
      description: "",
      category: "shirts",
      imageIds: ["photo"],
      colourPhotos: [{ colour: "Blue", photoIds: ["photo"] }],
      sizingSystemId: "alpha-demo",
      attributes: [],
      archived: false,
      variants: ["S", "M"].map((size, i) => ({
        id: `variant_${i}`,
        size,
        colour: "Blue",
        sku: `SKU-${i}`,
        price: 1000,
        unitCost: 500,
        openingStock: 2,
        openedAt: now,
        archived: false,
      })),
    });
    const linked = { ...graph, products: [product] };
    const form = openOwnerForm(
      linked,
      "updateProduct",
      product.id,
      () => "linked_form",
    );
    const check = () => {
      try {
        ownerIntent(form, linked);
        return [];
      } catch (error) {
        return ownerInputIssues(form, error);
      }
    };
    form.variants[0]!.size = "";
    form.variants[0]!.colour = "";
    expect(check().map((issue) => issue.field)).toEqual(
      expect.arrayContaining(["variants.0.size", "variants.0.colour"]),
    );
    form.variants[0]!.size = "S";
    form.variants[0]!.colour = "Navy";
    expect(check()).toMatchObject([
      {
        field: "variants.0.colour",
        message: expect.stringContaining("same colour name"),
      },
    ]);
    form.variants[1]!.colour = "Navy";
    expect(check()).toEqual([]);
    expect(ownerIntent(form, linked)).toMatchObject({
      payload: { colourPhotos: [{ colour: "Navy", photoIds: ["photo"] }] },
    });
    expect(product.variants[0]!.colour).toBe("Blue");
  });
  it("maps a submitted refund row back across omitted zero-valued rows", () => {
    const form = open("issueRefund");
    form.refunds = [
      { lineId: "first", amount: "0.00" },
      { lineId: "second", amount: "1.00" },
    ];
    const error = new z.ZodError([
      {
        code: "custom",
        path: ["payload", "lines", 0, "amount"],
        message: "private",
      },
    ]);
    expect(ownerInputIssues(form, error)[0]?.field).toBe("refunds.1.amount");
  });
  it("does not expose arbitrary exceptions or schema prose, and bounds error output", () => {
    const form = open("adjustStock"),
      marker = "PRIVATE_PROVIDER_MARKER";
    expect(ownerInputIssues(form, new Error(marker))).toEqual([]);
    const error = new z.ZodError([
      { code: "custom", path: ["payload", "reason"], message: marker },
      { code: "custom", path: ["payload", "__proto__"], message: marker },
    ]);
    expect(JSON.stringify(ownerInputIssues(form, error))).not.toContain(marker);
    expect(ownerInputIssues(form, error)).toHaveLength(1);
    expect(() =>
      ownerValue(
        form,
        "units",
        () => {
          throw new Error(marker);
        },
        "integer",
      ),
    ).not.toThrow(marker);
    const product = open("createProduct");
    product.variants = Array.from({ length: 24 }, (_, i) => ({
      ...product.variants[0]!,
      id: `v${i}`,
    }));
    const many = new z.ZodError(
      product.variants.flatMap((_, i) =>
        ["size", "colour", "sku"].map((key) => ({
          code: "custom" as const,
          path: ["variants", i, key],
          message: marker,
        })),
      ),
    );
    expect(ownerInputIssues(product, many)).toHaveLength(24);
  });
});
