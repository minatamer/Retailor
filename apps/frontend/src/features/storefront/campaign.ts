import type { StoreItem } from "./browse";
import type { StorePhoto } from "./photo";

/** Select from available witnesses; never invent an angle or duplicate a hero garment. */
export function campaignPhotos(
  items: readonly StoreItem[],
  photos: ReadonlyMap<string, StorePhoto>,
  hero: StorePhoto | undefined,
  count: 2 | 3,
) {
  const candidates = items.flatMap((item) => {
    if (
      item.product.archived ||
      (hero && item.product.imageIds.includes(hero.id))
    )
      return [];
    const photo = item.photoIds.map((id) => photos.get(id)).find(Boolean);
    return photo ? [{ item, photo }] : [];
  });
  const categories = new Set<StoreItem["product"]["category"]>();
  const leads = candidates.filter(({ item }) => {
    if (categories.has(item.product.category)) return false;
    categories.add(item.product.category);
    return true;
  });
  const views = [
    ...(hero ? [{ photo: hero, item: undefined }] : []),
    ...leads,
    ...candidates.filter((candidate) => !leads.includes(candidate)),
  ];
  const seen = new Set<string>();
  return views
    .filter(({ photo }) => {
      if (seen.has(photo.id)) return false;
      seen.add(photo.id);
      return true;
    })
    .slice(0, count);
}
