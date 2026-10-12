"use client";
import { useSession } from "../session/context";
import { stockOf } from "@retailor/commerce/selectors";
import { Field, SelectField } from "./fields";
export function InventoryForm() {
  const { ownerForm, state } = useSession();
  if (!ownerForm) return null;
  const choices = state.graph.products.flatMap((p) =>
      p.variants.map((v) => ({
        id: v.id,
        label: `${p.title} · ${v.size} · ${v.colour} · ${v.sku} · ${stockOf(state.graph, v.id)} available`,
      })),
    ),
    type = ownerForm.type;
  return (
    <>
      <SelectField
        name="variantId"
        label="Exact garment option"
        choices={choices}
      />
      {type === "setUnitCost" ? (
        <>
          <Field name="cost" label="Future unit cost" money />
          <p>
            Changes future sale/writeoff snapshots. Past orders retain their
            recorded costs.
          </p>
        </>
      ) : (
        <>
          <Field
            name={type === "writeoffStock" ? "quantity" : "units"}
            label={
              type === "writeoffStock"
                ? "Available units to write off"
                : "Signed unit change (for example 3 or -2)"
            }
            maxLength={6}
          />
          {type === "adjustStock" && (
            <SelectField
              name="kind"
              label="Movement reason type"
              choices={[
                { id: "inbound", label: "New stock received" },
                { id: "correction", label: "Reasoned count correction" },
              ]}
            />
          )}
          <Field name="reason" label="Explain this change" maxLength={120} />
          <p>
            {type === "writeoffStock"
              ? "Writes off available inventory and its current demo cost once. A damaged sold return is handled separately and does not create another warehouse loss."
              : "Creates a new signed movement. Current stock must remain nonnegative; old movements are preserved."}
          </p>
        </>
      )}
    </>
  );
}
