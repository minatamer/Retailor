import { z } from "zod";
import { IdSchema } from "./core.js";
export const TemplateSchema = z.enum(["studio", "pulse", "gallery"]);
export const ThemeSchema = z.enum(["ink", "cobalt", "oxblood", "pine"]);
export const TypographySchema = z.enum(["inter", "editorial", "modern"]);
export const DesignSchema = z.strictObject({
  template: TemplateSchema,
  theme: ThemeSchema,
  typography: TypographySchema,
  name: z.string().min(1).max(40),
  headline: z.string().max(100),
  heroPhotoId: IdSchema.nullable().default(null),
  logoId: IdSchema.nullable().optional(),
  revision: z.number().int().nonnegative().max(1_000_000),
});
export type Design = z.infer<typeof DesignSchema>;
