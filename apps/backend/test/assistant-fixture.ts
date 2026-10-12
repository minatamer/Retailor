import type { AssistantPayload } from "@retailor/contracts/assistant";
import { emptyGraph } from "@retailor/commerce/graph";
import { applyCommand } from "@retailor/commerce/commands";
import { allActivityScope } from "@retailor/commerce/facts";
export const ASSISTANT_NOW = "2026-10-12T12:00:00.000Z";
export function assistantFixture(
  role: AssistantPayload["context"]["role"] = "owner",
  now = ASSISTANT_NOW,
): AssistantPayload {
  let graph = emptyGraph({
    workspaceId: "workspace",
    scenarioId: "story",
    createdAt: now,
  });
  const photo = {
    id: "photo",
    source: {
      id: "photo",
      hash: "a".repeat(64),
      mime: "image/webp",
      width: 100,
      height: 125,
      bytes: 100,
    },
    derivative: {
      id: "photo",
      hash: "b".repeat(64),
      mime: "image/webp",
      width: 100,
      height: 125,
      bytes: 100,
    },
  };
  for (const [index, type, payload] of [
    [0, "registerPhotos", { photos: [photo] }],
    [
      1,
      "createProduct",
      {
        id: "jeans",
        title: "Straight jeans",
        description: "",
        category: "jeans",
        imageIds: ["photo"],
        sizingSystemId: "waist-inseam-demo",
        archived: false,
        attributes: [
          {
            name: "material",
            value: null,
            provenance: "unknown",
            sourceIds: [],
            review: "unknown",
          },
        ],
        variants: [
          {
            id: "jeans_m",
            size: "30/30",
            colour: "Blue",
            sku: "JEANS-30",
            openingStock: 3,
            price: 6000,
            unitCost: 2400,
            archived: false,
          },
        ],
      },
    ],
  ] as const) {
    const applied = applyCommand(
      graph,
      {
        id: `command_${index}`,
        workspaceId: graph.workspaceId,
        scenarioId: graph.scenarioId,
        expectedRevision: graph.revision,
        at: now,
        expiresAt: new Date(Date.parse(now) + 60000).toISOString(),
        origin: "guest_action",
        type,
        payload,
      },
      { now, availablePhotoIds: new Set(["photo"]) },
    );
    if (!applied.ok) throw new Error(applied.message);
    graph = applied.graph;
  }
  return {
    schemaVersion: 1,
    mode: "fake",
    operationId: "turn",
    prompt: "Help with this store",
    history: [],
    context: {
      role,
      graph,
      scope: allActivityScope(graph),
      currency: { currency: "USD", snapshot: null },
      design: {
        template: "studio",
        theme: "ink",
        typography: "editorial",
        name: "Demo",
        headline: "Clothes with a point of view.",
        heroPhotoId: null,
        revision: 0,
      },
      availablePhotoIds: ["photo"],
      query: "",
      categories: [],
      minimum: null,
      maximum: null,
      selectedProductId: null,
      selectedFactId: null,
      selectedDay: null,
      designConfirmed: true,
    },
  };
}
