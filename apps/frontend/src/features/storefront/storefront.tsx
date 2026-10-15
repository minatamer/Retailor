"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { USD_SCOPE } from "@retailor/contracts/currency";
import type { CurrencyScope } from "@retailor/contracts/currency";
import {
  displayMinor,
  formatDisplay,
  formatMinor,
} from "@retailor/commerce/currency";
import type { Design } from "@retailor/contracts/design";
import { pageTemplate } from "@retailor/contracts/design";
import type { Variant } from "@retailor/contracts/product";
import { colourImageIds } from "@retailor/contracts/product";
import { Icon } from "../../components/ui/icon";
import { merchantStyle } from "../store-design/presets";
import {
  collection,
  EMPTY_FILTERS,
  filterOptions,
  knownColour,
  SIZING_LABELS,
  matchingOption,
  categoryLabel,
} from "./browse";
import type { BrowseState, Filters, StoreItem } from "./browse";
import { GarmentGallery, GarmentImage } from "./gallery";
import { PhotoStack } from "../photos/photo-stack";
import { HomeCampaign } from "./home";
import { FilterSheet } from "./filter-sheet";
import type { StorePhoto } from "./gallery";
import type { ProductFeedback } from "./review-model";
import { ProductReviews } from "./reviews";
import styles from "./storefront.module.css";

export interface StorefrontInput {
  illustration?: "compact" | "full";
  fullPage?: boolean;
  design: Design;
  items: readonly StoreItem[];
  browse: BrowseState;
  photos: ReadonlyMap<string, StorePhoto>;
  preview: boolean;
  currency?: CurrencyScope;
  bagCount?: number;
  logoUrl?: string;
  logoSize?: { width: number; height: number };
  feedback?: readonly ProductFeedback[];
}
export interface StorefrontActions {
  browse(patch: Partial<BrowseState>, expectedCurrency?: CurrencyScope): void;
  owner(): void;
  photoFailed(id: string): void;
  logoFailed?: (id: string) => void;
  openBag?: () => void;
  addToBag?: (productId: string, variantId: string, quantity: number) => void;
}
export function Storefront({
  input: suppliedInput,
  actions,
}: {
  input: StorefrontInput;
  actions: StorefrontActions;
}) {
  const input = {
    ...suppliedInput,
    design: {
      ...suppliedInput.design,
      template: pageTemplate(suppliedInput.design, suppliedInput.browse.page),
    },
  };
  const { design, browse, items, preview } = input;
  const current = items.filter((item) => !item.product.archived);
  const scope = input.currency ?? USD_SCOPE;
  const filtered = collection(items, browse, (cents) =>
    displayMinor(cents, scope),
  );
  const picked = items.find((item) => item.product.id === browse.productId);
  const first = current.find((item) => item.photoIds.length) ?? current[0];
  const price = (cents: number) => formatDisplay(cents, scope);
  const body = useRef<HTMLDivElement>(null),
    frame = useRef<HTMLDivElement>(null);
  const previous = useRef(`${browse.page}:${browse.productId ?? ""}`);
  useEffect(() => {
    if (input.illustration) return;
    const next = `${browse.page}:${browse.productId ?? ""}`;
    if (previous.current !== next) {
      if (
        !document.activeElement?.matches(
          "input,textarea,[contenteditable=true]",
        )
      )
        body.current?.focus({ preventScroll: true });
      frame.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    previous.current = next;
  }, [browse.page, browse.productId, input.illustration]);
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
      data-illustration={input.illustration}
      data-full-page={input.fullPage ? "true" : undefined}
      aria-label={`${design.name} storefront`}
    >
      <div className={styles.storeFrame} ref={frame}>
        <header className={styles.header}>
          <button
            className={styles.wordmark}
            aria-label={`${design.name} home`}
            onClick={() => actions.browse({ page: "home" })}
          >
            {input.logoUrl && design.logoId ? (
              <Image
                unoptimized
                width={input.logoSize?.width ?? 180}
                height={input.logoSize?.height ?? 42}
                className={styles.logo}
                src={input.logoUrl}
                alt=""
                onError={() => actions.logoFailed?.(design.logoId!)}
              />
            ) : (
              design.name
            )}
          </button>
          <nav aria-label="Store pages" data-tailor-target="store-pages">
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
              data-tailor-target="store-bag"
            >
              <Icon name="bag" />
              <span>Bag{input.bagCount ? ` (${input.bagCount})` : ""}</span>
            </button>
          )}
        </header>
        <div
          className={styles.page}
          data-page={browse.page}
          key={browse.page}
          ref={body}
          tabIndex={-1}
        >
          {browse.page === "home" && (
            <>
              {first ? (
                <HomeCampaign
                  design={design}
                  items={current}
                  photos={input.photos}
                  select={select}
                  explore={() => openCollection()}
                  onFailure={actions.photoFailed}
                />
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
                      <h2>A few to begin with.</h2>
                      <span className={styles.eyebrow}>
                        The collection, up close
                      </span>
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
            <div className={styles.collectionLayout}>
              <div className={styles.collectionHeading}>
                <h1>
                  {browse.filters.category
                    ? categoryLabel(browse.filters.category)
                    : "The collection."}
                </h1>
                <span className={styles.eyebrow}>{design.name} / Clothing</span>
                <p>
                  {design.template === "gallery"
                    ? "A closer look, one garment at a time."
                    : "Find your kind of clothing."}
                </p>
              </div>
              <nav
                className={styles.collectionCategories}
                aria-label="Collection categories"
              >
                <span className={styles.eyebrow}>Browse clothing</span>
                {[null, ...filterOptions(items).categories].map((category) => (
                  <button
                    key={category ?? "all"}
                    aria-pressed={browse.filters.category === category}
                    onClick={() =>
                      actions.browse({
                        filters: { ...browse.filters, category },
                      })
                    }
                  >
                    {category ? categoryLabel(category) : "All clothing"}
                    <span>
                      {
                        current.filter(
                          (item) =>
                            !category || item.product.category === category,
                        ).length
                      }
                    </span>
                  </button>
                ))}
              </nav>
              <div className={styles.collectionResults}>
                <div
                  className={styles.collectionTools}
                  data-tailor-target="store-collection"
                >
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
                  price={(cents) => formatMinor(cents, scope.currency)}
                  onChange={(filters) => actions.browse({ filters }, scope)}
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
              </div>
            </div>
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
          {input.logoUrl && design.logoId ? (
            <Image
              unoptimized
              width={input.logoSize?.width ?? 240}
              height={input.logoSize?.height ?? 56}
              className={styles.footerLogo}
              src={input.logoUrl}
              alt={design.name}
              onError={() => actions.logoFailed?.(design.logoId!)}
            />
          ) : (
            <strong>{design.name}</strong>
          )}
          {!(input.fullPage && !preview) && (
            <button onClick={actions.owner} data-tailor-target="store-owner">
              {preview ? "Back to garment review" : "Owner workspace"} ↗
            </button>
          )}
        </footer>
      </div>
    </section>
  );
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
    shownIds = new Set(
      colourImageIds(item.product, input.browse.filters.colour ?? undefined),
    ),
    photos = item.photoIds
      .filter((id) => shownIds.has(id))
      .flatMap((id) => (input.photos.get(id) ? [input.photos.get(id)!] : [])),
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
          {photo && photos.length > 1 ? (
            <PhotoStack
              photos={[
                ...photos.slice(view % photos.length),
                ...photos.slice(0, view % photos.length),
              ]}
              label={item.product.title}
              showCount={false}
              onFailure={onFailure}
            />
          ) : photo ? (
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
            {item.photoIds.length !== item.product.imageIds.length
              ? "Photo needs repair"
              : "Sold out"}
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
  const activeColour =
    selected?.variant.colour ??
    item.variants.find(
      ({ variant }) => variant.colour === input.browse.filters.colour,
    )?.variant.colour;
  const shownIds = new Set(colourImageIds(item.product, activeColour));
  const photos = item.photoIds
    .filter((id) => shownIds.has(id))
    .flatMap((id) => (input.photos.get(id) ? [input.photos.get(id)!] : []));
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
  const heading = (
    <div className={styles.productHeading}>
      <h1>{item.product.title}</h1>
      <span className={styles.eyebrow}>
        {categoryLabel(item.product.category)}
      </span>
      <p className={styles.detailPrice}>
        {selected
          ? price(selected.variant.price)
          : item.price === null
            ? "Options unavailable"
            : price(item.price)}
      </p>
    </div>
  );
  return (
    <>
      <button
        className={styles.back}
        onClick={() => actions.browse({ page: "collection" })}
      >
        ← Back to the collection
      </button>
      <div className={styles.productIntro}>
        {input.design.template === "pulse" && heading}
      </div>
      <div className={styles.detail}>
        <GarmentGallery
          key={item.product.id}
          photos={photos}
          title={item.product.title}
          presentation={
            input.design.template === "studio"
              ? "contact"
              : input.design.template === "pulse"
                ? "stage"
                : "theatre"
          }
          onFailure={actions.photoFailed}
        />
        <section className={styles.purchase}>
          {input.design.template !== "pulse" && heading}
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
          {item.product.description && (
            <p className={styles.description}>{item.product.description}</p>
          )}
          <fieldset
            className={styles.options}
            disabled={item.product.archived}
            data-tailor-target="store-product"
          >
            <legend>
              Colour{" "}
              {activeColour && knownColour(activeColour)
                ? `· ${activeColour}`
                : ""}
            </legend>
            {colours.filter(knownColour).length ? (
              <div>
                {colours.filter(knownColour).map((colour) => (
                  <button
                    key={colour}
                    aria-label={`Colour: ${colour}`}
                    aria-pressed={activeColour === colour}
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
                    {(() => {
                      const photoId = item.product.colourPhotos?.find(
                        (row) =>
                          row.colour.toLowerCase() === colour.toLowerCase(),
                      )?.photoIds[0];
                      const photo = photoId
                        ? input.photos.get(photoId)
                        : undefined;
                      return photo ? (
                        <span className={styles.colourPhoto}>
                          <GarmentImage
                            photo={photo}
                            title=""
                            onFailure={actions.photoFailed}
                          />
                        </span>
                      ) : null;
                    })()}
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
                const match = matchingOption(item, size, activeColour);
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
              : item.photoIds.length !== item.product.imageIds.length
                ? "A saved photo needs repair"
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
      <ProductReviews
        productId={item.product.id}
        feedback={input.feedback ?? []}
      />
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
