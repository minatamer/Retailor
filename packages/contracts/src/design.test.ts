import { describe, expect, it } from "vitest";
import {
  DesignSchema,
  PageTemplatesSchema,
  pageTemplate,
  resolvedTemplates,
  withPageTemplates,
  TemplateSchema,
  ThemeSchema,
  DEFAULT_THEME,
} from "./design.js";

const legacy = DesignSchema.parse({
  template: "studio",
  theme: "ink",
  typography: "editorial",
  name: "A wardrobe",
  headline: "Your clothes",
  revision: 0,
});
describe("finite independent page layouts", () => {
  it("accepts the new finite default and original saved theme IDs but rejects arbitrary colour/CSS values", () => {
    expect(DEFAULT_THEME).toBe("navy");
    for (const theme of ThemeSchema.options)
      expect(DesignSchema.parse({ ...legacy, theme }).theme).toBe(theme);
    for (const theme of ["#242b60", "custom", "url(example)", "body{}", null])
      expect(DesignSchema.safeParse({ ...legacy, theme }).success).toBe(false);
    expect(DesignSchema.parse(legacy).theme).toBe("ink");
  });
  it("keeps legacy designs on one family and resolves every supported combination", () => {
    expect(resolvedTemplates(legacy)).toEqual({
      home: "studio",
      collection: "studio",
      product: "studio",
    });
    for (const home of TemplateSchema.options)
      for (const collection of TemplateSchema.options)
        for (const product of TemplateSchema.options) {
          const pages = { home, collection, product };
          const design = DesignSchema.parse({
            ...legacy,
            pageTemplates: pages,
          });
          expect(pageTemplate(design, "home")).toBe(home);
          expect(pageTemplate(design, "collection")).toBe(collection);
          expect(pageTemplate(design, "product")).toBe(product);
        }
  });
  it("normalizes a shared family and preserves unrelated design values without mutating the original", () => {
    const pages = {
      home: "studio",
      collection: "pulse",
      product: "gallery",
    } as const;
    const mixed = withPageTemplates(legacy, pages);
    expect(mixed.pageTemplates).toEqual(pages);
    const unified = withPageTemplates(mixed, {
      home: "pulse",
      collection: "pulse",
      product: "pulse",
    });
    expect(unified.template).toBe("pulse");
    expect(unified.pageTemplates).toBeUndefined();
    expect(unified.theme).toBe(legacy.theme);
    expect(unified.name).toBe(legacy.name);
    expect(legacy.pageTemplates).toBeUndefined();
    expect(mixed.pageTemplates).toEqual(pages);
  });
  it("rejects incomplete, obsolete, arbitrary-page and executable mappings", () => {
    for (const pages of [
      { home: "studio" },
      { home: "custom", collection: "pulse", product: "gallery" },
      {
        home: "studio",
        collection: "pulse",
        product: "gallery",
        checkout: "pulse",
      },
      {
        home: "studio",
        collection: "pulse",
        product: "gallery",
        css: "body{}",
      },
      null,
    ])
      expect(PageTemplatesSchema.safeParse(pages).success).toBe(false);
  });
});
