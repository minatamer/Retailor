import type { CSSProperties, ReactNode } from "react";
import { Icon } from "./icon";
import styles from "./loading-state.module.css";

/** Decorative motion; its owning operation supplies the accessible status. */
export function LoadingMark() {
  return (
    <span className={styles.mark} aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

export function LoadingState({
  title,
  detail,
  compact = false,
  progress,
  action,
}: {
  title: string;
  detail?: string;
  compact?: boolean;
  progress?: { value: number; total: number };
  action?: ReactNode;
}) {
  const total =
    progress && Number.isFinite(progress.total) && progress.total > 0
      ? progress.total
      : undefined;
  const value =
    total && Number.isFinite(progress?.value)
      ? Math.max(0, Math.min(total, progress!.value))
      : undefined;
  return (
    <div className={styles.loading} data-compact={compact} data-loading-state>
      <div className={styles.heading}>
        <LoadingMark />
        <div className={styles.copy} role="status" aria-live="polite">
          <strong>{title}</strong>
          {detail && <p>{detail}</p>}
        </div>
        {action && <div className={styles.action}>{action}</div>}
      </div>
      {!compact && (
        <div
          className={styles.track}
          role="progressbar"
          aria-label={title}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={value}
          data-determinate={value !== undefined}
        >
          <span
            style={
              value !== undefined
                ? { width: `${(value / total!) * 100}%` }
                : undefined
            }
          />
        </div>
      )}
    </div>
  );
}

/** Reserved visual space only: never selectable or represented as a product. */
export function PhotoSkeleton({
  index = 0,
  logo = false,
}: {
  index?: number;
  logo?: boolean;
}) {
  return (
    <div
      className={styles.skeleton}
      aria-hidden="true"
      data-logo={logo}
      style={{ "--loading-delay": `${index * 100}ms` } as CSSProperties}
    >
      <div className={styles.skeletonPhoto}>
        <Icon name={logo ? "sparkle" : "garment"} size={32} />
      </div>
      <div className={styles.skeletonCopy}>
        <span />
        <span />
      </div>
    </div>
  );
}

export function SkeletonCards({
  count = 3,
  logo = false,
}: {
  count?: number;
  logo?: boolean;
}) {
  const bounded = Number.isFinite(count)
    ? Math.max(1, Math.min(6, Math.floor(count)))
    : 3;
  return (
    <div className={styles.skeletonGrid} aria-hidden="true" data-logo={logo}>
      {Array.from({ length: bounded }, (_, index) => (
        <PhotoSkeleton index={index} logo={logo} key={index} />
      ))}
    </div>
  );
}

/** A permanent empty/repair state, deliberately distinct from animated loading. */
export function PhotoPlaceholder({
  label = "Photo needs repair",
  detail,
  small = false,
}: {
  label?: string;
  detail?: string;
  small?: boolean;
}) {
  return (
    <span
      className={styles.placeholder}
      data-small={small}
      role={small ? "img" : undefined}
      aria-label={small ? label : undefined}
    >
      <Icon name="garment" size={small ? 20 : 34} />
      {!small && (
        <>
          <strong>{label}</strong>
          {detail && <span>{detail}</span>}
        </>
      )}
    </span>
  );
}
