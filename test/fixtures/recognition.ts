import type { CatalogueAction } from "../../packages/contracts/src/recognition.js";
export function action(
  workspaceId = "workspace",
  operationId = "operation",
  now = Date.now(),
): CatalogueAction {
  const image = {
    id: "source",
    hash: "a".repeat(64),
    mime: "image/jpeg" as const,
    width: 24,
    height: 32,
    bytes: 1000,
  };
  return {
    schemaVersion: 1,
    action: "catalogue",
    mode: "live",
    workspaceId,
    operationId,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + 7_200_000).toISOString(),
    inputRevision: 0,
    disclosureVersion: "catalogue-previews-v1",
    photos: [{ id: image.id, source: image, derivative: image }],
  };
}
export function observation(sourceId = "source") {
  return {
    garments: [
      {
        sourceIds: [sourceId],
        classification: "clothing",
        category: "shirts",
        title: "Button-front shirt",
        description: "A button-front shirt with a pointed collar.",
        grouping: "single",
        reviewReason: "",
        attributes: [
          {
            name: "closure",
            value: "Buttons",
            sourceIds: [sourceId],
            evidence: "visual",
          },
        ],
      },
    ],
    dispositions: [
      { sourceId, kind: "linked", garmentIndexes: [0], reason: "" },
    ],
  };
}
