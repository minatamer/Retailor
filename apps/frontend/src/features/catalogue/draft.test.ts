import { expect, it } from "vitest";
import { developmentDraft } from "./development-fixture";
import {
  parseDraft,
  reviseDraft,
  mergeDraft,
  splitDraft,
  includeDraft,
  excludeSource,
} from "./draft";
import { decode, file } from "../../../test/workspace";
async function draft() {
  let next = 0;
  const photos = await Promise.all(
    ["one", "two", "three"].map(
      async (name) =>
        (await decode({ id: name, original: file(name).blob })).photo,
    ),
  );
  return developmentDraft(photos, "operation", 3, () => `product_${++next}`);
}
it("preserves explicit coverage, prior copy and grouping provenance through split/merge/exclude", async () => {
  const original = await draft(),
    first = original.items[0]!;
  const edited = reviseDraft(original, first.product.id, {
    ...first.product,
    title: "My title",
  });
  expect(edited.corrections[0]!.before.title).toBe("Straight-leg jeans");
  expect(original.items[0]!.product.title).toBe("Straight-leg jeans");
  const merged = mergeDraft(edited, [
    edited.items[0]!.product.id,
    edited.items[1]!.product.id,
  ]);
  expect(merged.items).toHaveLength(2);
  expect(merged.items[0]!.product.imageIds).toEqual(["one", "two"]);
  expect(merged.corrections[1]!.before.imageIds).toEqual(["one"]);
  const split = splitDraft(
    merged,
    merged.items[0]!.product.id,
    "two",
    "separate",
  );
  expect(split.dispositions.find((item) => item.photoId === "two")!.kind).toBe(
    "review",
  );
  const excluded = includeDraft(split, "separate", false);
  expect(
    excluded.dispositions.find((item) => item.photoId === "two")!.kind,
  ).toBe("rejected");
  expect(
    includeDraft(split, "separate", true).dispositions.find(
      (item) => item.photoId === "two",
    )!.kind,
  ).toBe("linked");
});
it("does not silently exclude an unclassified source when another product is edited", async () => {
  const input = await draft();
  input.items = input.items.slice(0, 2);
  input.dispositions[2] = {
    photoId: "three",
    kind: "review",
    reason: "Ambiguous source",
  };
  const first = input.items[0]!,
    edited = reviseDraft(input, first.product.id, {
      ...first.product,
      title: "Edited",
    });
  expect(edited.dispositions[2]!.kind).toBe("review");
  expect(excludeSource(edited, "three").dispositions[2]!.kind).toBe("rejected");
});
it("rejects duplicate size/colour combinations during the edit instead of failing later publication", async () => {
  const original = await draft(),
    first = original.items[0]!;
  const variants = first.product.variants.map((variant) => ({
    ...variant,
    size: "M",
    colour: "Indigo",
  }));
  variants[1]!.colour = "INDIGO";
  expect(() =>
    reviseDraft(original, first.product.id, { ...first.product, variants }),
  ).toThrow("distinct");
  expect(original.corrections).toHaveLength(0);
});
it("rejects phantom source, lost coverage, unsupported exact duplicate and photo-free products", async () => {
  const input = await draft();
  expect(() =>
    parseDraft({ ...input, dispositions: input.dispositions.slice(1) }),
  ).toThrow();
  expect(() =>
    parseDraft({
      ...input,
      dispositions: [
        { photoId: "one", kind: "duplicate", originalId: "two" },
        ...input.dispositions.slice(1),
      ],
    }),
  ).toThrow("matching validated bytes");
  expect(() =>
    reviseDraft(input, input.items[0]!.product.id, {
      ...input.items[0]!.product,
      imageIds: [],
    }),
  ).toThrow();
  expect(() =>
    reviseDraft(input, input.items[0]!.product.id, {
      ...input.items[0]!.product,
      imageIds: ["phantom"],
    }),
  ).toThrow();
});
