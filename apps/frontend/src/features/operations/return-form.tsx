"use client";
import { useSession } from "../session/context";
import { Field, SelectField } from "./fields";
import { formatUsd } from "@retailor/commerce/money";
import { refundable } from "@retailor/commerce/selectors";
import styles from "./operations.module.css";
export function ReturnForm() {
  const { controller, ownerForm, state } = useSession();
  if (!ownerForm) return null;
  const form = ownerForm,
    returned = state.graph.returns.find((r) => r.id === form.targetId),
    order = state.graph.orders.find(
      (o) => o.id === (returned?.orderId ?? form.targetId),
    );
  if (!order) return <p>Choose a current known order or physical return.</p>;
  const remaining = refundable(state.graph, order.id);
  if (form.type === "issueRefund")
    return (
      <>
        <p>
          Financial refunds do not restore stock or reverse sold cost. Amounts
          below are the remaining discounted components.
        </p>
        {form.refunds.map((row) => (
          <label className={styles.field} key={row.lineId}>
            <span>
              {order.lines.find((l) => l.id === row.lineId)?.title} · refundable{" "}
              {formatUsd(
                remaining.lines.find((l) => l.lineId === row.lineId)?.amount ??
                  0,
              )}{" "}
              · USD
            </span>
            <input
              inputMode="decimal"
              maxLength={16}
              value={row.amount}
              onChange={(event) =>
                controller.editOwnerRows(
                  "refunds",
                  form.refunds.map((r) =>
                    r.lineId === row.lineId
                      ? { ...r, amount: event.target.value }
                      : r,
                  ),
                )
              }
            />
          </label>
        ))}
        <Field
          name="refundDelivery"
          label={`Delivery refund (remaining ${formatUsd(remaining.delivery)})`}
          money
        />
        <Field
          name="refundTax"
          label={`Tax refund (remaining ${formatUsd(remaining.tax)})`}
          money
        />
      </>
    );
  if (form.type === "advanceReturn")
    return (
      <SelectField
        name="state"
        label="Physical return lifecycle"
        choices={[
          { id: "approved", label: "Approve requested return" },
          { id: "closed", label: "Close return" },
        ]}
      />
    );
  if (form.type === "restockReturn")
    return (
      <p>
        Restores only already received, inspected restockable units, once. It
        reverses those sold-cost snapshots without issuing a financial refund.
      </p>
    );
  const receipt = form.type === "receiveReturn";
  return (
    <>
      {!receipt && (
        <SelectField
          name="reason"
          label="Return reason"
          choices={[
            { id: "sizing", label: "Sizing" },
            { id: "changed-mind", label: "Changed mind" },
            { id: "damaged", label: "Damaged" },
            { id: "other", label: "Other" },
          ]}
        />
      )}
      <p>
        {receipt
          ? "Receiving records physical units. Select which inspected units are restockable; none are restored until a separate Restock action."
          : "Select exact shipped units. A request creates no stock restoration or financial refund."}
      </p>
      {order.lines.map((line) => {
        const units = receipt
          ? (returned?.lines.find((l) => l.lineId === line.id)?.units ?? [])
          : Array.from({ length: line.quantity }, (_, i) => i).filter(
              (unit) =>
                !state.graph.returns.some(
                  (prior) =>
                    prior.orderId === order.id &&
                    prior.receivedAt &&
                    prior.lines.some(
                      (l) => l.lineId === line.id && l.units.includes(unit),
                    ),
                ),
            );
        return (
          <fieldset key={line.id}>
            <legend>
              {line.title} · {line.size}
            </legend>
            {units.map((unit) => {
              const chosen =
                form.unitsSelection.find((s) => s.lineId === line.id)?.units ??
                [];
              return (
                <label className={styles.check} key={unit}>
                  <input
                    type="checkbox"
                    checked={chosen.includes(unit)}
                    onChange={(event) => {
                      const next = event.target.checked
                        ? [...chosen, unit]
                        : chosen.filter((u) => u !== unit);
                      controller.editOwnerRows("unitsSelection", [
                        ...form.unitsSelection.filter(
                          (s) => s.lineId !== line.id,
                        ),
                        ...(next.length
                          ? [{ lineId: line.id, units: next }]
                          : []),
                      ]);
                    }}
                  />
                  {receipt ? "Inspected restockable" : "Return"} unit {unit + 1}
                </label>
              );
            })}
          </fieldset>
        );
      })}
    </>
  );
}
