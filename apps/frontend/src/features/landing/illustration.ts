import { ProductSchema } from "@retailor/contracts/product";
import type { Product } from "@retailor/contracts/product";
import { DesignSchema } from "@retailor/contracts/design";
import type { Design } from "@retailor/contracts/design";
import { SAMPLE } from "../photos/sample";
import type { StorePhoto } from "../storefront/photo";
import type { StoreItem } from "../storefront/browse";
import { PALETTES } from "../store-design/presets";

/** Authored marketing props only: never a catalogue response, workspace or stock ledger. */
export const ILLUSTRATED_CLOTHES = [
  {
    id: "F01",
    title: "Straight-leg jeans",
    category: "jeans",
    price: 6800,
    size: "28/30",
  },
  {
    id: "F07",
    title: "Button-front shirt",
    category: "shirts",
    price: 5400,
    size: "M",
  },
  {
    id: "F12",
    title: "Midi dress",
    category: "dresses",
    price: 9600,
    size: "M",
  },
] as const;
export const ILLUSTRATED_PHOTOS: ReadonlyMap<string, StorePhoto> = new Map(
  ILLUSTRATED_CLOTHES.map((clothing) => {
    const asset = SAMPLE.assets.find((photo) => photo.id === clothing.id);
    if (!asset) throw new Error("The accepted illustration photo is missing.");
    return [
      clothing.id,
      {
        id: clothing.id,
        name: `${clothing.id}.webp`,
        url: asset.path,
        photo: {
          id: clothing.id,
          source: { ...asset.image, id: clothing.id },
          derivative: { ...asset.image, id: clothing.id },
        },
      },
    ];
  }),
);
export const ILLUSTRATED_ITEMS: readonly StoreItem[] = ILLUSTRATED_CLOTHES.map(
  (clothing) => {
    const product = ProductSchema.parse({
      id: `illustration_${clothing.id}`,
      title: clothing.title,
      description:
        "An illustrative clothing collection. Bring your own photographs to make the real demo yours.",
      category: clothing.category,
      imageIds: [clothing.id],
      archived: false,
      sizingSystemId:
        clothing.category === "jeans" ? "waist-inseam-demo" : "alpha-demo",
      attributes: [],
      variants: [
        {
          id: `illustration_${clothing.id}_option`,
          sku: `FORME-${clothing.id}-DEMO`,
          colour: "Unconfirmed",
          size: clothing.size,
          price: clothing.price,
          unitCost: 0,
          openingStock: 20,
          archived: false,
          openedAt: "2026-10-11T00:00:00.000Z",
        },
      ],
    } satisfies Product);
    return {
      product,
      variants: product.variants.map((variant) => ({ variant, stock: 20 })),
      photoIds: [clothing.id],
      price: clothing.price,
      available: true,
    };
  },
);
function look(
  template: Design["template"],
  theme: Design["theme"],
  typography: Design["typography"],
  headline: string,
): Design {
  return DesignSchema.parse({
    template,
    theme,
    typography,
    headline,
    name: "FORME",
    revision: 0,
  });
}
export const RUNWAY_LOOKS = [
  {
    label: "Editorial",
    name: "Studio",
    detail: `${PALETTES.ink.label} · Editorial`,
    design: look("studio", "ink", "editorial", "Clothes worth living in."),
  },
  {
    label: "Bold",
    name: "Pulse",
    detail: `${PALETTES.cobalt.label} · Expressive`,
    design: look("pulse", "cobalt", "modern", "Good clothes. Great energy."),
  },
  {
    label: "Gallery",
    name: "Gallery",
    detail: `${PALETTES.oxblood.label} · Editorial`,
    design: look("gallery", "oxblood", "editorial", "Less noise. More you."),
  },
] as const;
export const RUNWAY_SCENES = [
  { kind: "photos", look: 0, page: "home", label: "Start with the clothes." },
  {
    kind: "store",
    look: 0,
    page: "home",
    label: "Editorial. Quietly confident.",
  },
  { kind: "store", look: 1, page: "home", label: "Bold. Full of possibility." },
  { kind: "store", look: 2, page: "home", label: "Gallery. Room to breathe." },
  {
    kind: "store",
    look: 2,
    page: "collection",
    label: "A collection, beautifully connected.",
  },
  {
    kind: "store",
    look: 2,
    page: "product",
    label: "Every detail gets its moment.",
  },
] as const;
