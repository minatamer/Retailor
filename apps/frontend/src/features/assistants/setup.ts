import { z } from "zod";
import {
  TemplateSchema,
  ThemeSchema,
  TypographySchema,
  PageTemplatesSchema,
  resolvedTemplates,
  AdditionalHeroPhotosSchema,
} from "@retailor/contracts/design";
import type { Design } from "@retailor/contracts/design";
import { IdSchema } from "@retailor/contracts/core";
import { LogoContextSchema } from "@retailor/contracts/brand";
export const BrandDraftSchema = z.strictObject({
  name: z.string().max(40),
  headline: z.string().max(100),
  heroPhotoId: IdSchema.nullable(),
  additionalHeroPhotoIds: AdditionalHeroPhotosSchema.default([null, null]),
});
export type BrandDraft = z.infer<typeof BrandDraftSchema>;
export const CLEAN_BRAND = {
  name: false,
  headline: false,
  heroPhotoId: false,
  additionalHeroPhotoIds: false,
};
export const SetupStepSchema = z.enum([
  "introduction",
  "template",
  "theme",
  "typography",
  "brand",
  "logo",
  "summary",
]);
export const SetupSchema = z.strictObject({
  step: SetupStepSchema,
  expanded: z.boolean(),
  template: TemplateSchema.nullable(),
  pageTemplates: PageTemplatesSchema.nullable().default(null),
  theme: ThemeSchema.nullable(),
  typography: TypographySchema.nullable(),
  brandConfirmed: z.boolean(),
  wordmarkKept: z.boolean(),
  brandDraft: BrandDraftSchema.nullable().default(null),
  brandDirty: z
    .strictObject({
      name: z.boolean(),
      headline: z.boolean(),
      heroPhotoId: z.boolean(),
      additionalHeroPhotoIds: z.boolean().default(false),
    })
    .default(CLEAN_BRAND),
});
export type SetupState = z.infer<typeof SetupSchema>;
export type SetupStep = z.infer<typeof SetupStepSchema>;
export const INITIAL_SETUP: SetupState = {
  step: "introduction",
  expanded: true,
  template: null,
  pageTemplates: null,
  theme: null,
  typography: null,
  brandConfirmed: false,
  wordmarkKept: false,
  brandDraft: null,
  brandDirty: CLEAN_BRAND,
};
export function brandValues(design: Design): BrandDraft {
  return {
    name: design.name,
    headline: design.headline,
    heroPhotoId: design.heroPhotoId,
    additionalHeroPhotoIds: design.additionalHeroPhotoIds ?? [null, null],
  };
}
export function updateBrand(
  setup: SetupState,
  design: Design,
  patch: Partial<BrandDraft>,
  origin: "human" | "suggestion",
): SetupState {
  const previous = setup.brandDraft ?? brandValues(design);
  const draft = { ...previous },
    dirty = { ...setup.brandDirty };
  for (const key of ["name", "headline", "heroPhotoId"] as const) {
    if (key in patch && (origin === "human" || !dirty[key])) {
      const value = patch[key];
      if (
        key === "heroPhotoId" &&
        (value === null || typeof value === "string")
      )
        draft.heroPhotoId = value;
      if (key !== "heroPhotoId" && typeof value === "string")
        draft[key] = value;
      if (origin === "human") dirty[key] = true;
    }
  }
  if (
    "additionalHeroPhotoIds" in patch &&
    (origin === "human" || !dirty.additionalHeroPhotoIds)
  ) {
    draft.additionalHeroPhotoIds = AdditionalHeroPhotosSchema.parse(
      patch.additionalHeroPhotoIds,
    );
    if (origin === "human") dirty.additionalHeroPhotoIds = true;
  }
  const parsed = BrandDraftSchema.parse(draft);
  const changed = JSON.stringify(parsed) !== JSON.stringify(previous);
  if (
    !changed &&
    Object.keys(dirty).every(
      (key) =>
        dirty[key as keyof typeof dirty] ===
        setup.brandDirty[key as keyof typeof dirty],
    )
  )
    return setup;
  return {
    ...setup,
    brandDraft: parsed,
    brandDirty: dirty,
    brandConfirmed: changed ? false : setup.brandConfirmed,
  };
}
export function logoEligible(setup: SetupState, design: Design) {
  return setup.theme === design.theme && setup.typography === design.typography;
}
/** Validate the actual editable name, never its previous nonempty preview fallback. */
export function logoNameReady(setup: SetupState, design: Design) {
  const parsed = LogoContextSchema.shape.name.safeParse(
    setup.brandDraft?.name ?? design.name,
  );
  return parsed.success && parsed.data === design.name;
}
export function designConfirmed(setup: SetupState, design: Design) {
  return layoutConfirmed(setup, design) && logoEligible(setup, design);
}
function layoutConfirmed(setup: SetupState, design: Design) {
  if (setup.template !== design.template) return false;
  const confirmed = resolvedTemplates({
    template: setup.template,
    pageTemplates: setup.pageTemplates ?? undefined,
  });
  const current = resolvedTemplates(design);
  return Object.keys(current).every(
    (page) =>
      confirmed[page as keyof typeof current] ===
      current[page as keyof typeof current],
  );
}
/** A remembered answer confirms that exact preset; merely rendering a default never does. */
export function reconcileSetup(setup: SetupState, design: Design): SetupState {
  const next = {
    ...setup,
    template: layoutConfirmed(setup, design) ? setup.template : null,
    pageTemplates: layoutConfirmed(setup, design) ? setup.pageTemplates : null,
    theme: setup.theme === design.theme ? setup.theme : null,
    typography:
      setup.typography === design.typography ? setup.typography : null,
  };
  if (!designConfirmed(next, design)) next.wordmarkKept = false;
  if (["logo", "summary"].includes(next.step) && !designConfirmed(next, design))
    next.step = !next.template
      ? "template"
      : !next.theme
        ? "theme"
        : "typography";
  else if (
    ["logo", "summary"].includes(next.step) &&
    !next.brandConfirmed &&
    !(next.step === "logo" && next.brandDirty.name)
  )
    next.step = "brand";
  else if (next.step === "summary" && !next.wordmarkKept) next.step = "logo";
  return next;
}
export function confirmSetup(
  setup: SetupState,
  design: Design,
  step: "template" | "theme" | "typography" | "brand",
): SetupState {
  if (step === "template")
    return {
      ...setup,
      template: design.template,
      pageTemplates: design.pageTemplates ?? null,
      step:
        setup.theme === design.theme
          ? setup.typography === design.typography
            ? "brand"
            : "typography"
          : "theme",
    };
  if (step === "theme")
    return {
      ...setup,
      theme: design.theme,
      wordmarkKept: false,
      step: "typography",
    };
  if (step === "typography")
    return {
      ...setup,
      typography: design.typography,
      wordmarkKept: false,
      step: "brand",
    };
  return {
    ...setup,
    brandConfirmed: true,
    step: logoEligible(setup, design) ? "logo" : "theme",
  };
}
