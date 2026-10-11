import { z } from "zod";
import { GraphSchema, TimestampSchema } from "@retailor/contracts/commerce";
import { IdSchema } from "@retailor/contracts/core";
import { PhotoSchema, PHOTO_LIMITS } from "@retailor/contracts/photos";
import { DesignSchema } from "@retailor/contracts/design";
import { parseGraph, serializedBytes } from "@retailor/commerce/graph";
import { DraftSchema, parseDraft } from "../catalogue/draft";
export const SESSION_KEY = "retailor.workspace.v1";
export const SESSION_BYTES = 2 * 1024 * 1024;
export const StageSchema = z.enum([
  "choose",
  "process",
  "catalogue",
  "style",
  "storefront",
  "dashboard",
]);
export type Stage = z.infer<typeof StageSchema>;
export const ProjectionSchema = z.strictObject({
  schemaVersion: z.literal(1),
  savedAt: TimestampSchema,
  graph: GraphSchema,
  stage: StageSchema,
  inputRevision: z.number().int().nonnegative(),
  selectedIds: z.array(IdSchema).max(24),
  photos: z.array(PhotoSchema).max(32),
  draft: DraftSchema.nullable(),
  acceptedDesign: DesignSchema,
  previewDesign: DesignSchema,
  presentationRevision: z.number().int().nonnegative().max(1_000_000),
  fixture: z.boolean(),
});
export type Projection = z.infer<typeof ProjectionSchema>;
export const INITIAL_DESIGN = DesignSchema.parse({
  template: "studio",
  theme: "ink",
  typography: "editorial",
  name: "Your collection",
  headline: "A collection with a point of view.",
  revision: 0,
});
export function restoreProjection(
  input: unknown,
  now: number,
  fixtureAllowed: boolean,
) {
  const state = ProjectionSchema.parse(input),
    graph = parseGraph(state.graph);
  if (
    serializedBytes(state) > SESSION_BYTES ||
    Date.parse(graph.createdAt) > now ||
    Date.parse(state.savedAt) > now ||
    Date.parse(state.savedAt) < Date.parse(graph.asOf) ||
    Date.parse(graph.expiresAt) <= now ||
    (state.fixture && !fixtureAllowed)
  )
    throw new Error("This saved workspace is unavailable or expired.");
  const photos = new Map(state.photos.map((photo) => [photo.id, photo]));
  if (
    state.photos.reduce((sum, photo) => sum + photo.source.bytes, 0) >
      PHOTO_LIMITS.originals ||
    state.photos.reduce((sum, photo) => sum + photo.derivative.bytes, 0) >
      PHOTO_LIMITS.cachedDerivatives ||
    state.selectedIds.reduce(
      (sum, id) => sum + (photos.get(id)?.derivative.bytes ?? 0),
      0,
    ) > PHOTO_LIMITS.derivatives ||
    photos.size !== state.photos.length ||
    new Set(state.selectedIds).size !== state.selectedIds.length ||
    state.selectedIds.some((id) => !photos.has(id)) ||
    graph.photos.some(
      (photo) => JSON.stringify(photos.get(photo.id)) !== JSON.stringify(photo),
    )
  )
    throw new Error("Saved photo identities do not match the catalogue.");
  if (state.draft) {
    const draft = parseDraft(state.draft);
    if (draft.mode === "development-fixture" && !fixtureAllowed)
      throw new Error("Development drafts cannot restore in public mode.");
    if (
      draft.inputRevision !== state.inputRevision ||
      draft.photos.length !== state.selectedIds.length ||
      draft.photos.some(
        (photo) =>
          !state.selectedIds.includes(photo.id) ||
          JSON.stringify(photos.get(photo.id)) !== JSON.stringify(photo),
      )
    )
      throw new Error("The saved draft belongs to another photo selection.");
  }
  if (state.stage === "catalogue" && !state.draft)
    throw new Error("The saved catalogue draft is missing.");
  if (
    ["style", "storefront", "dashboard"].includes(state.stage) &&
    !graph.products.some((product) => !product.archived)
  )
    throw new Error("The saved storefront has no usable catalogue.");
  return {
    ...state,
    graph,
    stage: state.stage === "process" ? ("choose" as const) : state.stage,
  };
}
/** Explicit allow-list, not runtime serialization with sensitive fields removed. */
export function serializeProjection(state: Projection, now: number) {
  const selected = {
    schemaVersion: state.schemaVersion,
    savedAt: new Date(now).toISOString(),
    graph: state.graph,
    stage: state.stage,
    inputRevision: state.inputRevision,
    selectedIds: state.selectedIds,
    photos: state.photos,
    draft: state.draft,
    acceptedDesign: state.acceptedDesign,
    previewDesign: state.previewDesign,
    presentationRevision: state.presentationRevision,
    fixture: state.fixture,
  };
  const encoded = JSON.stringify(ProjectionSchema.parse(selected));
  if (serializedBytes(selected) > SESSION_BYTES)
    throw new Error("This workspace exceeds its 2-MiB recovery envelope.");
  return encoded;
}
