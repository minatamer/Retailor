"use client";
import { useSession } from "../session/context";
import { Field, SelectField } from "./fields";
export function ExpenseForm() {
  const { ownerForm } = useSession();
  if (!ownerForm) return null;
  const type = ownerForm.type;
  return (
    <>
      {type === "saveExpenseDraft" && (
        <SelectField
          name="expenseCategory"
          label="Demo operating expense category"
          choices={["marketing", "packaging", "platform", "operations"].map(
            (id) => ({ id, label: id.charAt(0).toUpperCase() + id.slice(1) }),
          )}
        />
      )}{" "}
      {(type === "saveExpenseDraft" || type === "correctExpense") && (
        <Field
          name="amount"
          label={
            type === "correctExpense"
              ? "Signed linked correction"
              : "Unposted expense amount"
          }
          money
        />
      )}
      {["saveExpenseDraft", "correctExpense", "voidExpense"].includes(type) && (
        <Field name="note" label="Note" maxLength={160} />
      )}
      <p>
        {type === "saveExpenseDraft"
          ? "Saving this draft does not reduce result until it is posted."
          : type === "correctExpense"
            ? "Adds a linked signed adjustment. The original posted expense remains inspectable."
            : type === "voidExpense"
              ? "Adds the linked reversal of this original expense and its corrections, once. It does not delete history."
              : "Review the actual draft. Posting affects operating result; deleting an unposted draft creates no expense."}
      </p>
    </>
  );
}
