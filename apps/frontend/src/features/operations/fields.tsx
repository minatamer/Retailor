"use client";
import type { ChangeEvent } from "react";
import type { OwnerField } from "./state";
import { useSession } from "../session/context";
import styles from "./operations.module.css";
import { FieldFeedback, ownerFieldProps } from "./field-feedback";
import { visibleOwnerIssues } from "./validation";
export function Field({
  name,
  label,
  money = false,
  area = false,
  maxLength = 120,
}: {
  name: OwnerField;
  label: string;
  money?: boolean;
  area?: boolean;
  maxLength?: number;
}) {
  const { controller, ownerForm, ownerFilling, ownerIssues } = useSession();
  if (!ownerForm) return null;
  const issues = visibleOwnerIssues(
    ownerForm,
    ownerIssues,
    controller.photos.availableIds(),
  );
  const props = {
    ...ownerFieldProps(ownerForm, issues, name),
    "aria-label": `${label}${money ? " · USD" : ""}`,
    value: ownerForm.fields[name] ?? "",
    "data-filling": ownerFilling === name && !ownerForm.dirty.includes(name),
    maxLength,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      controller.editOwnerField(name, event.target.value),
  };
  return (
    <label className={styles.field}>
      <span>
        {label}
        {money ? " · USD" : ""}
      </span>
      {area ? (
        <textarea {...props} rows={3} />
      ) : (
        <input {...props} inputMode={money ? "decimal" : "text"} />
      )}
      <FieldFeedback form={ownerForm} issues={issues} field={name} />
    </label>
  );
}
export function SelectField({
  name,
  label,
  choices,
}: {
  name: OwnerField;
  label: string;
  choices: readonly { id: string; label: string }[];
}) {
  const { controller, ownerForm, ownerFilling, ownerIssues } = useSession();
  if (!ownerForm) return null;
  const issues = visibleOwnerIssues(
    ownerForm,
    ownerIssues,
    controller.photos.availableIds(),
  );
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <select
        {...ownerFieldProps(ownerForm, issues, name)}
        aria-label={label}
        data-filling={ownerFilling === name && !ownerForm.dirty.includes(name)}
        value={ownerForm.fields[name] ?? ""}
        onChange={(e) => controller.editOwnerField(name, e.target.value)}
      >
        <option value="">Choose an option</option>
        {choices.map((choice) => (
          <option key={choice.id} value={choice.id}>
            {choice.label}
          </option>
        ))}
      </select>
      <FieldFeedback form={ownerForm} issues={issues} field={name} />
    </label>
  );
}
