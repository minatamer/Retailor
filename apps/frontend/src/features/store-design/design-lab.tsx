"use client";
import { useState } from "react";
import Link from "next/link";
import type { Design } from "@retailor/contracts/design";
import { Button, Choice } from "../../components/ui/button";
import { Icon } from "../../components/ui/icon";
import { PALETTES, TEMPLATES, TYPOGRAPHIES } from "./presets";
import {
  StoreComposition,
  type StorePage,
  type StorePresentation,
} from "./store-composition";
import { DashboardSpecimen } from "./dashboard-specimen";
import styles from "./design-lab.module.css";

const REFERENCE_PRODUCTS: readonly StorePresentation[] = [
  {
    id: "reference_shirt",
    title: "The everyday camp shirt",
    priceMinor: 5400,
    image: "/design/reference-shirt.png",
    alt: "Original AI-generated ivory camp-collar shirt on a pale stone background",
    category: "Shirts",
    color: "Ivory",
    available: true,
  },
  {
    id: "reference_hoodie",
    title: "The relaxed hoodie",
    priceMinor: 6400,
    image: "/design/reference-hoodie.png",
    alt: "Original AI-generated charcoal pullover hoodie on a light-gray background",
    category: "Hoodies",
    color: "Charcoal",
    available: true,
  },
  {
    id: "reference_jeans",
    title: "Straight-leg denim",
    priceMinor: 6800,
    image: "/design/reference-jeans.png",
    alt: "Original AI-generated indigo straight-leg jeans on a pale stone background",
    category: "Jeans",
    color: "Indigo",
    available: false,
  },
];
const INITIAL_DESIGN: Design = {
  template: "studio",
  theme: "ink",
  typography: "editorial",
  name: "FORME",
  headline: "Good clothes. Great days.",
  revision: 0,
};
type StyleStep = "template" | "theme" | "type" | "photo";
export function DesignLab() {
  const [design, setDesign] = useState(INITIAL_DESIGN);
  const [page, setPage] = useState<StorePage>("home");
  const [productId, setProductId] = useState("reference_shirt");
  const [step, setStep] = useState<StyleStep>("template");
  const [chatOpen, setChatOpen] = useState(false);
  const [pressure, setPressure] = useState(false);
  const [notice, setNotice] = useState(
    "Studio, Ink / Paper, Editorial. A considered place to start.",
  );
  const products = pressure
    ? REFERENCE_PRODUCTS.map((product, index) =>
        index === 0
          ? {
              ...product,
              title:
                "The exceptionally considered everyday camp-collar shirt with a beautifully relaxed silhouette",
            }
          : product,
      )
    : REFERENCE_PRODUCTS;
  const activeProduct =
    products.find((product) => product.id === productId) ?? products[0]!;
  function update(
    patch: Partial<Pick<Design, "template" | "theme" | "typography" | "name">>,
    description: string,
  ) {
    setDesign((current) => ({
      ...current,
      ...patch,
      revision: current.revision + 1,
    }));
    setNotice(description);
  }
  return (
    <main className={styles.lab}>
      <a className={styles.skip} href="#store-reference">
        Skip to store preview
      </a>
      <header className={styles.platformHeader}>
        <Link href="/" className={styles.platformWordmark}>
          retailor
          <Icon name="sparkle" size={23} />
        </Link>
        <span className={styles.referenceTag}>The design collection / 01</span>
        <Link className={styles.workspaceLink} href="/demo">
          Demo workspace <Icon name="arrow" size={16} />
        </Link>
      </header>
      <div className={styles.intro}>
        <div>
          <p className={styles.eyebrow}>One collection. Your point of view.</p>
          <h1>
            A good look.
            <br />
            <em>Made yours.</em>
          </h1>
        </div>
        <div className={styles.introAside}>
          <p>
            Three complete store directions. Beautiful colours. Thoughtful type.
            Let Tailor show you around.
          </p>
          <Button onClick={() => setChatOpen(true)}>
            Make this look mine <Icon name="sparkle" size={17} />
          </Button>
        </div>
      </div>
      <div
        className={`${styles.workspace} ${chatOpen ? styles.chatReserved : ""}`}
      >
        <div className={styles.previewArea}>
          <div className={styles.toolbar}>
            <div
              className={styles.pageChoices}
              role="group"
              aria-label="Preview page"
            >
              {(["home", "collection", "product"] as const).map((value) => (
                <Choice
                  key={value}
                  selected={page === value}
                  onClick={() => setPage(value)}
                >
                  {value === "home"
                    ? "Store home"
                    : value === "collection"
                      ? "Collection"
                      : "Product"}
                </Choice>
              ))}
            </div>
            <span className={styles.lookLabel}>
              {TEMPLATES[design.template].label} /{" "}
              {PALETTES[design.theme].label}
            </span>
          </div>
          <div id="store-reference" className={styles.preview} tabIndex={-1}>
            <StoreComposition
              design={design}
              page={page}
              products={products}
              activeProduct={activeProduct}
              onPage={setPage}
              onProduct={(product) => {
                setProductId(product.id);
                setPage("product");
              }}
            />
          </div>
          <div className={styles.referenceNotes}>
            <span>
              Design reference · Original AI photos · Shopping connects in
              RTL-007/010
            </span>
            <label>
              <input
                type="checkbox"
                checked={pressure}
                onChange={(event) => setPressure(event.target.checked)}
              />
              Long content
            </label>
          </div>
        </div>
        {chatOpen && (
          <aside className={styles.tailor} aria-label="Tailor design reference">
            <header className={styles.tailorHeader}>
              <span className={styles.tailorAvatar}>
                <Icon name="sparkle" />
              </span>
              <div>
                <strong>Tailor</strong>
                <span>Your store, with a little guidance.</span>
              </div>
              <Button
                variant="quiet"
                aria-label="Close Tailor"
                onClick={() => setChatOpen(false)}
              >
                <Icon name="close" size={18} />
              </Button>
            </header>
            <div className={styles.chatBody}>
              <div className={styles.greeting}>
                <span className={styles.eyebrow}>
                  A little creative company
                </span>
                <h2>
                  Let’s make this
                  <br />
                  <em>feel like you.</em>
                </h2>
                <p>
                  Your collection already looks good. Now choose a
                  direction—every option is a complete look.
                </p>
              </div>
              <div
                className={styles.stepChoices}
                role="group"
                aria-label="Styling conversation step"
              >
                {(["template", "theme", "type", "photo"] as const).map(
                  (value, index) => (
                    <button
                      key={value}
                      onClick={() => setStep(value)}
                      aria-pressed={step === value}
                    >
                      <span>0{index + 1}</span>
                      {value === "template"
                        ? "Layout"
                        : value === "theme"
                          ? "Colour"
                          : value === "type"
                            ? "Type"
                            : "Photo form"}
                    </button>
                  ),
                )}
              </div>
              <div key={step} className={styles.activeStep}>
                {step === "template" && (
                  <>
                    <p className={styles.prompt}>
                      Which direction feels right?
                    </p>
                    <div className={styles.templateChoices}>
                      {Object.entries(TEMPLATES).map(([id, template]) => (
                        <Choice
                          selected={design.template === id}
                          key={id}
                          onClick={() =>
                            update(
                              { template: id as Design["template"] },
                              `${template.label} now shapes all three pages.`,
                            )
                          }
                        >
                          <span
                            className={`${styles.templateMini} ${styles[id]}`}
                            aria-hidden="true"
                          >
                            <i />
                            <i />
                            <i />
                          </span>
                          <span>
                            <strong>{template.label}</strong>
                            <small>{template.description}</small>
                          </span>
                          <span className={styles.selectedMark}>
                            {design.template === id ? "✓" : "↗"}
                          </span>
                        </Choice>
                      ))}
                    </div>
                    <Button onClick={() => setStep("theme")}>
                      Use {TEMPLATES[design.template].label}{" "}
                      <Icon name="arrow" size={16} />
                    </Button>
                  </>
                )}
                {step === "theme" && (
                  <>
                    <p className={styles.prompt}>
                      Give it your kind of colour.
                    </p>
                    <div className={styles.paletteChoices}>
                      {Object.entries(PALETTES).map(([id, palette]) => (
                        <Choice
                          key={id}
                          selected={design.theme === id}
                          onClick={() =>
                            update(
                              { theme: id as Design["theme"] },
                              `${palette.label} applied to the whole preview.`,
                            )
                          }
                        >
                          <span className={styles.swatches} aria-hidden="true">
                            {[palette.canvas, palette.action, palette.text].map(
                              (color) => (
                                <i key={color} style={{ background: color }} />
                              ),
                            )}
                          </span>
                          <strong>{palette.label}</strong>
                          <small>{palette.mood}</small>
                          <span>
                            {design.theme === id
                              ? "Selected ✓"
                              : "Try this look"}
                          </span>
                        </Choice>
                      ))}
                    </div>
                    <Button onClick={() => setStep("type")}>
                      These are my colours <Icon name="arrow" size={16} />
                    </Button>
                  </>
                )}
                {step === "type" && (
                  <>
                    <p className={styles.prompt}>Find your voice, in type.</p>
                    <div className={styles.typeChoices}>
                      {Object.entries(TYPOGRAPHIES).map(([id, type]) => (
                        <Choice
                          key={id}
                          selected={design.typography === id}
                          onClick={() =>
                            update(
                              { typography: id as Design["typography"] },
                              `${type.label} now defines headings and buying details.`,
                            )
                          }
                        >
                          <span
                            style={{
                              fontFamily: type.heading,
                              fontWeight: type.weight,
                            }}
                          >
                            Your everyday.
                          </span>
                          <small style={{ fontFamily: type.body }}>
                            The camp shirt · €71.50 · Sizes S–XL
                          </small>
                          <strong>
                            {type.label}
                            {design.typography === id ? " ✓" : ""}
                          </strong>
                        </Choice>
                      ))}
                    </div>
                    <Button
                      onClick={() =>
                        setNotice(
                          "This is your design-reference look. The full guided store flow connects in RTL-008.",
                        )
                      }
                    >
                      This feels like me <Icon name="check" size={16} />
                    </Button>
                  </>
                )}
                {step === "photo" && <PhotoFormSpecimen />}
              </div>
              <div className={styles.nameField}>
                <label htmlFor="reference-store-name">Your wordmark</label>
                <input
                  id="reference-store-name"
                  maxLength={40}
                  value={design.name}
                  onChange={(event) =>
                    update(
                      { name: event.target.value || "FORME" },
                      "Your wordmark preview is up to date.",
                    )
                  }
                />
                <small>Up to 40 characters. Plain text, beautifully set.</small>
              </div>
              <p className={styles.status} role="status">
                {notice}
              </p>
            </div>
            <footer className={styles.tailorFooter}>
              <Icon name="sparkle" size={15} />
              <span>Visual reference · Local choices, no AI calls</span>
            </footer>
          </aside>
        )}
      </div>
      <section
        className={styles.ownerSection}
        aria-labelledby="owner-reference"
      >
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>
              The other side of a beautiful store
            </p>
            <h2 id="owner-reference">Clarity looks good, too.</h2>
          </div>
          <p>
            An exact number. A beautiful chart. The records behind it. A small
            preview of the owner experience.
          </p>
        </div>
        <DashboardSpecimen />
      </section>
      <footer className={styles.platformFooter}>
        <span>Provisional design baseline · Owner feedback pending</span>
        <Link href="/demo">
          Back to the demo workspace <Icon name="arrow" size={16} />
        </Link>
      </footer>
      {!chatOpen && (
        <Button className={styles.launcher} onClick={() => setChatOpen(true)}>
          <Icon name="sparkle" />
          Make it yours with Tailor
        </Button>
      )}
    </main>
  );
}
function PhotoFormSpecimen() {
  const [name, setName] = useState("");
  return (
    <form
      className={styles.photoForm}
      onSubmit={(event) => event.preventDefault()}
    >
      <p className={styles.prompt}>Every great product starts with a photo.</p>
      <label htmlFor="reference-photo" className={styles.upload}>
        <Icon name="upload" size={27} />
        <strong>{name || "Choose a product photo"}</strong>
        <span>JPEG, PNG or WebP · Photo is required</span>
        <input
          id="reference-photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          onChange={(event) => setName(event.target.files?.[0]?.name ?? "")}
        />
      </label>
      <label htmlFor="reference-title">Product name</label>
      <input
        id="reference-title"
        type="text"
        maxLength={100}
        placeholder="Your new everyday favourite"
      />
      <p className={styles.formNote}>
        Form specimen only. Validated photo handling arrives in RTL-003; product
        creation arrives in RTL-004/014.
      </p>
      <Button type="submit" disabled>
        Review product <Icon name="arrow" size={16} />
      </Button>
    </form>
  );
}
