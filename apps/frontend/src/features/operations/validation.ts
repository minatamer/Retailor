import { z } from "zod";
import { parseUsd } from "@retailor/commerce/money";
import type { OwnerForm } from "./state";

export type OwnerFieldIssue = { field: string; label: string; message: string };
const MAX_FIELD_ISSUES = 24;
export class OwnerInputError extends Error {
  constructor(readonly issue: OwnerFieldIssue) {
    super("An owner form field needs attention.");
  }
}
function fieldInfo(form: OwnerForm, field: string) {
  const labels: Record<string, string> = {
    title: "Garment title",
    description: "Description you can confirm",
    category: "Clothing category",
    sizingSystemId: "Named sizing convention",
    productState: "Storefront availability",
    variantId: "Exact garment option",
    units: "Signed unit change",
    quantity: "Available units to write off",
    kind: "Movement reason type",
    cost: "Future unit cost · USD",
    reason:
      form.type === "requestReturn" ? "Return reason" : "Explain this change",
    state:
      form.type === "advanceOrder"
        ? "Simulated fulfilment"
        : "Physical return lifecycle",
    discount: "Merchandise discount · USD",
    delivery: "Sample delivery · USD",
    tax: "Simulated tax · USD",
    buyerId: "Fictional customer",
    expenseCategory: "Demo operating expense category",
    note: "Note",
    amount:
      form.type === "correctExpense"
        ? "Signed linked correction · USD"
        : "Unposted expense amount · USD",
    refundDelivery: "Delivery refund · USD",
    refundTax: "Tax refund · USD",
  };
  if (Object.hasOwn(labels, field))
    return {
      label: labels[field]!,
      value: form.fields[field as keyof OwnerForm["fields"]] ?? "",
    };
  if (field === "photoIds")
    return {
      label: "Clothing photograph",
      value: form.photoIds.length ? "selected" : "",
    };
  if (field === "variants")
    return {
      label: "Garment options",
      value: form.variants.length ? "selected" : "",
    };
  if (field === "lines")
    return {
      label: "Add a known garment option",
      value: form.lines.length ? "selected" : "",
    };
  if (field === "unitsSelection")
    return {
      label: "Return units",
      value: form.unitsSelection.length ? "selected" : "",
    };
  const [group, rawIndex, key] = field.split("."),
    index = Number(rawIndex);
  if (!Number.isInteger(index) || index < 0) return null;
  if (group === "variants" && form.variants[index]) {
    const rowLabels: Record<string, string> = {
      size: "Size label",
      colour: "Colour label",
      sku: "SKU",
      price: "Price · USD",
      cost: "Future unit cost · USD",
      stock: "Opening units",
    };
    if (key && Object.hasOwn(rowLabels, key))
      return {
        label: `Option ${index + 1} · ${rowLabels[key]}`,
        value: String(
          form.variants[index]![key as keyof OwnerForm["variants"][number]],
        ),
      };
  }
  if (group === "lines" && form.lines[index])
    return {
      label: `Order line ${index + 1} · Quantity`,
      value: form.lines[index]!.quantity,
    };
  if (group === "refunds" && form.refunds[index])
    return {
      label: `Refund line ${index + 1} · Amount · USD`,
      value: form.refunds[index]!.amount,
    };
  return null;
}
export function ownerFieldIssue(
  form: OwnerForm,
  field: string,
  kind = "invalid",
): OwnerFieldIssue | null {
  const info = fieldInfo(form, field);
  if (!info) return null;
  const instruction =
    !info.value.trim() || kind === "required"
      ? "this field is required."
      : kind === "money"
        ? "enter a valid USD amount with up to two decimal places."
        : kind === "integer"
          ? "enter a whole number of units."
          : kind === "choice"
            ? "choose a valid option."
            : kind === "nonzero"
              ? "enter a non-zero whole number."
              : kind === "colour"
                ? "use the same colour name for every size of this colour."
                : kind === "range"
                  ? "enter a value within the supported range."
                  : "check this value before continuing.";
  return { field, label: info.label, message: `${info.label}: ${instruction}` };
}
export function ownerValue<T>(
  form: OwnerForm,
  field: string,
  parse: () => T,
  kind = "choice",
): T {
  try {
    return parse();
  } catch {
    const issue = ownerFieldIssue(form, field, kind);
    if (issue) throw new OwnerInputError(issue);
    throw new Error("The owner input could not be validated.");
  }
}
/** Only known schema paths become field identities; raw exception/schema prose never reaches UI. */
export function ownerInputIssues(
  form: OwnerForm,
  error: unknown,
): OwnerFieldIssue[] {
  if (error instanceof OwnerInputError) return [error.issue];
  if (!(error instanceof z.ZodError)) return [];
  const found = new Map<string, OwnerFieldIssue>();
  for (const problem of error.issues) {
    const path = [...problem.path];
    if (path[0] === "payload") path.shift();
    let field = String(path[0] ?? "");
    if (field === "imageIds" || field === "colourPhotos") field = "photoIds";
    else if (field === "category" && form.type === "saveExpenseDraft")
      field = "expenseCategory";
    else if (form.type === "issueRefund") {
      if (field === "delivery") field = "refundDelivery";
      else if (field === "tax") field = "refundTax";
      else if (field === "lines") {
        const submitted = form.refunds.flatMap((row, index) => {
          const parsed = parseUsd(row.amount);
          return parsed.ok && parsed.value > 0 ? [index] : [];
        });
        if (typeof path[1] !== "number" || submitted[path[1]] === undefined)
          continue;
        field = `refunds.${submitted[path[1]]}.amount`;
      }
    } else if (field === "lines" && form.type === "requestReturn")
      field = "unitsSelection";
    else if (field === "variants" && typeof path[1] === "number") {
      const key =
        path[2] === "unitCost"
          ? "cost"
          : path[2] === "openingStock"
            ? "stock"
            : String(path[2] ?? "size");
      field = `variants.${path[1]}.${key}`;
    } else if (field === "lines" && typeof path[1] === "number")
      field = `lines.${path[1]}.quantity`;
    const kind =
      problem.code === "invalid_value"
        ? "choice"
        : problem.code === "too_big" || problem.code === "too_small"
          ? "range"
          : problem.code === "custom" && field === "units"
            ? "nonzero"
            : "invalid";
    const issue = ownerFieldIssue(form, field, kind);
    if (issue && !found.has(field)) found.set(field, issue);
    if (found.size >= MAX_FIELD_ISSUES) break;
  }
  return [...found.values()];
}
export function requiredProductIssues(
  form: OwnerForm,
  available: ReadonlySet<string>,
) {
  if (form.type !== "createProduct" && form.type !== "updateProduct") return [];
  const issues: OwnerFieldIssue[] = [];
  if (!form.photoIds.length || form.photoIds.some((id) => !available.has(id)))
    issues.push({
      field: "photoIds",
      label: "Clothing photograph",
      message:
        "Clothing photograph: choose at least one available clothing photo.",
    });
  if (!form.fields.title?.trim())
    issues.push(ownerFieldIssue(form, "title", "required")!);
  return issues;
}
export function visibleOwnerIssues(
  form: OwnerForm,
  recorded: readonly OwnerFieldIssue[],
  available: ReadonlySet<string>,
) {
  return [
    ...new Map(
      [...recorded, ...requiredProductIssues(form, available)].map((issue) => [
        issue.field,
        issue,
      ]),
    ).values(),
  ].slice(0, MAX_FIELD_ISSUES);
}
export const ownerIssueId = (formId: string, field: string) =>
  `owner-issue-${formId}-${field}`;
export function remainingOwnerIssues(
  before: OwnerForm,
  after: OwnerForm,
  key: "variants" | "lines" | "refunds" | "photoIds" | "unitsSelection",
  issues: readonly OwnerFieldIssue[],
) {
  const sameRows =
    key === "variants"
      ? before.variants.length === after.variants.length &&
        before.variants.every(
          (row, index) => row.id === after.variants[index]?.id,
        )
      : key === "lines"
        ? before.lines.length === after.lines.length &&
          before.lines.every(
            (row, index) => row.variantId === after.lines[index]?.variantId,
          )
        : key === "refunds"
          ? before.refunds.length === after.refunds.length &&
            before.refunds.every(
              (row, index) => row.lineId === after.refunds[index]?.lineId,
            )
          : false;
  return issues.filter((issue) => {
    if (issue.field !== key && !issue.field.startsWith(`${key}.`)) return true;
    if (!sameRows || issue.field === key) return false;
    const [, rawIndex, attribute] = issue.field.split("."),
      index = Number(rawIndex);
    if (key === "variants") {
      const field = attribute as keyof OwnerForm["variants"][number];
      return before.variants[index]?.[field] === after.variants[index]?.[field];
    }
    if (key === "lines")
      return before.lines[index]?.quantity === after.lines[index]?.quantity;
    if (key === "refunds")
      return before.refunds[index]?.amount === after.refunds[index]?.amount;
    return false;
  });
}
