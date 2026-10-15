import Image from "next/image";
import type { Design } from "@retailor/contracts/design";
import { pageTemplate } from "@retailor/contracts/design";
import { formatUsd } from "@retailor/commerce/money";
import { Icon } from "../../components/ui/icon";
import { merchantStyle } from "./presets";
import styles from "./store-composition.module.css";

export type { StorePage } from "@retailor/contracts/design";
import type { StorePage } from "@retailor/contracts/design";
export interface StorePresentation {
  id: string;
  title: string;
  priceMinor: number;
  image: string;
  alt: string;
  category: string;
  color: string;
  available: boolean;
}
export function StoreComposition({
  design: suppliedDesign,
  page,
  products,
  activeProduct,
  onPage,
  onProduct,
}: {
  design: Design;
  page: StorePage;
  products: readonly StorePresentation[];
  activeProduct: StorePresentation;
  onPage(page: StorePage): void;
  onProduct(product: StorePresentation): void;
}) {
  const design = {
    ...suppliedDesign,
    template: pageTemplate(suppliedDesign, page),
  };
  const heroProduct = products[0] ?? activeProduct;
  return (
    <section
      className={`${styles.store} ${styles[design.template]}`}
      style={merchantStyle(design)}
      aria-label={`${design.name} ${page} design preview`}
    >
      <header className={styles.header}>
        <button className={styles.wordmark} onClick={() => onPage("home")}>
          {design.name}
          <span className={styles.wordmarkDot} aria-hidden="true">
            ✳
          </span>
        </button>
        <nav aria-label="Preview store pages" className={styles.nav}>
          <button
            onClick={() => onPage("collection")}
            aria-current={page === "collection" ? "page" : undefined}
          >
            Collection
          </button>
          <button
            onClick={() => onPage("product")}
            aria-current={page === "product" ? "page" : undefined}
          >
            The details
          </button>
        </nav>
        <span className={styles.bag}>
          <Icon name="bag" />
          <span>Bag · preview</span>
        </span>
      </header>
      <div
        key={`${page}-${design.template}-${design.theme}-${design.typography}`}
        className={styles.page}
      >
        {page === "home" && (
          <>
            <div className={styles.hero}>
              <div className={styles.heroCopy}>
                <h2>{design.headline || "Good clothes. Great days."}</h2>
                <span className={styles.kicker}>
                  The everyday collection / 01
                </span>
                <p>
                  A little more considered. A little more you. Find your
                  everyday, beautifully reimagined.
                </p>
                <button
                  className={styles.action}
                  onClick={() => onPage("collection")}
                >
                  Explore the collection <Icon name="arrow" />
                </button>
                <span className={styles.heroIndex}>
                  01 — Made for your everyday
                </span>
              </div>
              <button
                className={styles.heroImage}
                onClick={() => onProduct(heroProduct)}
                aria-label={`View ${heroProduct.title}`}
              >
                <Image
                  src={heroProduct.image}
                  alt={heroProduct.alt}
                  width={1122}
                  height={1402}
                  sizes="(max-width: 600px) 100vw, (max-width: 1200px) 60vw, 650px"
                  loading="eager"
                />
                <span className={styles.imageCaption}>
                  {heroProduct.title}
                  <span>
                    {formatUsd(heroProduct.priceMinor)} <Icon name="arrow" />
                  </span>
                </span>
              </button>
            </div>
            <div className={styles.collectionIntro}>
              <div>
                <h3>Fewer things. Better choices.</h3>
                <span className={styles.kicker}>The collection</span>
              </div>
              <button onClick={() => onPage("collection")}>
                Discover all {products.length} <Icon name="arrow" />
              </button>
            </div>
            <ProductGrid products={products} onProduct={onProduct} />
          </>
        )}
        {page === "collection" && (
          <>
            <div className={styles.collectionHeading}>
              <h2>The everyday edit.</h2>
              <span className={styles.kicker}>
                Considered from the first stitch
              </span>
              <p>{products.length} pieces. A wardrobe of possibilities.</p>
            </div>
            <div className={styles.filterLine}>
              <span>All clothing · {products.length} items</span>
              <span>Search, filters & sorting · design specimen</span>
            </div>
            <ProductGrid products={products} onProduct={onProduct} />
          </>
        )}
        {page === "product" && (
          <>
            <button
              className={styles.back}
              onClick={() => onPage("collection")}
            >
              ← Back to the collection
            </button>
            <div className={styles.detail}>
              <div className={styles.detailImage}>
                <Image
                  src={activeProduct.image}
                  alt={activeProduct.alt}
                  width={1122}
                  height={1402}
                  sizes="(max-width: 600px) 100vw, 55vw"
                />
              </div>
              <div className={styles.purchase}>
                <h2>{activeProduct.title}</h2>
                <span className={styles.kicker}>
                  {activeProduct.category} / The everyday collection
                </span>
                <p className={styles.price}>
                  {formatUsd(activeProduct.priceMinor)}
                </p>
                <p className={styles.description}>
                  A considered addition to your everyday. This visual reference
                  shows the buying hierarchy; product facts and orders connect
                  in later tickets.
                </p>
                <div className={styles.optionLabel}>
                  Colour <strong>{activeProduct.color}</strong>
                </div>
                <div className={styles.optionLabel}>
                  Size <span>Demo sizing specimen</span>
                </div>
                <div className={styles.sizes} aria-label="Demo size examples">
                  {["XS", "S", "M", "L", "XL"].map((size) => (
                    <span key={size}>{size}</span>
                  ))}
                </div>
                <p
                  className={
                    activeProduct.available ? styles.stock : styles.soldOut
                  }
                >
                  {activeProduct.available
                    ? "Available · design example"
                    : "Unavailable · design example"}
                </p>
                <button className={styles.action} disabled>
                  Bag interaction arrives in the demo <Icon name="bag" />
                </button>
                <details className={styles.details}>
                  <summary>Details & care</summary>
                  <p>
                    Material and care are not verified for this design-reference
                    image. The real catalogue will keep unknown facts explicit.
                  </p>
                </details>
              </div>
            </div>
          </>
        )}
      </div>
      <footer className={styles.footer}>
        <span>{design.name}</span>
        <span>Design reference · No real orders</span>
      </footer>
    </section>
  );
}
function ProductGrid({
  products,
  onProduct,
}: {
  products: readonly StorePresentation[];
  onProduct(product: StorePresentation): void;
}) {
  return (
    <div className={styles.grid}>
      {products.map((product, index) => (
        <button
          className={styles.card}
          key={product.id}
          onClick={() => onProduct(product)}
        >
          <span className={styles.productImage}>
            <Image
              src={product.image}
              alt={product.alt}
              width={1122}
              height={1402}
              sizes="(max-width: 600px) 45vw, (max-width: 1200px) 30vw, 380px"
            />
            {!product.available && (
              <span className={styles.badge}>Unavailable</span>
            )}
            <span className={styles.cardArrow}>
              <Icon name="arrow" />
            </span>
          </span>
          <span className={styles.productMeta}>
            <span className={styles.productName}>{product.title}</span>
            <span className={styles.cardPrice}>
              {formatUsd(product.priceMinor)}
            </span>
          </span>
          <span className={styles.productColor}>
            {product.color}
            <span>0{index + 1}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
