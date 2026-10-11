import type { CommerceGraph } from "@retailor/contracts/commerce";
import type { CommerceCommand } from "@retailor/contracts/commands";
import type { ProductInput } from "@retailor/contracts/product";
import type { Photo } from "@retailor/contracts/photos";
import { emptyGraph } from "../src/graph.js";
import { applyCommand } from "../src/commands.js";
import type { CommandContext } from "../src/commands.js";
export const NOW = "2026-06-12T18:00:00.000Z",
  ANCHOR = "2026-06-11T00:00:00.000Z",
  DAY1 = "2026-06-11T12:00:00.000Z";
export const SCOPE = {
  from: ANCHOR,
  to: "2026-06-13T00:00:00.000Z",
  asOf: NOW,
};
export function photo(id: string, index = 1): Photo {
  const hash = index.toString(16).padStart(64, "0"),
    descriptor = {
      id,
      hash,
      mime: "image/webp" as const,
      width: 100,
      height: 125,
      bytes: 100,
    };
  return {
    id,
    source: descriptor,
    derivative: {
      ...descriptor,
      hash: (index + 100).toString(16).padStart(64, "0"),
    },
  };
}
export function product(
  id: string,
  price = 5400,
  cost = 2400,
  openingStock = 10,
): ProductInput {
  return {
    id,
    title: id === "shirt" ? "Cream shirt" : "Everyday tee",
    description: "",
    category: id === "shirt" ? "shirts" : "tees",
    imageIds: [`photo_${id}`],
    sizingSystemId: "alpha-demo",
    attributes: [],
    archived: false,
    variants: [
      {
        id: `${id}_m`,
        size: "M",
        colour: "Cream",
        sku: `${id.toUpperCase()}-M`,
        openingStock,
        price,
        unitCost: cost,
        archived: false,
      },
    ],
  };
}
type Payload<T extends CommerceCommand["type"]> = Extract<
  CommerceCommand,
  { type: T }
>["payload"];
export class Harness {
  graph: CommerceGraph = emptyGraph({
    workspaceId: "workspace",
    scenarioId: "scenario",
    createdAt: NOW,
    anchorAt: ANCHOR,
  });
  context: CommandContext = {
    now: NOW,
    availablePhotoIds: new Set(["photo_shirt", "photo_tee", "photo_goods"]),
  };
  private sequence = 0;
  command<T extends CommerceCommand["type"]>(
    type: T,
    payload: Payload<T>,
    overrides: Partial<Omit<CommerceCommand, "type" | "payload">> = {},
  ) {
    return {
      id: `command_${++this.sequence}`,
      workspaceId: this.graph.workspaceId,
      scenarioId: this.graph.scenarioId,
      expectedRevision: this.graph.revision,
      expiresAt: "2026-06-12T18:02:00.000Z",
      at: NOW,
      origin: "guest_action" as const,
      type,
      payload,
      ...overrides,
    };
  }
  step<T extends CommerceCommand["type"]>(
    type: T,
    payload: Payload<T>,
    overrides: Partial<Omit<CommerceCommand, "type" | "payload">> = {},
  ) {
    const command = this.command(type, payload, overrides),
      result = applyCommand(this.graph, command, this.context);
    if (!result.ok)
      throw new Error(`${type}: ${result.code}: ${result.message}`);
    this.graph = result.graph;
    return { command, result };
  }
  constructor() {
    this.step("registerPhotos", {
      photos: [
        photo("photo_shirt"),
        photo("photo_tee", 2),
        photo("photo_goods", 3),
      ],
    });
    this.step("createProduct", product("shirt"), {
      at: ANCHOR,
      origin: "seeded_scenario",
    });
    this.step("createProduct", product("tee", 3800, 1600), {
      at: ANCHOR,
      origin: "seeded_scenario",
    });
  }
  place(
    id = "A",
    variantId = "shirt_m",
    quantity = 2,
    discount = 1000,
    at = DAY1,
  ) {
    this.step(
      "saveOrderDraft",
      {
        id: `draft_${id}`,
        actor: "shopper",
        lines: [{ variantId, quantity }],
        discount,
        delivery: 600,
        tax: 0,
      },
      { at, origin: "seeded_scenario" },
    );
    return this.step(
      "placeOrder",
      { draftId: `draft_${id}`, orderId: id },
      { at, origin: "seeded_scenario" },
    );
  }
  receive(
    id = "R",
    orderId = "A",
    restockable = true,
    at = NOW,
    reason: "sizing" | "damaged" = "sizing",
  ) {
    const line = this.graph.orders.find((order) => order.id === orderId)!
      .lines[0]!;
    this.step(
      "requestReturn",
      { id, orderId, reason, lines: [{ lineId: line.id, units: [0] }] },
      { at, origin: "seeded_scenario" },
    );
    this.step(
      "advanceReturn",
      { returnId: id, state: "approved" },
      { at, origin: "seeded_scenario" },
    );
    return this.step(
      "receiveReturn",
      {
        returnId: id,
        restockable: restockable ? [{ lineId: line.id, units: [0] }] : [],
      },
      { at, origin: "seeded_scenario" },
    );
  }
}
