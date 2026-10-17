import { z } from "zod";
import {
  ModelCatalogueSchema,
  ModelCatalogueProviderSchema,
} from "@retailor/contracts/recognition";
import type { CatalogueAction } from "@retailor/contracts/recognition";

const PhotoComparisonSchema = z.strictObject({
  photoPosition: z.number().int().min(1).max(24),
  view: z
    .enum(["front", "rear", "side", "detail", "mixed", "unknown"])
    .optional(),
  closestPhotoPosition: z.number().int().min(1).max(24).nullable(),
  relationship: z.enum([
    "same_garment_views",
    "same_design_colourway",
    "different_garment",
    "uncertain",
    "no_candidate",
  ]),
  evidence: z
    .array(
      z.enum([
        "matching_outline",
        "matching_construction",
        "matching_seams",
        "matching_trim",
        "complementary_view",
        "different_colour_only",
        "conflicting_outline",
        "conflicting_construction",
        "insufficient_evidence",
        "matching_colour",
        "texture_difference",
        "conflicting_pattern",
        "view_features_hidden",
      ]),
    )
    .max(4),
});
const ComparisonsSchema = z.array(PhotoComparisonSchema).min(1).max(24);
/** Older injected observations remain readable; the live wire always requires comparisons. */
export const CatalogueObservationSchema = ModelCatalogueSchema.extend({
  comparisons: ComparisonsSchema.optional(),
});
/** Ordering makes the model compare images before generating products and copy. */
export const CatalogueProviderSchema = z.strictObject({
  comparisons: z.array(PhotoComparisonSchema.required()).min(1).max(24),
  ...ModelCatalogueProviderSchema.shape,
});
type Observation = z.infer<typeof CatalogueObservationSchema>;
type Garment = Observation["garments"][number];
export type PhotoComparison = z.infer<typeof PhotoComparisonSchema>;
const included = (garment: Garment) =>
  garment.classification === "clothing" &&
  garment.category !== null &&
  garment.grouping !== "uncertain";
const supported = (row: PhotoComparison) =>
  row.relationship === "same_garment_views" ||
  row.relationship === "same_design_colourway";

/** Private advisory only: pairing predictions never veto an otherwise valid draft. */
export function groupingIssue(model: Observation, action: CatalogueAction) {
  if (!model.comparisons) return null;
  const rows = model.comparisons,
    count = action.photos.length;
  if (
    rows.length !== count ||
    new Set(rows.map((row) => row.photoPosition)).size !== count ||
    rows.some((row) => row.photoPosition > count)
  )
    return "comparison_coverage" as const;
  const groups = model.garments.filter(included);
  const groupsAt = (position: number) =>
    groups.filter((garment) =>
      garment.sourceIds.includes(action.photos[position - 1]!.id),
    );
  for (const row of rows) {
    const candidate = row.closestPhotoPosition;
    if (
      candidate === row.photoPosition ||
      (candidate !== null && candidate > count) ||
      new Set(row.evidence).size !== row.evidence.length
    )
      return "comparison_reference" as const;
    if (row.relationship === "no_candidate") {
      if (candidate !== null || row.evidence.length)
        return "comparison_reference" as const;
      const own = groupsAt(row.photoPosition);
      if (
        own.some((garment) =>
          groups.some(
            (other) =>
              other.category === garment.category &&
              other.sourceIds.some(
                (id) => id !== action.photos[row.photoPosition - 1]!.id,
              ),
          ),
        )
      )
        return "comparison_candidate_missing" as const;
      continue;
    }
    if (candidate === null) return "comparison_reference" as const;
    const shared = groupsAt(row.photoPosition).filter((garment) =>
      garment.sourceIds.includes(action.photos[candidate - 1]!.id),
    );
    if (supported(row)) {
      const hasConstruction = row.evidence.some((cue) =>
        ["matching_construction", "matching_seams", "matching_trim"].includes(
          cue,
        ),
      );
      if (
        row.evidence.length < 2 ||
        !hasConstruction ||
        row.evidence.some((cue) =>
          [
            "conflicting_outline",
            "conflicting_construction",
            "conflicting_pattern",
            "insufficient_evidence",
          ].includes(cue),
        ) ||
        (row.relationship === "same_design_colourway" &&
          !row.evidence.includes("different_colour_only")) ||
        (row.relationship === "same_garment_views" &&
          row.evidence.includes("different_colour_only"))
      )
        return "comparison_evidence" as const;
      if (!shared.length) return "supported_pair_split" as const;
      for (const garment of shared) {
        const colours = garment.colourways ?? [];
        const colourAt = (position: number) =>
          colours.findIndex((colour) =>
            colour.sourceIds.includes(action.photos[position - 1]!.id),
          );
        const ownColour = colourAt(row.photoPosition),
          otherColour = colourAt(candidate);
        if (
          (row.relationship === "same_design_colourway" &&
            (garment.grouping !== "supported_colourways" ||
              ownColour < 0 ||
              otherColour < 0 ||
              ownColour === otherColour)) ||
          (row.relationship === "same_garment_views" &&
            colours.length > 0 &&
            (ownColour < 0 || ownColour !== otherColour))
        )
          return "comparison_colour_partition" as const;
      }
    } else {
      if (shared.length) return "unsupported_pair_merged" as const;
      if (
        (row.relationship === "different_garment" &&
          !row.evidence.some((cue) =>
            ["conflicting_outline", "conflicting_construction"].includes(cue),
          )) ||
        (row.relationship === "uncertain" &&
          !row.evidence.includes("insufficient_evidence"))
      )
        return "comparison_evidence" as const;
    }
  }
  const positions = new Map(
    action.photos.map((photo, index) => [photo.id, index + 1]),
  );
  // Every included group needs a connected supporting graph within its own photos.
  for (const garment of groups) {
    if (garment.sourceIds.length < 2) continue;
    const members = new Set(garment.sourceIds.map((id) => positions.get(id)));
    const reached = new Set([positions.get(garment.sourceIds[0]!)]);
    for (let pass = 0; pass < members.size; pass++) {
      for (const row of rows) {
        if (
          !supported(row) ||
          row.closestPhotoPosition === null ||
          !members.has(row.photoPosition) ||
          !members.has(row.closestPhotoPosition)
        )
          continue;
        if (
          reached.has(row.photoPosition) ||
          reached.has(row.closestPhotoPosition)
        ) {
          reached.add(row.photoPosition);
          reached.add(row.closestPhotoPosition);
        }
      }
    }
    if (reached.size !== members.size)
      return "group_comparison_disconnected" as const;
  }
  return null;
}
