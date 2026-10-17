"use client";
import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "../../components/ui/button";
import { Icon } from "../../components/ui/icon";
import { Brand } from "../../components/ui/brand";
import { PhotoPicker, namedFiles } from "../photos/photo-picker";
import { SAMPLE } from "../photos/sample";
import { SessionProvider, useSession } from "../session/context";
import type { CatalogueProcessor, ProcessStep } from "../session/controller";
import type { AssistantRequester } from "../assistants/request";
import type { LogoRequester } from "../logos/request";
import { CatalogueReview } from "../catalogue/review";
import { Storefront } from "../storefront/storefront";
import { storeItems } from "../storefront/browse";
import type { StorePhoto } from "../storefront/gallery";
import { Tailor } from "../assistants/tailor";
import { BagDialog } from "../bag/bag-dialog";
import { selectedScope } from "../currency/display";
import { OwnerWorkspace } from "../dashboard/owner-workspace";
import { OwnerDesign } from "../store-design/owner-design";
import { merchantStyle } from "../store-design/presets";
import styles from "./workspace.module.css";
export function Workspace({
  fixtureAllowed,
  processor,
  assistantRequest,
  logoRequest,
}: {
  fixtureAllowed: boolean;
  processor?: CatalogueProcessor;
  assistantRequest?: AssistantRequester;
  logoRequest?: LogoRequester;
}) {
  return (
    <SessionProvider
      fixtureAllowed={fixtureAllowed}
      {...(processor ? { processor } : {})}
      {...(assistantRequest ? { assistantRequest } : {})}
      {...(logoRequest ? { logoRequest } : {})}
    >
      <WorkspaceFlow />
    </SessionProvider>
  );
}
function WorkspaceFlow() {
  const {
    controller,
    state,
    notice,
    recoveryNotice,
    ready,
    sampleBusy,
    processStep,
    missingPhotoIds,
  } = useSession();
  const heading = useRef<HTMLDivElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    if (state.stage === "style")
      heading.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  }, [state.stage]);
  const step =
    state.stage === "choose"
      ? 0
      : state.stage === "process"
        ? 1
        : state.stage === "catalogue"
          ? 2
          : 3;
  const fullPage = state.stage === "storefront" || state.stage === "dashboard";
  if (!ready)
    return (
      <main className={styles.opening}>
        <span className={styles.spinner} />
        <p role="status">Preparing a fresh workspace…</p>
      </main>
    );
  return (
    <main
      className={styles.workspace}
      style={
        state.stage === "storefront"
          ? merchantStyle(
              state.designEditing ? state.previewDesign : state.acceptedDesign,
            )
          : undefined
      }
      data-owner-workspace={state.stage === "dashboard" ? "true" : undefined}
      data-storefront-workspace={
        state.stage === "storefront" ? "true" : undefined
      }
      data-full-page={fullPage ? "true" : undefined}
    >
      {!fullPage && (
        <header className={styles.header}>
          <Link href="/" className={styles.wordmark} aria-label="Retailor home">
            <Brand />
          </Link>
          <div className={styles.headerActions}>
            <Button
              variant="quiet"
              onClick={() => controller.askReset()}
              data-tailor-target="demo-reset"
            >
              Reset demo
            </Button>
          </div>
        </header>
      )}
      <div
        className={styles.main}
        data-tailor-preview={
          state.stage === "style" && state.setup.expanded ? "true" : undefined
        }
      >
        {!["storefront", "dashboard"].includes(state.stage) && (
          <ol className={styles.steps} aria-label="Store creation progress">
            {["Photos", "Draft", "Review", "Personalize"].map(
              (label, index) => (
                <li
                  key={label}
                  aria-current={index === step ? "step" : undefined}
                  data-complete={index < step}
                >
                  <span>
                    {index < step ? <Icon name="check" size={14} /> : index + 1}
                  </span>
                  {label}
                </li>
              ),
            )}
          </ol>
        )}
        <div
          ref={heading}
          tabIndex={-1}
          className={styles.stage}
          key={state.stage}
        >
          {state.stage === "choose" && (
            <>
              {state.draft && (
                <Button
                  variant="secondary"
                  onClick={() => controller.go("catalogue")}
                >
                  Continue your saved draft
                </Button>
              )}
              <PhotoPicker
                headingLevel={1}
                controller={controller.photos}
                onProcess={() => void controller.draftCatalogue()}
                canProcess={controller.canAttemptAi()}
                alternative={
                  <aside className={styles.sample}>
                    <h3>Try the sample collection</h3>
                    <p>
                      No photos handy? Try 20 photos of 15 garments, including
                      different views and colours. Preview them first, then
                      create your product draft.
                    </p>
                    <div className={styles.samplePhotos}>
                      {SAMPLE.assets
                        .filter((asset) =>
                          ["F01", "F07", "F12"].includes(asset.id),
                        )
                        .map((asset) => (
                          <Image
                            key={asset.id}
                            src={asset.path}
                            width={asset.image.width}
                            height={asset.image.height}
                            alt={`Generated sample clothing ${asset.id}`}
                            sizes="80px"
                          />
                        ))}
                    </div>
                    <Button
                      disabled={sampleBusy}
                      onClick={() => void controller.sample()}
                    >
                      {sampleBusy
                        ? "Loading photos…"
                        : `Use the ${SAMPLE.assets.length}-photo sample`}
                      <Icon name="arrow" />
                    </Button>
                    {sampleBusy && (
                      <Button
                        variant="quiet"
                        onClick={() => controller.cancel()}
                      >
                        Cancel sample loading
                      </Button>
                    )}
                    <p className={styles.finePrint}>
                      Use these sample photos to try the demo right away.
                    </p>
                  </aside>
                }
              />
            </>
          )}
          {state.stage === "process" && <Processing step={processStep} />}
          {state.stage === "catalogue" && <CatalogueReview />}
          {(state.stage === "style" || state.stage === "storefront") && (
            <div className={styles.styleLayout}>
              <CollectionCanvas />
            </div>
          )}
          {state.stage === "dashboard" && (
            <OwnerWorkspace
              design={<OwnerDesign preview={<CollectionCanvas />} />}
            />
          )}
        </div>
        {missingPhotoIds.length > 0 && (
          <section className={styles.repair}>
            <h2>Your collection is saved. Some photos need repair.</h2>
            <p>
              Missing images cannot support publication or purchasing. Reselect
              the exact original; your catalogue won’t be reprocessed.
            </p>
            {missingPhotoIds.map((id, index) => (
              <label key={id}>
                Repair saved photo {index + 1}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => {
                    const file = namedFiles(event.target.files)[0];
                    event.target.value = "";
                    if (file) void controller.repair(id, file);
                  }}
                />
              </label>
            ))}
          </section>
        )}
        <p className={styles.notice} role="status">
          {notice}
        </p>
        {recoveryNotice && (
          <p className={styles.recovery} role="status">
            {recoveryNotice}
          </p>
        )}
      </div>
      <footer
        className={styles.footer}
        data-full-page={fullPage ? "true" : undefined}
      >
        <p className={styles.attribution}>
          Powered by{" "}
          <Link href="/" aria-label="Retailor home">
            <Brand />
          </Link>
        </p>
        {fullPage && (
          <nav className={styles.footerActions} aria-label="Demo controls">
            {state.stage === "dashboard" ? (
              <button onClick={() => controller.go("storefront")}>
                View storefront
              </button>
            ) : (
              <button
                onClick={() => controller.go("style")}
                data-tailor-target="demo-personalize"
              >
                Personalize
              </button>
            )}
            <button
              onClick={() => controller.askReset()}
              data-tailor-target="demo-reset"
            >
              Reset demo
            </button>
            {state.stage === "storefront" && (
              <button
                type="button"
                onClick={() => controller.go("dashboard")}
                data-tailor-target="store-owner"
              >
                Owner workspace ↗
              </button>
            )}
          </nav>
        )}
      </footer>
      <Tailor />
      <BagDialog />
      <WorkspaceDialog />
    </main>
  );
}
const PROCESS_STEPS: ProcessStep[] = [
  "Checking photos",
  "Approving this request",
  "Drafting products",
  "Validating catalogue",
  "Preparing your preview",
];
function Processing({ step }: { step: ProcessStep }) {
  const { controller, state } = useSession(),
    current = PROCESS_STEPS.indexOf(step);
  return (
    <section className={styles.processing}>
      <div className={styles.orbit}>
        <Icon name="sparkle" size={48} />
      </div>
      <span className={styles.eyebrow}>Your collection, taking shape</span>
      <p role="status">{step}…</p>
      <ul>
        {PROCESS_STEPS.map((label, index) => (
          <li
            key={label}
            data-current={index === current}
            data-done={index < current}
          >
            {index < current ? (
              <Icon name="check" />
            ) : (
              <span
                className={index === current ? styles.spinner : styles.dot}
              />
            )}
            {label}
          </li>
        ))}
      </ul>
      {state.fixture && (
        <p className={styles.finePrint}>
          Local authored fixture processing; no AI request is made.
        </p>
      )}
      <Button variant="secondary" onClick={() => controller.cancel()}>
        Cancel and keep my photos
      </Button>
    </section>
  );
}
function CollectionCanvas() {
  const { controller, state } = useSession();
  const items = storeItems(state.graph, controller.photos.availableIds());
  const photos = new Map<string, StorePhoto>();
  for (const id of controller.photos.availableIds()) {
    const photo = controller.photos.view(id);
    if (photo) photos.set(id, { ...photo, id });
  }
  const preview = state.stage === "style" || state.designEditing;
  const design = preview ? state.previewDesign : state.acceptedDesign;
  const logoUrl = controller.logoUrl(design.logoId);
  const logo = state.logos.candidates.find(({ id }) => id === design.logoId);
  return (
    <>
      <Storefront
        input={{
          design,
          ...(logoUrl ? { logoUrl } : {}),
          ...(logo
            ? { logoSize: { width: logo.width, height: logo.height } }
            : {}),
          items,
          photos,
          feedback: state.graph.feedback,
          browse: state.browse,
          preview,
          fullPage: state.stage === "storefront",
          currency: selectedScope(state.currency),
          bagCount: state.graph.bag.reduce(
            (sum, line) => sum + line.quantity,
            0,
          ),
        }}
        actions={{
          browse: (patch, expectedCurrency) =>
            controller.browse(patch, expectedCurrency),
          photoFailed: (id) => controller.photos.reportUnavailable(id),
          logoFailed: (id) => controller.logoUnavailable(id),
          ...(!preview
            ? {
                openBag: () => controller.openBag(),
                addToBag: (
                  productId: string,
                  variantId: string,
                  quantity: number,
                ) => controller.addToBag(productId, variantId, quantity),
              }
            : {}),
          owner: () => controller.go(preview ? "catalogue" : "dashboard"),
        }}
      />
    </>
  );
}
function WorkspaceDialog() {
  const { controller, dialog } = useSession(),
    ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (dialog && !node.open) node.showModal();
    else if (!dialog && node.open) node.close();
  }, [dialog]);
  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby="workspace-confirm-title"
      onCancel={(event) => {
        event.preventDefault();
        controller.closeDialog();
      }}
    >
      <h2 id="workspace-confirm-title">
        {dialog === "leave-design"
          ? "Leave this design preview?"
          : dialog === "rebuild"
            ? "Rebuild this local demo?"
            : "Start a fresh collection?"}
      </h2>
      <p>
        {dialog === "leave-design"
          ? "You have changed this look. Discard the preview to leave, or keep editing. Your accepted storefront and commerce records are preserved."
          : dialog === "rebuild"
            ? "This replaces existing synthetic activity with a new scenario identity. Your accepted look and photos are kept."
            : "This clears this workspace’s saved metadata, owned photos and local records. Other tabs and repositories are preserved."}
      </p>
      <div>
        <Button variant="secondary" onClick={() => controller.closeDialog()}>
          {dialog === "leave-design" ? "Keep editing" : "Keep my collection"}
        </Button>
        <Button
          onClick={() => {
            if (dialog === "leave-design") controller.discardDesignAndLeave();
            else if (dialog === "rebuild") controller.publish(true);
            else void controller.reset();
          }}
        >
          {dialog === "leave-design"
            ? "Discard preview and leave"
            : dialog === "rebuild"
              ? "Rebuild demo"
              : "Reset this demo"}
        </Button>
      </div>
    </dialog>
  );
}
