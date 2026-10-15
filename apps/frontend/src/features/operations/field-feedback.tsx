import type { OwnerForm } from "./state";
import type { OwnerFieldIssue } from "./validation";
import { ownerIssueId } from "./validation";
import styles from "./operations.module.css";

export function ownerFieldProps(
  form: OwnerForm,
  issues: readonly OwnerFieldIssue[],
  field: string,
  description?: string,
) {
  const invalid = issues.some((issue) => issue.field === field);
  return {
    "data-owner-field": field,
    "aria-invalid": invalid || undefined,
    "aria-describedby":
      [description, invalid ? ownerIssueId(form.id, field) : undefined]
        .filter(Boolean)
        .join(" ") || undefined,
  };
}
export function FieldFeedback({
  form,
  issues,
  field,
}: {
  form: OwnerForm;
  issues: readonly OwnerFieldIssue[];
  field: string;
}) {
  const issue = issues.find((item) => item.field === field);
  return issue ? (
    <p id={ownerIssueId(form.id, field)} className={styles.fieldError}>
      {issue.message}
    </p>
  ) : null;
}
