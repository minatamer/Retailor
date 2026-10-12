"use client";
import type { ChatMessage } from "./conversation";
import { replyCurrent } from "./conversation";
import type { AssistantContext } from "@retailor/contracts/assistant";
import { useSession } from "../session/context";
import {
  resolveDashboardTarget,
  factDisplay,
  labelOf,
} from "../dashboard/model";
import type { DashboardModel } from "../dashboard/model";
import { formatDisplay } from "@retailor/commerce/currency";
import { stockOf } from "@retailor/commerce/selectors";
import styles from "./tailor.module.css";
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
                onClick={() =>
                  controller.openAssistantReference(message.id, index)
                }
              >
                <strong>{title}</strong>
                <span>{detail}</span>
                <small>Show source ↗</small>
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
              : result.reply.proposal.kind === "bag"
                ? `Review quantity ${result.reply.proposal.quantity}, the exact option and its current price on the product page.`
                : result.reply.proposal.kind === "scenario"
                  ? "Review replacement activity and stock before switching this story."
                  : result.reply.proposal.kind === "logo-offer"
                    ? "Optional separate logo batch. Your wordmark stays ready to use."
                    : "Preview these choices before accepting your look."}
          </p>
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
        </div>
      )}
    </article>
  );
}
