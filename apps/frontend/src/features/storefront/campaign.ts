import type { StoreItem } from "./browse";
import type { StorePhoto } from "./photo";

/** Select from available witnesses; never invent an angle or duplicate a hero garment. */
export function campaignPhotos(
  items: readonly StoreItem[],
  photos: ReadonlyMap<string, StorePhoto>,
  hero: StorePhoto | undefined | readonly (StorePhoto | undefined)[],
  count: 2 | 3,
) {
  const requested = hero === undefined ? [] : "id" in hero ? [hero] : hero;
  const seen = new Set<string>();
  const chosen = Array.from({ length: count }, (_, index) => {
    const photo = requested[index];
    if (!photo || seen.has(photo.id)) return undefined;
    seen.add(photo.id);
    return photo;
  });
  const candidates = items.flatMap((item) => {
    if (
      item.product.archived ||
      chosen.some((photo) => photo && item.product.imageIds.includes(photo.id))
    )
      return [];
    const photo = item.photoIds.map((id) => photos.get(id)).find(Boolean);
    return photo ? [{ item, photo }] : [];
  });
  const categories = new Set(
    items
      .filter((item) =>
        chosen.some(
          (photo) => photo && item.product.imageIds.includes(photo.id),
        ),
      )
      .map((item) => item.product.category),
  );
  const leads = candidates.filter(({ item }) => {
    if (categories.has(item.product.category)) return false;
    categories.add(item.product.category);
    return true;
  });
  const automatic = [
    ...leads,
    ...candidates.filter((candidate) => !leads.includes(candidate)),
  ];
  return chosen.flatMap((photo, slot) => {
    if (photo)
      return [
        {
          photo,
          item: items.find(
            (item) =>
              !item.product.archived && item.photoIds.includes(photo.id),
          ),
          slot,
        },
      ];
    const next = automatic.find((candidate) => !seen.has(candidate.photo.id));
    if (!next) return [];
    seen.add(next.photo.id);
    return [{ ...next, slot }];
  });
}
