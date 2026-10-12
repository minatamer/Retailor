"use client";
import { useEffect, useRef, useState } from "react";
import type { Design } from "@retailor/contracts/design";
import type { Variant } from "@retailor/contracts/product";
import { formatUsd, parseUsd } from "@retailor/commerce/money";
import { Icon } from "../../components/ui/icon";
import { merchantStyle } from "../store-design/presets";
import {
  collection,
  EMPTY_FILTERS,
  FiltersSchema,
  filterOptions,
  knownColour,
  SIZING_LABELS,
  matchingOption,
} from "./browse";
import type { BrowseState, Filters, StoreItem } from "./browse";
import { GarmentGallery, GarmentImage } from "./gallery";
import type { StorePhoto } from "./gallery";
import styles from "./storefront.module.css";

export interface StorefrontInput {
  design: Design;
  items: readonly StoreItem[];
  browse: BrowseState;
  photos: ReadonlyMap<string, StorePhoto>;
  preview: boolean;
  formatPrice?: (cents: number) => string;
}
export interface StorefrontActions {
  browse(patch: Partial<BrowseState>): void;
  owner(): void;
  photoFailed(id: string): void;
  openBag?: () => void;
  addToBag?: (productId: string, variantId: string, quantity: number) => void;
}
export function Storefront({
  input,
  actions,
}: {
  input: StorefrontInput;
  actions: StorefrontActions;
}) {
  const { design, browse, items, preview } = input;
  const current = items.filter((item) => !item.product.archived);
  const filtered = collection(items, browse);
  const picked = items.find((item) => item.product.id === browse.productId);
  const first = current.find((item) => item.photoIds.length) ?? current[0];
  const price = input.formatPrice ?? formatUsd;
  const suppliedHero = design.heroPhotoId
    ? input.photos.get(design.heroPhotoId)
    : undefined;
  const body = useRef<HTMLDivElement>(null),
    frame = useRef<HTMLDivElement>(null);
  const previous = useRef(`${browse.page}:${browse.productId ?? ""}`);
  useEffect(() => {
    const next = `${browse.page}:${browse.productId ?? ""}`;
    if (previous.current !== next) {
      body.current?.focus({ preventScroll: true });
      frame.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    previous.current = next;
  }, [browse.page, browse.productId]);
  const select = (id: string) =>
    actions.browse({
      page: "product",
      productId: id,
      variantId: browse.productId === id ? browse.variantId : null,
    });
  const openCollection = (category: Filters["category"] = null) =>
    actions.browse({
      page: "collection",
      filters: { ...EMPTY_FILTERS, category },
    });
  return (
    <section
      className={styles.store}
      style={merchantStyle(design)}
      data-family={design.template}
      aria-label={`${design.name} storefront`}
    >
      <div className={styles.storeFrame} ref={frame}>
        <header className={styles.header}>
          <button
            className={styles.wordmark}
            onClick={() => actions.browse({ page: "home" })}
          >
            {design.name}
          </button>
          <nav aria-label="Store pages">
            {(["home", "collection", "product"] as const).map((page) => (
              <button
                key={page}
                aria-current={browse.page === page ? "page" : undefined}
                onClick={() => {
                  if (page === "product" && !browse.productId && first)
                    select(first.product.id);
                  else actions.browse({ page });
                }}
              >
                {page === "home"
                  ? "Home"
                  : page === "collection"
                    ? "Collection"
                    : "Product"}
              </button>
            ))}
          </nav>
          {!preview && (
            <button
              className={styles.bag}
              disabled={!actions.openBag}
              onClick={actions.openBag}
              aria-label="Open shopping bag"
            >
              <Icon name="bag" />
              <span>Bag</span>
            </button>
          )}
        </header>
        <div className={styles.page} key={browse.page} ref={body} tabIndex={-1}>
          {browse.page === "home" && (
            <>
              {first ? (
                <div className={styles.hero}>
                  <div className={styles.heroCopy}>
                    <span className={styles.eyebrow}>
                      A wardrobe. A point of view.
                    </span>
                    <h1>{design.headline || "Made for your everyday."}</h1>
                    <p>
                      {design.template === "pulse"
                        ? "Find your next favourite. Make it your own."
                        : design.template === "gallery"
                          ? "A considered collection, seen in a new light."
                          : "Good clothes. A little perspective. Discover the collection."}
                    </p>
                    <button
                      className={styles.primary}
                      onClick={() => openCollection()}
                    >
                      Explore the collection <Icon name="arrow" />
                    </button>
                    <span className={styles.heroIndex}>
                      {String(current.length).padStart(2, "0")} garments · One
                      collection
                    </span>
                  </div>
                  <button
                    className={styles.heroPhoto}
                    onClick={() =>
                      suppliedHero ? openCollection() : select(first.product.id)
                    }
                    aria-label={
                      suppliedHero
                        ? "Explore the collection"
                        : `Discover ${first.product.title}`
                    }
                  >
                    {(suppliedHero ?? photoFor(first, input)) ? (
                      <GarmentImage
                        photo={(suppliedHero ?? photoFor(first, input))!}
                        title={
                          suppliedHero
                            ? `Supplied hero image for ${design.name}`
                            : first.product.title
                        }
                        eager
                        onFailure={actions.photoFailed}
                      />
                    ) : (
                      <span>Photo needs repair</span>
                    )}
                    <span className={styles.heroPhotoLabel}>
                      {suppliedHero
                        ? "Your collection, your world"
                        : first.product.title}
                      <Icon name="arrow" />
                    </span>
                  </button>
                  {design.template === "gallery" && current[1] && (
                    <button
                      className={styles.secondHero}
                      aria-label={`Discover ${current[1].product.title}`}
                      onClick={() => select(current[1]!.product.id)}
                    >
                      {photoFor(current[1], input) && (
                        <GarmentImage
                          photo={photoFor(current[1], input)!}
                          title={current[1].product.title}
                          eager
                          onFailure={actions.photoFailed}
                        />
                      )}
                      <span>{current[1].product.title}</span>
                    </button>
                  )}
                </div>
              ) : (
                <Empty
                  title="A new chapter starts here."
                  copy="Add a photo-backed garment to begin your collection."
                  action="Open owner workspace"
                  onAction={actions.owner}
                />
              )}
              <div className={styles.categoryBar}>
                <span>Find your kind of clothing</span>
                <div>
                  {filterOptions(items)
                    .categories.slice(0, 8)
                    .map((category) => (
                      <button
                        key={category}
                        onClick={() => openCollection(category)}
                      >
                        {categoryLabel(category)} <span>↗</span>
                      </button>
                    ))}
                </div>
              </div>
              {current.length > 0 && (
                <section className={styles.featured}>
                  <div className={styles.sectionHeading}>
                    <div>
                      <span className={styles.eyebrow}>
                        The collection, up close
                      </span>
                      <h2>A few to begin with.</h2>
                    </div>
                    <button
                      className={styles.textButton}
                      onClick={() => openCollection()}
                    >
                      View all {current.length} →
                    </button>
                  </div>
                  <div className={styles.grid}>
                    {current
                      .slice(0, design.template === "gallery" ? 2 : 4)
                      .map((item) => (
                        <ProductCard
                          key={item.product.id}
                          item={item}
                          input={input}
                          onSelect={select}
                          onFailure={actions.photoFailed}
                          price={price}
                        />
                      ))}
                  </div>
                </section>
              )}
            </>
          )}
          {browse.page === "collection" && (
            <>
              <div className={styles.collectionHeading}>
                <span className={styles.eyebrow}>{design.name} / Clothing</span>
                <h1>
                  {browse.filters.category
                    ? categoryLabel(browse.filters.category)
                    : "The collection."}
                </h1>
                <p>Your next favourite is in the details.</p>
              </div>
              <div className={styles.collectionTools}>
                <label className={styles.search}>
                  <Icon name="search" />
                  <span className={styles.srOnly}>Search garments</span>
                  <input
                    type="search"
                    maxLength={100}
                    placeholder="Search the collection"
                    value={browse.filters.search}
                    onChange={(event) =>
                      actions.browse({
                        filters: {
                          ...browse.filters,
                          search: event.target.value,
                        },
                      })
                    }
                  />
                </label>
                <FilterSheet input={input} actions={actions} />
                <label className={styles.sort}>
                  <span>Sort</span>
                  <select
                    aria-label="Sort collection"
                    value={browse.sort}
                    onChange={(event) =>
                      actions.browse({
                        sort: event.target.value as BrowseState["sort"],
                      })
                    }
                  >
                    <option value="recommended">Collection order</option>
                    <option value="price-low">Price: low to high</option>
                    <option value="price-high">Price: high to low</option>
                    <option value="title">Name: A–Z</option>
                  </select>
                </label>
              </div>
              <AppliedFilters
                filters={browse.filters}
                price={price}
                onChange={(filters) => actions.browse({ filters })}
              />
              <p className={styles.resultCount} role="status">
                {filtered.length}{" "}
                {filtered.length === 1 ? "garment" : "garments"}
                {filtered.length !== current.length
                  ? ` of ${current.length}`
                  : ""}
              </p>
              {filtered.length ? (
                <div className={styles.grid}>
                  {filtered.map((item) => (
                    <ProductCard
                      key={item.product.id}
                      item={item}
                      input={input}
                      onSelect={select}
                      onFailure={actions.photoFailed}
                      price={price}
                    />
                  ))}
                </div>
              ) : (
                <Empty
                  title={
                    current.length
                      ? "A little less filtering?"
                      : "Your collection has room to grow."
                  }
                  copy={
                    current.length
                      ? "No garments match these choices. Try clearing a filter to see more."
                      : "Add a garment with its photograph in the owner workspace."
                  }
                  action={
                    current.length
                      ? "Clear all filters"
                      : "Open owner workspace"
                  }
                  onAction={() =>
                    current.length
                      ? actions.browse({ filters: { ...EMPTY_FILTERS } })
                      : actions.owner()
                  }
                />
              )}
            </>
          )}
          {browse.page === "product" &&
            (picked ? (
              <ProductDetail
                item={picked}
                input={input}
                actions={actions}
                price={price}
              />
            ) : (
              <Empty
                title="Find something you love."
                copy={
                  browse.productId
                    ? "This garment is no longer in this collection."
                    : "Choose a garment to see its photographs, options and details."
                }
                action="Explore the collection"
                onAction={() => actions.browse({ page: "collection" })}
              />
            ))}
        </div>
        <footer className={styles.footer}>
          <div>
            <strong>{design.name}</strong>
            <span>Clothing, considered.</span>
          </div>
          <p>Temporary demo store · Illustrative prices and inventory</p>
          <button onClick={actions.owner}>
            {preview ? "Back to garment review" : "Owner workspace"} ↗
          </button>
        </footer>
      </div>
    </section>
  );
}
function photoFor(item: StoreItem, input: StorefrontInput) {
  return item.photoIds.map((id) => input.photos.get(id)).find(Boolean);
}
function categoryLabel(value: string) {
  return value
    .replaceAll("-", " ")
    .replace(/^./u, (letter) => letter.toUpperCase());
}
function Empty({
  title,
  copy,
  action,
  onAction,
}: {
  title: string;
  copy: string;
  action: string;
  onAction(): void;
}) {
  return (
    <section className={styles.empty}>
      <span className={styles.eyebrow}>Room for possibility</span>
      <h2>{title}</h2>
      <p>{copy}</p>
      <button className={styles.primary} onClick={onAction}>
        {action}
        <Icon name="arrow" />
      </button>
    </section>
  );
}
function ProductCard({
  item,
  input,
  onSelect,
  onFailure,
  price,
}: {
  item: StoreItem;
  input: StorefrontInput;
  onSelect(id: string): void;
  onFailure(id: string): void;
  price(cents: number): string;
}) {
  const [view, setView] = useState(0),
    photos = item.photoIds.flatMap((id) =>
      input.photos.get(id) ? [input.photos.get(id)!] : [],
    ),
    photo = photos[view % Math.max(1, photos.length)];
  const sizes = [
    ...new Set(
      item.variants
        .filter(({ stock }) => stock > 0)
        .map(({ variant }) => variant.size),
    ),
  ];
  const varyingPrice = item.variants.some(
    ({ variant }) => variant.price !== item.price,
  );
  return (
    <article className={styles.card} data-product-id={item.product.id}>
      <div className={styles.cardImage}>
        <button
          aria-label={`View ${item.product.title}`}
          onClick={() => onSelect(item.product.id)}
        >
          {photo ? (
            <GarmentImage
              photo={photo}
              title={item.product.title}
              onFailure={onFailure}
            />
          ) : (
            <span className={styles.noPhoto}>Photo needs repair</span>
          )}
        </button>
        {!item.available && (
          <span className={styles.stockBadge}>
            {!photos.length ? "Photo unavailable" : "Sold out"}
          </span>
        )}
        {photos.length > 1 && (
          <button
            className={styles.nextPhoto}
            aria-label={`Next supplied photo of ${item.product.title}`}
            onClick={() => setView(view + 1)}
          >
            ↻ {(view % photos.length) + 1}/{photos.length}
          </button>
        )}
      </div>
      <div className={styles.cardBody}>
        <span>{categoryLabel(item.product.category)}</span>
        <button
          className={styles.cardTitle}
          onClick={() => onSelect(item.product.id)}
        >
          {item.product.title}
        </button>
        <p className={styles.price}>
          {varyingPrice ? "From " : ""}
          {item.price === null ? "No active options" : price(item.price)}
        </p>
        <p className={styles.cardOptions}>
          {sizes.length ? sizes.join(" · ") : "No available sizes"}
        </p>
      </div>
    </article>
  );
}
function ProductDetail({
  item,
  input,
  actions,
  price,
}: {
  item: StoreItem;
  input: StorefrontInput;
  actions: StorefrontActions;
  price(cents: number): string;
}) {
  const selected = item.variants.find(
    ({ variant }) => variant.id === input.browse.variantId,
  );
  const [quantity, setQuantity] = useState(1);
  const photos = item.photoIds.flatMap((id) =>
    input.photos.get(id) ? [input.photos.get(id)!] : [],
  );
  const colours = [
    ...new Set(item.variants.map(({ variant }) => variant.colour)),
  ];
  const sizes = [...new Set(item.variants.map(({ variant }) => variant.size))];
  const choose = (variant: Variant | undefined) => {
    if (variant) actions.browse({ variantId: variant.id });
  };
  const canBuy =
    !input.preview &&
    item.available &&
    selected &&
    selected.stock >= quantity &&
    !!actions.addToBag;
  return (
    <>
      <button
        className={styles.back}
        onClick={() => actions.browse({ page: "collection" })}
      >
        ← Back to the collection
      </button>
      <div className={styles.detail}>
        <GarmentGallery
          key={item.product.id}
          photos={photos}
          title={item.product.title}
          onFailure={actions.photoFailed}
        />
        <section className={styles.purchase}>
          <span className={styles.eyebrow}>
            {categoryLabel(item.product.category)}
          </span>
          <h1>{item.product.title}</h1>
          <p className={styles.detailPrice}>
            {selected
              ? price(selected.variant.price)
              : item.price === null
                ? "Options unavailable"
                : price(item.price)}
          </p>
          {item.product.archived && (
            <p className={styles.problem}>
              This garment has been archived. It is no longer available to
              purchase.
            </p>
          )}
          {!photos.length && (
            <p className={styles.problem}>
              This photo needs repair before purchasing.{" "}
              <button className={styles.textButton} onClick={actions.owner}>
                Open owner workspace ↗
              </button>
            </p>
          )}
          <p className={styles.description}>{item.product.description}</p>
          <fieldset className={styles.options} disabled={item.product.archived}>
            <legend>
              Colour{" "}
              {selected && knownColour(selected.variant.colour)
                ? `· ${selected.variant.colour}`
                : ""}
            </legend>
            {colours.filter(knownColour).length ? (
              <div>
                {colours.filter(knownColour).map((colour) => (
                  <button
                    key={colour}
                    aria-pressed={selected?.variant.colour === colour}
                    onClick={() =>
                      choose(
                        item.variants.find(
                          ({ variant }) =>
                            variant.colour === colour &&
                            variant.size === selected?.variant.size,
                        )?.variant ??
                          item.variants.find(
                            ({ variant }) => variant.colour === colour,
                          )?.variant,
                      )
                    }
                  >
                    {colour}
                  </button>
                ))}
              </div>
            ) : (
              <p className={styles.muted}>Colour has not been confirmed.</p>
            )}
          </fieldset>
          <fieldset className={styles.options} disabled={item.product.archived}>
            <legend>
              {SIZING_LABELS[item.product.sizingSystemId]}{" "}
              {selected ? `· ${selected.variant.size}` : "· Choose an option"}
            </legend>
            <div>
              {sizes.map((size) => {
                const match = matchingOption(
                  item,
                  size,
                  selected?.variant.colour,
                );
                return (
                  <button
                    key={size}
                    disabled={!match || match.stock <= 0}
                    aria-pressed={selected?.variant.size === size}
                    onClick={() => choose(match?.variant)}
                  >
                    {size}
                    {!match || match.stock <= 0 ? <span>Sold out</span> : null}
                  </button>
                );
              })}
            </div>
            <p className={styles.caption}>
              Demo sizing options. No measurements or fit guarantee inferred
              from photographs.
            </p>
          </fieldset>
          <p className={styles.availability} role="status">
            {item.product.archived
              ? "Archived garment"
              : !photos.length
                ? "Photo unavailable"
                : !item.available
                  ? "Currently sold out"
                  : selected
                    ? `${selected.stock} available in this option`
                    : "Choose a size to check this option."}
          </p>
          <div className={styles.buyRow}>
            <label>
              <span className={styles.srOnly}>Quantity</span>
              <select
                aria-label="Quantity"
                value={quantity}
                onChange={(event) => setQuantity(Number(event.target.value))}
              >
                {[1, 2, 3, 4, 5].map((number) => (
                  <option key={number}>{number}</option>
                ))}
              </select>
            </label>
            <button
              className={styles.primary}
              disabled={!canBuy}
              onClick={() => {
                if (canBuy && selected)
                  actions.addToBag?.(
                    item.product.id,
                    selected.variant.id,
                    quantity,
                  );
              }}
            >
              <Icon name="bag" />
              {!item.available
                ? "Unavailable"
                : !selected
                  ? "Choose your size"
                  : "Add to bag"}
            </button>
          </div>
          {input.preview ? (
            <p className={styles.caption}>
              Preview your collection. Enter your store to begin shopping.
            </p>
          ) : !actions.addToBag ? (
            <p className={styles.caption}>
              Shopping will be available when your demo bag is ready.
            </p>
          ) : null}
          <details className={styles.facts}>
            <summary>Garment details</summary>
            <dl>
              {item.product.attributes
                .filter(
                  (attribute) =>
                    attribute.value !== null &&
                    attribute.provenance !== "unknown",
                )
                .map((attribute) => (
                  <div key={attribute.name}>
                    <dt>{categoryLabel(attribute.name)}</dt>
                    <dd>
                      {attribute.value}
                      {attribute.review === "draft" ? (
                        <small> · Awaiting confirmation</small>
                      ) : null}
                    </dd>
                  </div>
                ))}
            </dl>
            {!item.product.attributes.some(
              (attribute) =>
                attribute.value !== null && attribute.provenance !== "unknown",
            ) && (
              <p>
                Additional material, care and fit details have not been
                supplied.
              </p>
            )}
          </details>
          <details className={styles.facts}>
            <summary>About this demo</summary>
            <p>
              These are illustrative prices, size options and inventory. Orders
              in this temporary demo do not create payments or shipments.
            </p>
          </details>
        </section>
      </div>
    </>
  );
}
function AppliedFilters({
  filters,
  price,
  onChange,
}: {
  filters: Filters;
  price(cents: number): string;
  onChange(value: Filters): void;
}) {
  const chips: { key: keyof Filters; label: string }[] = [];
  if (filters.search)
    chips.push({ key: "search", label: `Search: ${filters.search}` });
  if (filters.category)
    chips.push({ key: "category", label: categoryLabel(filters.category) });
  if (filters.colour) chips.push({ key: "colour", label: filters.colour });
  if (filters.size) chips.push({ key: "size", label: `Size ${filters.size}` });
  if (filters.minPrice !== null)
    chips.push({ key: "minPrice", label: `From ${price(filters.minPrice)}` });
  if (filters.maxPrice !== null)
    chips.push({ key: "maxPrice", label: `Up to ${price(filters.maxPrice)}` });
  if (filters.available) chips.push({ key: "available", label: "In stock" });
  return chips.length ? (
    <div className={styles.chips} aria-label="Applied filters">
      {chips.map(({ key, label }) => (
        <button
          key={key}
          aria-label={`Remove ${label} filter`}
          onClick={() => onChange({ ...filters, [key]: EMPTY_FILTERS[key] })}
        >
          {label} ×
        </button>
      ))}
      <button
        className={styles.textButton}
        onClick={() => onChange({ ...EMPTY_FILTERS })}
      >
        Clear all
      </button>
    </div>
  ) : null;
}
function FilterSheet({
  input,
  actions,
}: {
  input: StorefrontInput;
  actions: StorefrontActions;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    opener = useRef<HTMLButtonElement>(null),
    [error, setError] = useState("");
  const { filters } = input.browse,
    options = filterOptions(input.items);
  const close = () => ref.current?.close();
  return (
    <>
      <button
        ref={opener}
        className={styles.filterButton}
        onClick={() => {
          setError("");
          ref.current?.showModal();
        }}
      >
        Filters +
      </button>
      <dialog
        ref={ref}
        className={styles.filterDialog}
        aria-labelledby="store-filters-heading"
        onClose={() => opener.current?.focus({ preventScroll: true })}
      >
        <div className={styles.sheetHeading}>
          <h2 id="store-filters-heading">Find your favourite.</h2>
          <button autoFocus aria-label="Close filters" onClick={close}>
            ×
          </button>
        </div>
        <form
          key={JSON.stringify(filters)}
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const minimum = String(data.get("minPrice") ?? "").trim(),
              maximum = String(data.get("maxPrice") ?? "").trim();
            const min = minimum ? parseUsd(minimum) : null,
              max = maximum ? parseUsd(maximum) : null;
            if ((min && !min.ok) || (max && !max.ok)) {
              setError("Use a valid USD price with up to two decimal places.");
              return;
            }
            const parsed = FiltersSchema.safeParse({
              ...filters,
              category: data.get("category") || null,
              colour: data.get("colour") || null,
              size: data.get("size") || null,
              minPrice: min?.ok ? min.value : null,
              maxPrice: max?.ok ? max.value : null,
              available: data.get("available") === "on",
            });
            if (!parsed.success) {
              setError(
                "The minimum price must be no greater than the maximum.",
              );
              return;
            }
            actions.browse({ filters: parsed.data });
            close();
          }}
        >
          <label>
            Category
            <select name="category" defaultValue={filters.category ?? ""}>
              <option value="">All clothing</option>
              {options.categories.map((value) => (
                <option key={value} value={value}>
                  {categoryLabel(value)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Colour
            <select name="colour" defaultValue={filters.colour ?? ""}>
              <option value="">All known colours</option>
              {options.colours.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            Size
            <select name="size" defaultValue={filters.size ?? ""}>
              <option value="">All size labels</option>
              {options.sizes.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <fieldset className={styles.priceFields}>
            <legend>Price range · USD</legend>
            <label>
              Minimum
              <input
                name="minPrice"
                inputMode="decimal"
                maxLength={12}
                placeholder="0.00"
                defaultValue={
                  filters.minPrice === null
                    ? ""
                    : (filters.minPrice / 100).toFixed(2)
                }
              />
            </label>
            <label>
              Maximum
              <input
                name="maxPrice"
                inputMode="decimal"
                maxLength={12}
                placeholder="Any price"
                defaultValue={
                  filters.maxPrice === null
                    ? ""
                    : (filters.maxPrice / 100).toFixed(2)
                }
              />
            </label>
          </fieldset>
          <label className={styles.check}>
            <input
              name="available"
              type="checkbox"
              defaultChecked={filters.available}
            />{" "}
            In stock with an available photograph
          </label>
          {error && (
            <p className={styles.problem} role="alert">
              {error}
            </p>
          )}
          <button className={styles.primary} type="submit">
            Show my matches <Icon name="arrow" />
          </button>
          <button
            className={styles.textButton}
            type="button"
            onClick={() => {
              actions.browse({ filters: { ...EMPTY_FILTERS } });
              close();
            }}
          >
            Clear all filters
          </button>
        </form>
      </dialog>
    </>
  );
}
