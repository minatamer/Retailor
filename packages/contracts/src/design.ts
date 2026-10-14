import { z } from "zod";
import { IdSchema } from "./core.js";
export const TemplateSchema = z.enum(["studio", "pulse", "gallery"]);
export const StorePageSchema = z.enum(["home", "collection", "product"]);
export type StorePage = z.infer<typeof StorePageSchema>;
export const PageTemplatesSchema = z.strictObject({
  home: TemplateSchema,
  collection: TemplateSchema,
  product: TemplateSchema,
});
export const ThemeSchema = z.enum(["navy", "ink", "cobalt", "oxblood", "pine"]);
export const DEFAULT_THEME: z.infer<typeof ThemeSchema> = "navy";
export const TypographySchema = z.enum(["inter", "editorial", "modern"]);
export const DesignSchema = z.strictObject({
  template: TemplateSchema,
  pageTemplates: PageTemplatesSchema.optional(),
  theme: ThemeSchema,
  typography: TypographySchema,
  name: z.string().min(1).max(40),
  headline: z.string().max(100),
  heroPhotoId: IdSchema.nullable().default(null),
  logoId: IdSchema.nullable().optional(),
  revision: z.number().int().nonnegative().max(1_000_000),
});
export type Design = z.infer<typeof DesignSchema>;
export function pageTemplate(
  design: Pick<Design, "template" | "pageTemplates">,
  page: StorePage,
) {
  return design.pageTemplates?.[page] ?? design.template;
}
export function resolvedTemplates(
  design: Pick<Design, "template" | "pageTemplates">,
) {
  return {
    home: pageTemplate(design, "home"),
    collection: pageTemplate(design, "collection"),
    product: pageTemplate(design, "product"),
  };
}
/** Identical choices are the ordinary whole-store preset, not a hidden custom mode. */
export function withPageTemplates(
  design: Design,
  pages: z.infer<typeof PageTemplatesSchema>,
): Design {
  return pages.home === pages.collection && pages.home === pages.product
    ? { ...design, template: pages.home, pageTemplates: undefined }
    : { ...design, pageTemplates: { ...pages } };
}
