"use client";
import { Button } from "../../components/ui/button";
import { useSession } from "../session/context";
import { formatUsd } from "@retailor/commerce/money";
import { stockOf } from "@retailor/commerce/selectors";
import { Field, SelectField } from "./fields";
import styles from "./operations.module.css";
export function OrderForm() {
  const { controller, ownerForm, state } = useSession();
  if (!ownerForm) return null;
  const variants = state.graph.products
    .filter((p) => !p.archived)
    .flatMap((p) =>
      p.variants
        .filter((v) => !v.archived)
        .map((v) => ({
          id: v.id,
          label: `${p.title} · ${v.size} · ${v.colour} · ${v.sku} · ${formatUsd(v.price)} · ${stockOf(state.graph, v.id)} units`,
          variant: v,
        })),
    );
  const available = variants.filter(
    (v) => !ownerForm.lines.some((l) => l.variantId === v.id),
  );
  if (ownerForm.type === "advanceOrder")
    return (
      <SelectField
        name="state"
        label="Simulated fulfilment"
        choices={[
          { id: "shipped", label: "Mark shipped" },
          { id: "fulfilled", label: "Mark fulfilled" },
        ]}
      />
    );
  if (ownerForm.type !== "saveOrderDraft")
    return (
      <p>
        Review this exact known order/draft. Placed snapshots are immutable; no
        payment or shipping service is called.
      </p>
    );
  return (
    <>
      <p>
        This is an owner-created order for a fictional shopper. It does not
        increase the storefront conversion funnel. Saving a draft changes no
        stock or sales.
      </p>
      <SelectField
        name="buyerId"
        label="Fictional customer (optional)"
        choices={state.graph.buyers.map((buyer) => ({
          id: buyer.id,
          label: `${buyer.label} · Fictional`,
        }))}
      />
      <div className={styles.lines}>
        {ownerForm.lines.map((line) => (
          <article key={line.variantId}>
            <strong>
              {variants.find((v) => v.id === line.variantId)?.label ??
                "Unavailable option"}
            </strong>
            <label className={styles.field}>
              <span>Quantity</span>
              <select
                value={line.quantity}
                aria-label={`Quantity for ${variants.find((v) => v.id === line.variantId)?.label ?? line.variantId}`}
                onChange={(event) =>
                  controller.editOwnerRows(
                    "lines",
                    ownerForm.lines.map((l) =>
                      l.variantId === line.variantId
                        ? { ...l, quantity: event.target.value }
                        : l,
                    ),
                  )
                }
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
            <Button
              type="button"
              variant="quiet"
              onClick={() =>
                controller.editOwnerRows(
                  "lines",
                  ownerForm.lines.filter((l) => l.variantId !== line.variantId),
                )
              }
            >
              Remove line
            </Button>
          </article>
        ))}
      </div>
      <label className={styles.field}>
        <span>Add a known garment option</span>
        <select
          value=""
          disabled={ownerForm.lines.length >= 8}
          onChange={(event) => {
            if (event.target.value)
              controller.editOwnerRows("lines", [
                ...ownerForm.lines,
                { variantId: event.target.value, quantity: "1" },
              ]);
          }}
        >
          <option value="">Choose an option</option>
          {available.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label}
            </option>
          ))}
        </select>
      </label>
      <div className={styles.group}>
        <Field name="discount" label="Merchandise discount" money />
        <Field name="delivery" label="Sample delivery" money />
        <Field name="tax" label="Simulated tax" money />
      </div>
    </>
  );
}
