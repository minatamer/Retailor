"use client";
import type { ChangeEvent } from "react";
import type { OwnerField } from "./state";
import { useSession } from "../session/context";
import styles from "./operations.module.css";
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
  const { controller, ownerForm, ownerFilling } = useSession();
  if (!ownerForm) return null;
  const props = {
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
  const { controller, ownerForm, ownerFilling } = useSession();
  if (!ownerForm) return null;
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <select
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
    </label>
  );
}
