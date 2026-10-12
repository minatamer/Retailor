"use client";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Design } from "@retailor/contracts/design";
import { Button, Choice } from "../../components/ui/button";
import { formatDisplay, formatMinor } from "@retailor/commerce/currency";
import { selectedScope } from "../currency/display";
import { Icon } from "../../components/ui/icon";
import { useSession } from "../session/context";
import { PALETTES, TEMPLATES, TYPOGRAPHIES } from "../store-design/presets";
import { namedFiles } from "../photos/photo-picker";
import { GarmentImage } from "../storefront/gallery";
import { logoEligible, brandValues } from "./setup";
import type { SetupStep } from "./setup";
import styles from "./tailor.module.css";
const PROMPTS: Record<SetupStep, { title: string; text: string }> = {
  introduction: {
    title: "Hello, possibility.",
    text: "I’m Tailor. Your clothes already have a home. Let’s give it a look that feels like you.",
  },
  template: {
    title: "A home for your collection.",
    text: "Three complete looks. Each includes a home, a collection and a product page. Try one and watch your actual store change.",
  },
  theme: {
    title: "Set the mood.",
    text: "Four considered palettes. Each keeps your clothes in focus, with clear buttons and readable details.",
  },
  typography: {
    title: "Find your voice.",
    text: "A little personality, beautifully legible. These are the same fonts you’ll see throughout your store.",
  },
  brand: {
    title: "Make it yours.",
    text: "Give your collection a name, a line and, if you like, a hero photo. The suggested details are ready to use.",
  },
  logo: {
    title: "Your name, beautifully set.",
    text: "Your wordmark already uses your chosen type. Keep it, or explore the optional three-logo path.",
  },
  summary: {
    title: "Your collection. Your look.",
    text: "Take a look around the preview. You can revisit any choice before entering your store.",
  },
};
const LABELS = {
  template: "Layout",
  theme: "Colour",
  typography: "Type",
  brand: "Brand",
  logo: "Wordmark",
  summary: "Ready",
  introduction: "Welcome",
};
/** One mounted shell; local finite actions precede grounded conversation in RTL-013. */
export function Tailor() {
  const { controller, state, preparedLogo } = useSession();
  const visible = ["style", "storefront", "dashboard"].includes(state.stage);
  const creator = state.stage === "style",
    expanded = state.setup.expanded;
  const launcher = useRef<HTMLButtonElement>(null),
    heading = useRef<HTMLHeadingElement>(null),
    conversation = useRef<HTMLDivElement>(null);
  const previous = useRef({ step: state.setup.step, expanded });
  const [viewport, setViewport] = useState({ height: 0, bottom: 0 });
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const measure = () =>
      setViewport({
        height: vv.height,
        bottom: Math.max(0, window.innerHeight - vv.height - vv.offsetTop),
      });
    measure();
    vv.addEventListener("resize", measure);
    vv.addEventListener("scroll", measure);
    return () => {
      vv.removeEventListener("resize", measure);
      vv.removeEventListener("scroll", measure);
    };
  }, []);
  useEffect(() => {
    const last = previous.current;
    if (visible && last.expanded && !expanded)
      launcher.current?.focus({ preventScroll: true });
    else if (
      visible &&
      expanded &&
      (!last.expanded || last.step !== state.setup.step)
    ) {
      heading.current?.focus({ preventScroll: true });
      const pane = conversation.current,
        title = heading.current;
      if (pane && title)
        pane.scrollTo({
          top: Math.max(
            0,
            title.getBoundingClientRect().top -
              pane.getBoundingClientRect().top +
              pane.scrollTop -
              14,
          ),
          behavior: "smooth",
        });
    }
    previous.current = { step: state.setup.step, expanded };
  }, [expanded, state.setup.step, visible]);
  if (!visible) return null;
  const prompt = PROMPTS[state.setup.step];
  return (
    <aside
      className={styles.shell}
      style={
        viewport.height
          ? ({
              "--tailor-height": `${viewport.height}px`,
              "--keyboard-inset": `${viewport.bottom}px`,
            } as CSSProperties)
          : undefined
      }
      aria-label="Tailor assistant"
    >
      {!expanded ? (
        <button
          ref={launcher}
          className={styles.launcher}
          onClick={() => controller.toggleTailor(true)}
        >
          <span className={styles.avatar}>
            <Icon name="sparkle" />
          </span>
          <span>
            <strong>
              {creator ? "Continue styling with Tailor" : "Meet Tailor"}
            </strong>
            <small>
              {creator
                ? LABELS[state.setup.step]
                : state.stage === "dashboard"
                  ? "Your collection, at a glance"
                  : "Find your next favourite"}
            </small>
          </span>
          <Icon name="arrow" />
        </button>
      ) : (
        <section className={styles.panel} aria-labelledby="tailor-title">
          <header className={styles.header}>
            <span className={styles.avatar}>
              <Icon name="sparkle" />
            </span>
            <div>
              <strong>Tailor</strong>
              <small>
                {creator
                  ? "Your creative companion"
                  : state.stage === "dashboard"
                    ? "Owner companion"
                    : "Store companion"}
              </small>
            </div>
            <button
              onClick={() => controller.toggleTailor(false)}
              aria-label="Collapse Tailor and see full preview"
            >
              ↓
            </button>
          </header>
          <div className={styles.conversation} ref={conversation}>
            {creator ? (
              <>
                <Recap />
                <article className={styles.message} key={state.setup.step}>
                  <span className={styles.kicker}>
                    {LABELS[state.setup.step]} · Make it yours
                  </span>
                  <h2 id="tailor-title" ref={heading} tabIndex={-1}>
                    {prompt.title}
                  </h2>
                  <p>{prompt.text}</p>
                  {state.setup.step === "introduction" && (
                    <>
                      <div className={styles.welcomeArt} aria-hidden="true">
                        <span>your clothes</span>
                        <Icon name="arrow" />
                        <em>your world</em>
                      </div>
                      <Button
                        onClick={() => controller.stylingStep("template")}
                      >
                        Let’s style it <Icon name="arrow" />
                      </Button>
                    </>
                  )}
                  {(["template", "theme", "typography"] as const).map(
                    (kind) =>
                      state.setup.step === kind && (
                        <div key={kind}>
                          <DesignChoices kind={kind} />
                          <Button
                            className={styles.confirm}
                            onClick={() => controller.confirmStyle(kind)}
                          >
                            Use this{" "}
                            {kind === "theme"
                              ? "colour theme"
                              : kind === "typography"
                                ? "typography"
                                : "template"}{" "}
                            <Icon name="arrow" />
                          </Button>
                        </div>
                      ),
                  )}
                  {state.setup.step === "brand" && (
                    <>
                      <BrandFields />
                      <div className={styles.actions}>
                        <Button
                          onClick={() => controller.confirmStyle("brand")}
                        >
                          Use these details
                        </Button>
                        <Button
                          variant="quiet"
                          onClick={() => controller.keepBrandDetails()}
                        >
                          Keep suggested details
                        </Button>
                      </div>
                    </>
                  )}
                  {state.setup.step === "logo" &&
                    logoEligible(state.setup, state.previewDesign) && (
                      <>
                        <div
                          className={styles.wordmark}
                          style={{
                            fontFamily:
                              TYPOGRAPHIES[state.previewDesign.typography]
                                .heading,
                            color: PALETTES[state.previewDesign.theme].text,
                            background:
                              PALETTES[state.previewDesign.theme].canvas,
                          }}
                        >
                          {state.previewDesign.name}
                        </div>
                        <div className={styles.actions}>
                          <Button onClick={() => controller.keepWordmark()}>
                            Keep my wordmark
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => controller.prepareLogo()}
                          >
                            Generate 3 logos
                          </Button>
                        </div>
                        <p className={styles.note}>
                          {preparedLogo
                            ? "Three-logo intent prepared for this look. Generation is not connected yet; no AI call was made. Keep your wordmark to continue."
                            : "Optional logo generation is being prepared. Your wordmark is ready now."}
                        </p>
                      </>
                    )}
                  {state.setup.step === "summary" && (
                    <>
                      <div className={styles.summary}>
                        <strong>{state.previewDesign.name}</strong>
                        <span>
                          {TEMPLATES[state.previewDesign.template].label} /{" "}
                          {PALETTES[state.previewDesign.theme].label}
                        </span>
                        <span>
                          {TYPOGRAPHIES[state.previewDesign.typography].label}
                        </span>
                        <small>
                          {state.previewDesign.heroPhotoId
                            ? "Supplied hero photo"
                            : "Your actual clothes in the hero"}{" "}
                          · Text wordmark
                        </small>
                      </div>
                      <Button onClick={() => controller.acceptDesign()}>
                        Enter my store <Icon name="arrow" />
                      </Button>
                      <Button
                        variant="quiet"
                        onClick={() => controller.stylingStep("template")}
                      >
                        Revisit the choices
                      </Button>
                    </>
                  )}
                </article>
                {!["logo", "summary"].includes(state.setup.step) && (
                  <button
                    className={styles.fastPath}
                    onClick={() => controller.useCurrentLook()}
                  >
                    Love the preview? Use this look <span>→</span>
                  </button>
                )}
              </>
            ) : (
              <article className={styles.message}>
                <span className={styles.kicker}>Welcome back</span>
                <h2 id="tailor-title" ref={heading} tabIndex={-1}>
                  {state.stage === "dashboard"
                    ? "A clearer picture."
                    : "Find your kind of clothing."}
                </h2>
                <p>
                  {state.stage === "dashboard"
                    ? "Your products and these figures share one collection. Start with the overview, or refine your store’s look."
                    : "Explore the clothes, open their details and find a fit. Your store remembers where you were."}
                </p>
                <div className={styles.actions}>
                  {state.stage === "dashboard" ? (
                    <>
                      <Button
                        onClick={() => {
                          controller.beginOwnerDesign();
                          controller.toggleTailor(false);
                        }}
                      >
                        Open Design controls
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => controller.go("storefront")}
                      >
                        View storefront
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={() => {
                          controller.browse({ page: "collection" });
                          controller.toggleTailor(false);
                        }}
                      >
                        Explore the collection
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          controller.filterDisplayBudget(
                            8000,
                            selectedScope(state.currency),
                          );
                          controller.toggleTailor(false);
                        }}
                      >
                        Explore up to{" "}
                        {formatMinor(8000, state.currency.selected)}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => controller.go("style")}
                      >
                        Revisit my look
                      </Button>
                    </>
                  )}
                </div>
                <p className={styles.note}>
                  Conversation, product actions and guided tours arrive in the
                  next Tailor capability.
                </p>
              </article>
            )}
          </div>
          <footer className={styles.footer}>
            <span>
              <span className={styles.liveDot} />{" "}
              {creator
                ? "Preview changes instantly"
                : "One collection, one companion"}
            </span>
            <button onClick={() => controller.toggleTailor(false)}>
              See full preview
            </button>
          </footer>
        </section>
      )}
    </aside>
  );
}
function Recap() {
  const { controller, state } = useSession(),
    setup = state.setup;
  const choices: { step: SetupStep; label: string }[] = [];
  if (setup.template)
    choices.push({ step: "template", label: TEMPLATES[setup.template].label });
  if (setup.theme)
    choices.push({ step: "theme", label: PALETTES[setup.theme].label });
  if (setup.typography)
    choices.push({
      step: "typography",
      label: TYPOGRAPHIES[setup.typography].label,
    });
  if (setup.brandConfirmed)
    choices.push({ step: "brand", label: state.previewDesign.name });
  if (!choices.length) return null;
  return (
    <div className={styles.recap} aria-label="Confirmed styling choices">
      {choices
        .filter((choice) => choice.step !== setup.step)
        .map((choice) => (
          <div key={choice.step}>
            <span>
              <Icon name="check" size={12} /> {choice.label}
            </span>
            <button onClick={() => controller.stylingStep(choice.step)}>
              Change{" "}
              <span className={styles.srOnly}>{LABELS[choice.step]}</span>
            </button>
          </div>
        ))}
    </div>
  );
}
export function DesignChoices({
  kind,
}: {
  kind: "template" | "theme" | "typography";
}) {
  const { controller, state } = useSession(),
    design = state.previewDesign;
  const photoId = state.graph.products.find((p) => !p.archived)?.imageIds[0],
    view = photoId ? controller.photos.view(photoId) : undefined;
  const specimenProduct =
    state.graph.products.find(
      (item) => item.id === state.browse.productId && !item.archived,
    ) ?? state.graph.products.find((item) => !item.archived);
  const specimenPrice = specimenProduct?.variants.find(
    (variant) => !variant.archived,
  )?.price;
  return (
    <fieldset className={styles.choices}>
      <legend>
        {kind === "template"
          ? "Complete storefront templates"
          : kind === "theme"
            ? "Colour themes"
            : "Typography families"}
      </legend>
      {kind === "template" &&
        (Object.keys(TEMPLATES) as Design["template"][]).map((template) => (
          <Choice
            key={template}
            selected={design.template === template}
            className={styles.templateCard}
            onClick={() => controller.design({ ...design, template })}
          >
            <span
              className={styles.miniature}
              data-template={template}
              aria-hidden="true"
            >
              <span className={styles.miniHome}>
                <i />
                <em />
                {view && photoId && (
                  <GarmentImage
                    photo={{ ...view, id: photoId }}
                    title="Template specimen"
                    onFailure={(id) => controller.photos.reportUnavailable(id)}
                  />
                )}
              </span>
              <span className={styles.miniList}>
                <i />
                <i />
                <i />
              </span>
              <span className={styles.miniProduct}>
                <i />
                <em />
              </span>
            </span>
            <span>
              <strong>{TEMPLATES[template].label}</strong>
              <small>{TEMPLATES[template].description}</small>
            </span>
            <span className={styles.selectedMark}>
              {design.template === template ? (
                <Icon name="check" size={14} />
              ) : (
                "↗"
              )}
            </span>
          </Choice>
        ))}
      {kind === "theme" &&
        (Object.keys(PALETTES) as Design["theme"][]).map((theme) => (
          <Choice
            key={theme}
            selected={design.theme === theme}
            className={styles.paletteCard}
            onClick={() => controller.design({ ...design, theme })}
          >
            <span className={styles.swatches} aria-hidden="true">
              {[
                PALETTES[theme].action,
                PALETTES[theme].selected,
                PALETTES[theme].canvas,
                PALETTES[theme].text,
              ].map((colour, i) => (
                <i key={i} style={{ background: colour }} />
              ))}
            </span>
            <strong>{PALETTES[theme].label}</strong>
            <small>{PALETTES[theme].mood}</small>
          </Choice>
        ))}
      {kind === "typography" &&
        (Object.keys(TYPOGRAPHIES) as Design["typography"][]).map(
          (typography) => (
            <Choice
              key={typography}
              selected={design.typography === typography}
              className={styles.typeCard}
              onClick={() => controller.design({ ...design, typography })}
            >
              <span
                style={{
                  fontFamily: TYPOGRAPHIES[typography].heading,
                  fontWeight: TYPOGRAPHIES[typography].weight,
                }}
                className={styles.specimen}
              >
                Wear your world.
              </span>
              <span style={{ fontFamily: TYPOGRAPHIES[typography].body }}>
                <strong>{TYPOGRAPHIES[typography].label}</strong>
                <small>Considered clothes. Everyday favourites.</small>
                <small>
                  {specimenPrice === undefined
                    ? "Price unavailable"
                    : `${formatDisplay(specimenPrice, selectedScope(state.currency))} · ${state.currency.selected}`}
                </small>
              </span>
            </Choice>
          ),
        )}
    </fieldset>
  );
}
export function BrandFields() {
  const { controller, state, heroBusy } = useSession(),
    draft = state.setup.brandDraft ?? brandValues(state.previewDesign);
  const photos = state.photos.filter((p) =>
    controller.photos.availableIds().has(p.id),
  );
  return (
    <div className={styles.brandFields}>
      <label>
        Store name <small>{draft.name.length}/40</small>
        <input
          value={draft.name}
          maxLength={40}
          autoComplete="off"
          onChange={(event) =>
            controller.brandInput({ name: event.target.value })
          }
        />
      </label>
      <label>
        Hero headline <small>{draft.headline.length}/100</small>
        <textarea
          value={draft.headline}
          maxLength={100}
          rows={2}
          onChange={(event) =>
            controller.brandInput({ headline: event.target.value })
          }
        />
      </label>
      <label>
        Hero photo
        <select
          value={draft.heroPhotoId ?? ""}
          onChange={(event) =>
            controller.brandInput({ heroPhotoId: event.target.value || null })
          }
        >
          <option value="">Use the collection’s first available photo</option>
          {photos.map((photo, i) => (
            <option key={photo.id} value={photo.id}>
              {state.graph.products.find((p) => p.imageIds.includes(photo.id))
                ?.title ?? `Supplied photo ${i + 1}`}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.upload}>
        {" "}
        {heroBusy ? "Checking your hero photo…" : "Upload a hero photo"}
        <input
          type="file"
          disabled={heroBusy}
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => {
            const file = namedFiles(event.target.files)[0];
            event.target.value = "";
            if (file) void controller.uploadHero(file);
          }}
        />
      </label>
      <p className={styles.note}>
        Optional JPEG, PNG or WebP, up to 4 MiB. A hero photo is separate from
        product recognition.
      </p>
    </div>
  );
}
