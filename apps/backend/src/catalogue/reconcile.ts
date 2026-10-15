import { randomUUID } from "node:crypto";
import { ModelCatalogueSchema } from "@retailor/contracts/recognition";
import type { CatalogueAction } from "@retailor/contracts/recognition";
import { parseDraft } from "@retailor/contracts/catalogue";
import type { DraftItem } from "@retailor/contracts/catalogue";
import { namedColour, formatGarmentTitle } from "@retailor/contracts/product";
import { deny } from "../security/errors.js";

const visible = new Set(["colour", "pattern", "closure", "sleeve", "neckline"]);
const unsupportedCopy =
  /\b(cotton|wool|linen|silk|polyester|cashmere|organic|sustainable|waterproof|antibacterial|guaranteed|recycled|true.to.size|slimming|breathable|premium.fabric)\b/iu;
/** References are evidence, never authority. No model owns IDs or financial defaults. */
export function reconcileCatalogue(
  input: unknown,
  action: CatalogueAction,
  id: () => string = randomUUID,
) {
  const parsed = ModelCatalogueSchema.safeParse(input);
  if (!parsed.success) return deny("UPSTREAM_FAILED", 502);
  const model = parsed.data,
    sources = new Set(action.photos.map((photo) => photo.id));
  if (
    model.dispositions.length !== sources.size ||
    new Set(model.dispositions.map((row) => row.sourceId)).size !== sources.size
  )
    return deny("UPSTREAM_FAILED", 502);
  const productIds = model.garments.map(() => id());
  let variantCount = 0;
  const items: DraftItem[] = model.garments.map((garment, index) => {
    if (
      new Set(garment.sourceIds).size !== garment.sourceIds.length ||
      garment.sourceIds.some((source) => !sources.has(source)) ||
      (garment.grouping === "single" && garment.sourceIds.length !== 1) ||
      new Set(garment.attributes.map((attr) => attr.name)).size !==
        garment.attributes.length ||
      unsupportedCopy.test(`${garment.title} ${garment.description}`)
    )
      return deny("UPSTREAM_FAILED", 502);
    const included =
      garment.classification === "clothing" &&
      garment.category !== null &&
      garment.grouping !== "uncertain";
    const observedColour = garment.attributes.find(
      (attr) =>
        attr.name === "colour" &&
        attr.evidence === "visual" &&
        attr.value &&
        attr.value.trim().length <= 32 &&
        namedColour(attr.value) &&
        attr.sourceIds.length === garment.sourceIds.length,
    );
    const colours =
      garment.colourways ??
      (observedColour
        ? [
            {
              colour: observedColour.value!.trim(),
              sourceIds: observedColour.sourceIds,
              evidence: "visual" as const,
            },
          ]
        : []);
    const colourSources = colours.flatMap((row) => row.sourceIds);
    if (
      colours.some((row) => !namedColour(row.colour)) ||
      (colours.length &&
        (new Set(colours.map((row) => row.colour.toLowerCase())).size !==
          colours.length ||
          new Set(colourSources).size !== colourSources.length ||
          colourSources.length !== garment.sourceIds.length ||
          colourSources.some(
            (source) => !garment.sourceIds.includes(source),
          ))) ||
      (garment.grouping === "supported_colourways" &&
        (colours.length < 2 || !garment.reviewReason.trim())) ||
      (garment.grouping !== "supported_colourways" &&
        garment.grouping !== "uncertain" &&
        colours.length > 1)
    )
      return deny("UPSTREAM_FAILED", 502);
    const attributes = garment.attributes.map((attr) => {
      if (
        new Set(attr.sourceIds).size !== attr.sourceIds.length ||
        attr.sourceIds.some((source) => !garment.sourceIds.includes(source)) ||
        (attr.evidence !== "unknown" &&
          (!attr.sourceIds.length || attr.value === null)) ||
        (attr.evidence === "visual" && !visible.has(attr.name)) ||
        (attr.evidence === "label" &&
          !["material", "care"].includes(attr.name)) ||
        (attr.evidence === "unknown" &&
          (attr.value !== null || attr.sourceIds.length))
      )
        return deny("UPSTREAM_FAILED", 502);
      return {
        name: attr.name,
        value: attr.value,
        sourceIds: attr.sourceIds,
        provenance:
          attr.evidence === "unknown"
            ? ("unknown" as const)
            : ("image_observed" as const),
        review:
          attr.evidence === "unknown"
            ? ("unknown" as const)
            : ("draft" as const),
      };
    });
    variantCount += (colours.length || 1) * 3;
    if (variantCount > 288) return deny("UPSTREAM_FAILED", 502);
    return {
      included,
      confirmedClothing: garment.classification === "clothing",
      copyOrigin: "generated",
      ...(garment.sourceIds.length > 1
        ? { linkOrigin: "recognition" as const }
        : {}),
      reviewReason: included
        ? garment.reviewReason
        : garment.reviewReason ||
          "Confirm that this is clothing and review its photo grouping.",
      product: {
        id: productIds[index]!,
        title: formatGarmentTitle(garment.title),
        description: garment.description,
        category: garment.category ?? "other-clothing",
        imageIds: garment.sourceIds,
        ...(colours.length
          ? {
              colourPhotos: colours.map((row) => ({
                colour: row.colour,
                photoIds: row.sourceIds,
              })),
            }
          : {}),
        sizingSystemId: "alpha-demo",
        archived: false,
        attributes,
        variants: (colours.length
          ? colours.map((row) => row.colour)
          : ["As pictured"]
        ).flatMap((colour, colourIndex) =>
          ["S", "M", "L"].map((size, variant) => ({
            id: id(),
            size,
            colour,
            sku: `DEMO-${index + 1}-${colourIndex + 1}-${variant + 1}`,
            openingStock: 10,
            price: 4500,
            unitCost: 2000,
            archived: false,
          })),
        ),
      },
    };
  });
  const dispositions = model.dispositions.map((row) => {
    if (
      !sources.has(row.sourceId) ||
      new Set(row.garmentIndexes).size !== row.garmentIndexes.length ||
      row.garmentIndexes.some(
        (index) => !items[index]?.product.imageIds.includes(row.sourceId),
      )
    )
      return deny("UPSTREAM_FAILED", 502);
    const actual = items.flatMap((item, index) =>
      item.product.imageIds.includes(row.sourceId) ? [index] : [],
    );
    if (
      actual.length !== row.garmentIndexes.length ||
      actual.some((index) => !row.garmentIndexes.includes(index)) ||
      (row.kind === "rejected" && actual.length) ||
      (row.kind === "linked" && !actual.length) ||
      (row.kind !== "linked" && actual.some((index) => items[index]!.included))
    )
      return deny("UPSTREAM_FAILED", 502);
    if (row.kind === "linked")
      return {
        photoId: row.sourceId,
        kind: "linked" as const,
        productIds: row.garmentIndexes.map((index) => productIds[index]!),
      };
    return {
      photoId: row.sourceId,
      kind: row.kind,
      reason: row.reason || "This photo needs a clothing review before use.",
    };
  });
  try {
    return parseDraft({
      schemaVersion: 1,
      operationId: action.operationId,
      inputRevision: action.inputRevision,
      mode: "live",
      photos: action.photos,
      items,
      dispositions,
      corrections: [],
    });
  } catch {
    return deny("UPSTREAM_FAILED", 502);
  }
}
