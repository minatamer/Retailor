import type { ProductInput } from "@retailor/contracts/product";

export interface SizeOptionDraft {
  id: string;
  size: string;
  colour: string;
  sku: string;
  price: string;
  cost: string;
  stock: string;
  archived: boolean;
}
type Sizing = ProductInput["sizingSystemId"];

/** An active colour keeps a sellable size; an archived colour keeps a row. */
export function canRemoveSizeOption(
  rows: readonly Pick<SizeOptionDraft, "id" | "colour" | "archived">[],
  id: string,
) {
  const target = rows.find((row) => row.id === id);
  return (
    !!target &&
    rows.some(
      (row) =>
        row.id !== id &&
        row.colour.trim().toLowerCase() ===
          target.colour.trim().toLowerCase() &&
        (target.archived || !row.archived),
    )
  );
}

const ALPHA = [
  "XXXS",
  "XXS",
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "XXXL",
  "4XL",
  "5XL",
  "6XL",
  "7XL",
  "8XL",
];
const key = (value: string) => value.trim().toLocaleLowerCase("en");
interface Sequence {
  family: string;
  value: number;
  maximum: number;
  step: number | undefined;
  label(value: number): string;
}
function sequence(label: string, sizing: Sizing): Sequence | undefined {
  const upper = label.trim().toUpperCase();
  if (
    sizing === "one-size-demo" ||
    /^(?:ONE[ -]?SIZE(?: FITS ALL)?|OS|O\/S|OSFA)$/u.test(upper)
  )
    return;
  const alpha = upper
    .replace(/^([23])XS$/u, (_, n: string) => "X".repeat(Number(n)) + "S")
    .replace(/^([23])XL$/u, (_, n: string) => "X".repeat(Number(n)) + "L");
  const index = ALPHA.indexOf(alpha);
  if (index >= 0)
    return {
      family: "alpha",
      value: index,
      maximum: ALPHA.length - 1,
      step: 1,
      label: (value) =>
        /^\dXL$/u.test(upper) && value >= 7 ? `${value - 5}XL` : ALPHA[value]!,
    };
  const waist =
    /^(W\s*)?(\d{1,2})(\s*(?:\/\s*(?:L\s*)?|[x×]\s*|L\s*))(\d{1,2})$/iu.exec(
      label.trim(),
    );
  if (
    waist &&
    (sizing === "waist-inseam-demo" ||
      sizing === "chest-length-demo" ||
      waist[1] ||
      (Number(waist[2]) >= 18 && Number(waist[4]) >= 18))
  )
    return {
      family: `waist:${waist[4]}`,
      value: Number(waist[2]),
      maximum: 80,
      step: 2,
      label: (value) => `${waist[1] ?? ""}${value}${waist[3]}${waist[4]}`,
    };
  const chest = /^(\d{1,2})([RSL])$/iu.exec(label.trim());
  if (chest)
    return {
      family: `chest:${chest[2]!.toUpperCase()}`,
      value: Number(chest[1]),
      maximum: 80,
      step: 2,
      label: (value) => `${value}${chest[2]}`,
    };
  const child = /^(\d{1,2})(T|Y)$/iu.exec(label.trim());
  if (child)
    return {
      family: `child:${child[2]!.toUpperCase()}`,
      value: Number(child[1]),
      maximum: child[2]!.toUpperCase() === "T" ? 6 : 18,
      step: 1,
      label: (value) => `${value}${child[2]}`,
    };
  const numeric =
    /^((?:EU|UK|US|IT|FR|DE|AU)\s*)?(\d{1,3})(\s*(?:cm|in))?$/iu.exec(
      label.trim(),
    );
  if (numeric)
    return {
      family: `numeric:${key(numeric[1] ?? "")}:${key(numeric[3] ?? "")}`,
      value: Number(numeric[2]),
      maximum: 200,
      step:
        numeric[1] ||
        ["regional-demo", "chest-length-demo", "waist-inseam-demo"].includes(
          sizing,
        )
          ? 2
          : undefined,
      label: (value) => `${numeric[1] ?? ""}${value}${numeric[3] ?? ""}`,
    };
}
/** Suggestions only, from bounded entered labels; unknown sizing requires an explicit label. */
export function nextSize(
  sizes: readonly string[],
  sizing: Sizing,
  occupied = sizes,
): string {
  if (
    !sizes.length ||
    sizes.length > 24 ||
    occupied.length > 24 ||
    [...sizes, ...occupied].some((size) => size.length > 16)
  )
    return "";
  const current = sequence(sizes.at(-1)!, sizing);
  if (!current) return "";
  const previous = sizes
    .slice(0, -1)
    .map((size) => sequence(size, sizing))
    .findLast((item) => item?.family === current.family);
  const interval = previous ? current.value - previous.value : undefined;
  const step =
    current.family === "alpha"
      ? 1
      : interval && interval > 0 && interval <= 10
        ? interval
        : current.step;
  if (!step) return "";
  const used = new Set(occupied.map(key));
  const usedValues = new Set(
    occupied
      .map((size) => sequence(size, sizing))
      .filter((item) => item?.family === current.family)
      .map((item) => item!.value),
  );
  for (let attempt = 1; attempt <= 25; attempt++) {
    const value = current.value + step * attempt;
    if (value > current.maximum) return "";
    const label = current.label(value);
    if (label.length > 16) return "";
    if (!used.has(key(label)) && !usedValues.has(value)) return label;
  }
  return "";
}
export function sizeOptionFields(
  variant: ProductInput["variants"][number],
): SizeOptionDraft {
  return {
    id: variant.id,
    size: variant.size,
    colour: variant.colour,
    sku: variant.sku,
    price: (variant.price / 100).toFixed(2),
    cost: (variant.unitCost / 100).toFixed(2),
    stock: String(variant.openingStock),
    archived: variant.archived,
  };
}
/** One new option, never an edit to existing stock or a save/confirmation. */
export function suggestSizeOption(
  rows: readonly SizeOptionDraft[],
  afterId: string | undefined,
  sizing: Sizing,
  id: string,
): SizeOptionDraft | undefined {
  if (rows.length >= 24) return;
  const source = afterId
    ? rows.find((row) => row.id === afterId && !row.archived)
    : rows.findLast((row) => !row.archived);
  if (!source) return;
  const colour = key(source.colour);
  const peers = rows.filter((row) => key(row.colour) === colour);
  const history = rows
    .slice(0, rows.indexOf(source) + 1)
    .filter((row) => !row.archived && key(row.colour) === colour);
  return {
    ...source,
    id,
    sku: `SIZE-${id.replaceAll("-", "").slice(0, 32)}`,
    size: nextSize(
      history.map((row) => row.size),
      sizing,
      peers.map((row) => row.size),
    ),
    archived: false,
  };
}
