"use client";
import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "../../components/ui/button";
import { Icon } from "../../components/ui/icon";
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
import { CurrencyPicker } from "../currency/picker";
import { selectedScope } from "../currency/display";
import { OwnerWorkspace } from "../dashboard/owner-workspace";
import { OwnerDesign } from "../store-design/owner-design";
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
  if (!ready)
    return (
      <main className={styles.opening}>
        <span className={styles.spinner} />
        <p role="status">Preparing a fresh workspace…</p>
      </main>
    );
  return (
    <main className={styles.workspace}>
      <header className={styles.header}>
        <Link href="/" className={styles.wordmark}>
          retailor <Icon name="sparkle" />
        </Link>
        <span className={styles.temporary}>Your temporary clothing studio</span>
        <div className={styles.headerActions}>
          {state.graph.products.length > 0 && (
            <Button variant="quiet" onClick={() => controller.exportReport()}>
              Export JSON
            </Button>
          )}
          <Button variant="quiet" onClick={() => controller.askReset()}>
            Reset demo
          </Button>
        </div>
      </header>
      {state.fixture && (
        <p className={styles.fixture}>
          Development fixture · Paid calls disabled · Authored garment drafts
          for local UI testing, not live recognition.
        </p>
      )}
      <div className={styles.main}>
        {!["storefront", "dashboard"].includes(state.stage) && (
          <ol className={styles.steps} aria-label="Store creation progress">
            {["Photos", "Draft", "Review", "Make it yours"].map(
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
              <div className={styles.intro}>
                <span className={styles.eyebrow}>
                  From photographs to possibility
                </span>
                <h1>
                  Bring the clothes.
                  <br />
                  <em>Meet their next chapter.</em>
                </h1>
                <p>
                  A collection of your own, or fifteen beautiful photos to begin
                  with.
                </p>
              </div>
              {state.draft && (
                <Button
                  variant="secondary"
                  onClick={() => controller.go("catalogue")}
                >
                  Continue your saved draft
                </Button>
              )}
              <div className={styles.selectionLayout}>
                <PhotoPicker
                  controller={controller.photos}
                  onProcess={() => void controller.draftCatalogue()}
                  canProcess={controller.canAttemptAi()}
                />
                <aside className={styles.sample}>
                  <span className={styles.eyebrow}>Meet FORME</span>
                  <h2>
                    Your first collection
                    <br />
                    is already here.
                  </h2>
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
                          sizes="(max-width: 900px) 25vw, 120px"
                        />
                      ))}
                  </div>
                  <p>
                    15 original generated clothing photos. Every deliberate
                    draft interprets the selected inputs.
                  </p>
                  <Button
                    disabled={sampleBusy}
                    onClick={() => void controller.sample()}
                  >
                    {sampleBusy ? "Loading photos…" : "Use the 15-photo sample"}
                    <Icon name="arrow" />
                  </Button>
                  {sampleBusy && (
                    <Button variant="quiet" onClick={() => controller.cancel()}>
                      Cancel sample loading
                    </Button>
                  )}
                  <p className={styles.finePrint}>
                    Use photos you own or have permission to use. Live AI
                    processing sends selected previews to OpenAI. This demo is
                    temporary.
                  </p>
                </aside>
              </div>
            </>
          )}
          {state.stage === "process" && <Processing step={processStep} />}
          {state.stage === "catalogue" && <CatalogueReview />}
          {(state.stage === "style" || state.stage === "storefront") && (
            <div
              className={
                state.stage === "style" && state.setup.expanded
                  ? styles.styleLayout
                  : ""
              }
            >
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
      <footer className={styles.footer}>
        A clothing demo, made with Retailor. USD is the editable money
        authority. No real payment or shipping.
        <span>
          Your workspace lasts two hours from creation. Reset clears owned local
          work; it cannot recall dispatched AI requests or saved exports.
          Browser close does not guarantee immediate physical deletion.
        </span>
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
      <h1>
        Good things
        <br />
        <em>are coming into focus.</em>
      </h1>
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
      <p className={styles.finePrint}>
        {state.fixture
          ? "Local authored fixture processing; no AI request is made."
          : "Waiting for the actual result. No percentage is estimated."}
      </p>
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
  return (
    <>
      <Storefront
        input={{
          design: preview ? state.previewDesign : state.acceptedDesign,
          ...(controller.logoUrl(
            (preview ? state.previewDesign : state.acceptedDesign).logoId,
          )
            ? {
                logoUrl: controller.logoUrl(
                  (preview ? state.previewDesign : state.acceptedDesign).logoId,
                )!,
              }
            : {}),
          items,
          photos,
          browse: state.browse,
          preview,
          currency: selectedScope(state.currency),
          bagCount: state.graph.bag.reduce(
            (sum, line) => sum + line.quantity,
            0,
          ),
          ...(!preview ? { currencyControl: <CurrencyPicker /> } : {}),
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
      {state.stage === "storefront" && (
        <div className={styles.actionBar}>
          <Button variant="secondary" onClick={() => controller.go("style")}>
            Revisit the look
          </Button>
          <Button onClick={() => controller.go("dashboard")}>
            Owner dashboard <Icon name="arrow" />
          </Button>
        </div>
      )}
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
