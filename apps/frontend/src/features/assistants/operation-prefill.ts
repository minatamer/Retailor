import type { AssistantProposal } from "@retailor/contracts/assistant";
import { editOwnerField, OwnerFormSchema } from "../operations/state";
import type { OwnerForm, OwnerField } from "../operations/state";
type Prefill = Extract<AssistantProposal, { kind: "operation" }>["prefill"];
/** Validate the complete detached suggestion before any animation starts. No domain records are touched. */
export function prefillFields(
  form: OwnerForm,
  prefill: Prefill,
): readonly [OwnerField, string][] {
  const allowed = ["createProduct", "updateProduct"].includes(form.type)
    ? ["title", "category"]
    : ["saveExpenseDraft", "correctExpense", "voidExpense"].includes(form.type)
      ? ["note"]
      : [];
  const fields = Object.entries(prefill).filter(
    ([field, value]) => value !== null && allowed.includes(field),
  ) as [OwnerField, string][];
  fields.reduce(
    (draft, [field, value]) =>
      OwnerFormSchema.parse(editOwnerField(draft, field, value, "suggestion")),
    form,
  );
  return fields;
}
/** One bounded timer, cancelled by its session owner; no focus movement or DOM writes. */
export function animatePrefill(
  fields: readonly [OwnerField, string][],
  write: (field: OwnerField, value: string) => boolean,
  highlight: (field: OwnerField | null) => void,
) {
  let stopped = false,
    index = 0,
    timer: ReturnType<typeof setTimeout> | undefined;
  const step = () => {
    if (stopped) return;
    const field = fields[index++];
    if (!field) {
      highlight(null);
      return;
    }
    highlight(field[0]);
    timer = setTimeout(() => {
      if (stopped) return;
      if (!write(...field)) {
        highlight(null);
        return;
      }
      timer = setTimeout(step, 240);
    }, 160);
  };
  timer = setTimeout(step, 160);
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}
