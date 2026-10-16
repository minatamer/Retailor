"use client";
import type { ChatMessage } from "./conversation";
import { replyCurrent } from "./conversation";
import type { AssistantContext } from "@retailor/contracts/assistant";
import { colourImageIds } from "@retailor/contracts/product";
import { useSession } from "../session/context";
import {
  resolveDashboardTarget,
  factDisplay,
  labelOf,
} from "../dashboard/model";
import type { DashboardModel } from "../dashboard/model";
import { formatDisplay } from "@retailor/commerce/currency";
import { stockOf } from "@retailor/commerce/selectors";
import { formatUsd } from "@retailor/commerce/money";
import styles from "./tailor.module.css";
import { OPERATION_LABELS } from "../operations/form-shell";
import { layoutLabel } from "../store-design/presets";
import { GarmentImage, type StorePhoto } from "../storefront/gallery";
export function Reply({
  message,
  context,
  model,
}: {
  message: ChatMessage;
  context: AssistantContext;
  model: DashboardModel | null;
}) {
  const { controller, state } = useSession(),
    result = message.result;
  const current =
    !!result && !message.restored && replyCurrent(result, context);
  return (
    <article
      data-tailor-message={message.id}
      className={`${styles.chatMessage} ${message.author === "user" ? styles.userMessage : ""}`}
    >
      <small>
        {message.author === "user" ? "You" : "Tailor"}
        {message.scenarioId !== state.graph.scenarioId
          ? " · Earlier scenario"
          : message.restored
            ? " · Restored text"
            : !current && result
              ? " · Earlier view"
              : ""}
      </small>
      <p>{message.text}</p>
      {current &&
        result?.reply.claims
          .filter((claim) => claim.kind === "attribute")
          .map((claim, index) => {
            const product = state.graph.products.find(
                (p) => p.id === claim.productId,
              ),
              attribute = product?.attributes.find(
                (a) =>
                  a.name === claim.name &&
                  a.review === "confirmed" &&
                  a.provenance !== "unknown" &&
                  a.provenance !== "demo_default" &&
                  a.value === claim.value,
              );
            return attribute ? (
              <p key={`attribute:${index}`} className={styles.note}>
                {product?.title} · Reviewed {attribute.name}: {attribute.value}{" "}
                · {attribute.provenance.replaceAll("_", " ")}
              </p>
            ) : null;
          })}
      {result && !current && (
        <p className={styles.note}>
          This saved explanation is inert. Ask for a fresh summary to see
          current facts and actions.
        </p>
      )}
      {current && result && (
        <div className={styles.referenceList} aria-label="Current sources">
          {result.reply.references.map((ref, index) => {
            let title: string, detail: string;
            let thumbnail: StorePhoto | undefined;
            if (ref.kind === "fact") {
              const target = ref.day
                ? { kind: "day" as const, day: ref.day, factId: ref.factId }
                : ref.productId &&
                    (ref.factId === "product_net_contribution" ||
                      ref.factId === "net_units")
                  ? {
                      kind: "product" as const,
                      productId: ref.productId,
                      factId: ref.factId,
                    }
                  : { kind: "metric" as const, factId: ref.factId };
              const found = model
                ? resolveDashboardTarget(model, target, state.dashboard.series)
                : null;
              if (!found) return null;
              title = labelOf(found.fact);
              detail = `${factDisplay(found.fact)} · ${ref.day ?? "Selected period"} · ${found.fact.dateBasis}`;
            } else if (ref.kind === "product" || ref.kind === "variant") {
              const product = state.graph.products.find((p) =>
                ref.kind === "product"
                  ? p.id === ref.productId
                  : p.variants.some((v) => v.id === ref.variantId),
              );
              const variant = product?.variants.find((v) =>
                ref.kind === "variant" ? v.id === ref.variantId : !v.archived,
              );
              if (!product) return null;
              const available = controller.photos.availableIds();
              const photoId = colourImageIds(product, variant?.colour).find(
                (id) => available.has(id),
              );
              const photo = photoId
                ? controller.photos.view(photoId)
                : undefined;
              if (photo && photoId) thumbnail = { ...photo, id: photoId };
              title = product.title;
              detail = variant
                ? `${formatDisplay(variant.price, context.currency)} · ${variant.size} · ${variant.colour} · ${stockOf(state.graph, variant.id)} available units`
                : "No active options";
            } else {
              title = `${ref.recordKind} · Show source`;
              detail = "Inspect this exact current record";
            }
            return (
              <button
                key={`${ref.kind}:${index}`}
                className={thumbnail ? styles.garmentReference : undefined}
                onClick={() =>
                  controller.openAssistantReference(message.id, index)
                }
              >
                {thumbnail && (
                  <span className={styles.referencePhoto}>
                    <GarmentImage
                      photo={thumbnail}
                      title=""
                      onFailure={(id) =>
                        controller.photos.reportUnavailable(id)
                      }
                    />
                  </span>
                )}
                <span className={styles.referenceContent}>
                  <strong>{title}</strong>
                  <span>{detail}</span>
                  <small>Show source ↗</small>
                </span>
              </button>
            );
          })}
        </div>
      )}
      {current && result?.reply.proposal && (
        <div className={styles.proposal}>
          <p>
            {result.reply.proposal.kind === "operation"
              ? "Editable draft only. Review the photo, values and exact effects before confirming."
              : result.reply.proposal.kind === "operation-choices"
                ? `Choose the exact record for: ${OPERATION_LABELS[result.reply.proposal.operation]}.`
                : result.reply.proposal.kind === "bag"
                  ? `Review quantity ${result.reply.proposal.quantity}, the exact option and its current price on the product page.`
                  : result.reply.proposal.kind === "scenario"
                    ? "Review replacement activity and stock before switching this story."
                    : result.reply.proposal.kind === "logo-offer"
                      ? "Optional separate logo batch. Your wordmark stays ready to use."
                      : "Preview these choices before accepting your look."}
          </p>
          {result.reply.proposal.kind === "design" &&
            result.reply.proposal.pageTemplates && (
              <p>
                {layoutLabel({
                  ...context.design,
                  pageTemplates: result.reply.proposal.pageTemplates,
                })}
              </p>
            )}
          {result.reply.proposal.kind === "operation-choices" ? (
            <>
              <div className={styles.referenceList}>
                {result.reply.proposal.targetIds.map((id) => {
                  const g = state.graph;
                  const product = g.products.find(
                    (p) => p.id === id || p.variants.some((v) => v.id === id),
                  );
                  const variant = product?.variants.find((v) => v.id === id);
                  const expense =
                    g.expenseDrafts.find((e) => e.id === id) ??
                    g.expenses.find((e) => e.id === id);
                  const order = g.orders.find((o) => o.id === id);
                  const returned = g.returns.find((r) => r.id === id);
                  return (
                    <button
                      key={id}
                      onClick={() =>
                        controller.prepareAssistantProposal(message.id, id)
                      }
                    >
                      <strong>
                        {product?.title ??
                          (expense
                            ? `${expense.category} expense`
                            : returned
                              ? "Physical return"
                              : order
                                ? order.lines
                                    .map((line) => line.title)
                                    .join(" / ")
                                : "Current draft / receipt")}
                      </strong>
                      <span>
                        {variant
                          ? `${variant.size} · ${variant.colour} · ${variant.sku}`
                          : order
                            ? `${order.state} · ${order.placedAt.slice(0, 10)} · Original total ${formatUsd(order.total)}`
                            : expense
                              ? `${expense.category} · ${formatUsd(expense.amount)} · ${expense.note}`
                              : (returned?.state ?? "Current draft / receipt")}
                      </span>
                      <small>Exact reference: {id}</small>
                    </button>
                  );
                })}
              </div>
              {!result.reply.proposal.targetIds.length && (
                <p>
                  No eligible current record matches. Open its owner register or
                  refine the request.
                </p>
              )}
              {result.reply.proposal.moreMatches && (
                <p>
                  More matching records exist. Refine your request or choose the
                  exact record from its owner register.
                </p>
              )}
            </>
          ) : (
            <button
              onClick={() => controller.prepareAssistantProposal(message.id)}
            >
              {result.reply.proposal.kind === "bag"
                ? "Review on product page"
                : result.reply.proposal.kind === "logo-offer"
                  ? "Explore optional logos"
                  : result.reply.proposal.kind === "design"
                    ? "Preview these choices"
                    : "Open editable review"}{" "}
              ↗
            </button>
          )}
        </div>
      )}
    </article>
  );
}
