"use client";
import type { ReactNode } from "react";
import { Icon } from "../../components/ui/icon";
import { useSession } from "../session/context";
import { dashboardRecord } from "./state";
import { describeRecord, evidenceDate } from "./evidence-presentation";
import styles from "./dashboard.module.css";

export function EvidenceFields({
  items,
}: {
  items: readonly (readonly [string, ReactNode])[];
}) {
  return (
    <dl className={styles.evidenceFields}>
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
export function EvidenceDate({
  value,
  empty = "Not recorded",
}: {
  value?: string | undefined;
  empty?: string;
}) {
  return value ? (
    <time dateTime={value} title={value}>
      {evidenceDate(value)}
    </time>
  ) : (
    <span>{empty}</span>
  );
}
export function RecordLink({
  reference,
  label,
  onOpen,
}: {
  reference: string;
  label?: string;
  onOpen?: () => void;
}) {
  const { state, controller } = useSession();
  const record = dashboardRecord(state.graph, reference);
  const info = record ? describeRecord(state.graph, record) : null;
  return (
    <button
      type="button"
      className={styles.recordLink}
      disabled={!info}
      title={info ? undefined : reference}
      onClick={() => {
        onOpen?.();
        controller.openDashboardSource(reference);
      }}
    >
      <span className={styles.recordIcon}>
        <Icon name={info?.icon ?? "receipt"} size={18} />
      </span>
      <span className={styles.recordLinkText}>
        <strong>{label ?? info?.title ?? "Record unavailable"}</strong>
        <small>
          {info
            ? [
                info.kind,
                info.detail,
                ...(info.at ? [evidenceDate(info.at)] : []),
              ].join(" · ")
            : "The historical reference is retained in calculation details."}
        </small>
      </span>
      <span className={styles.recordLinkValue}>
        {info?.value && (
          <span>
            <strong>{info.value}</strong>
            <small>{info.valueLabel}</small>
          </span>
        )}
        <Icon name="arrow" size={16} />
      </span>
    </button>
  );
}
