"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { MetricFact } from "@retailor/contracts/facts";
import { formatUsd } from "@retailor/commerce/money";
import { useSession } from "../session/context";
import type { DashboardTarget } from "./state";
import { factDisplay, METRIC_LABELS } from "./model";
import type { DashboardModel } from "./model";
import { evidenceDate } from "./evidence-presentation";
import styles from "./dashboard.module.css";
export interface ChartMark {
  key: string;
  label: string;
  fact: MetricFact;
  target: DashboardTarget;
  magnitude?: number;
  extra?: ReactNode;
  magnitudeLabel?: string;
}
export function ChartPanel({
  title,
  note,
  children,
  marks,
}: {
  title: string;
  note: string;
  children: ReactNode;
  marks: ChartMark[];
}) {
  const { controller } = useSession();
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeading}>
        <h3>{title}</h3>
        <span aria-hidden="true">↗</span>
      </div>
      <p className={styles.caption}>{note}</p>
      {children}
      <details className={styles.data}>
        <summary>Exact data table · {title}</summary>
        <div
          className={styles.tableScroll}
          tabIndex={0}
          aria-label={`${title} exact table`}
        >
          <table>
            <caption>Current registered facts · USD where monetary</caption>
            <thead>
              <tr>
                <th scope="col">Group</th>
                <th scope="col">Exact display</th>
                <th scope="col">Numerator / denominator</th>
              </tr>
            </thead>
            <tbody>
              {marks.map((mark) => (
                <tr key={mark.key}>
                  <th scope="row">
                    <button
                      type="button"
                      onClick={() =>
                        controller.openDashboardEvidence(mark.target)
                      }
                    >
                      {mark.label}
                    </button>
                  </th>
                  <td>{factDisplay(mark.fact)}</td>
                  <td>
                    {mark.fact.numerator.toLocaleString("en-US")} /{" "}
                    {mark.fact.denominator?.toLocaleString("en-US") ?? "None"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!marks.length && <p>No recorded groups in this scope.</p>}
        </div>
      </details>
    </section>
  );
}
function pathOf(points: readonly number[][]) {
  return points.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ");
}
function MotionLine({ points, zero }: { points: number[][]; zero: number }) {
  const line = useRef<SVGPathElement>(null),
    area = useRef<SVGPathElement>(null),
    current = useRef<number[][] | null>(null);
  useEffect(() => {
    const initial = current.current ?? points.map((p) => [p[0]!, zero]),
      duration = current.current ? 400 : 550;
    let frame = 0,
      started: number | undefined;
    const draw = (time: number) => {
      started ??= time;
      const progress = Math.min(1, (time - started) / duration),
        eased = 1 - (1 - progress) ** 3;
      const positions = points.map((p, i) => [
        initial[i]![0]! + (p[0]! - initial[i]![0]!) * eased,
        initial[i]![1]! + (p[1]! - initial[i]![1]!) * eased,
      ]);
      current.current = positions;
      const d = pathOf(positions);
      line.current?.setAttribute("d", d);
      area.current?.setAttribute(
        "d",
        `${d} L${positions.at(-1)![0]},${zero} L${positions[0]![0]},${zero} Z`,
      );
      if (progress < 1) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [points, zero]);
  return (
    <>
      <path
        ref={area}
        d={`${pathOf(points)} L${points.at(-1)![0]},${zero} L${points[0]![0]},${zero} Z`}
        fill="var(--platform-selected)"
        opacity=".65"
      />
      <path
        ref={line}
        d={pathOf(points)}
        fill="none"
        stroke="var(--platform-action)"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </>
  );
}
export function SalesTrend({ model }: { model: DashboardModel }) {
  const { controller, state } = useSession(),
    series = state.dashboard.series;
  const [hovered, setHovered] = useState<string | null>(null);
  const tooltipId = useId();
  useEffect(() => {
    if (!hovered) return;
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape") setHovered(null);
    };
    document.addEventListener("keydown", dismiss);
    return () => document.removeEventListener("keydown", dismiss);
  }, [hovered]);
  const marks: ChartMark[] = model.days.map((day) => ({
    key: day.day,
    label: day.day,
    fact: series === "net_sales" ? day.sales : day.result,
    target: { kind: "day", day: day.day },
  }));
  const pinned = state.dashboard.pinned;
  const selectedDay =
    marks.find((m) => pinned?.kind === "day" && m.key === pinned.day) ??
    marks.at(-1);
  const active = marks.find((m) => m.key === hovered) ?? selectedDay;
  const geometry = useMemo(() => {
    const values = model.days.map(
        (d) => (series === "net_sales" ? d.sales : d.result).value,
      ),
      available = values.every((v) => v !== null);
    const min = Math.min(0, ...values.map((v) => v ?? 0)),
      max = Math.max(0, ...values.map((v) => v ?? 0)),
      span = max - min || 1;
    const y = (value: number) => 200 - ((value - min) / span) * 168;
    const actual = values.map((v, i) => [
      values.length === 1 ? 320 : 24 + (i / (values.length - 1)) * 592,
      y(v ?? 0),
    ]);
    const points = Array.from(
      { length: 32 },
      (_, i) => actual[Math.min(i, actual.length - 1)] ?? [24, y(0)],
    );
    return { available, min, max, zero: y(0), actual, points };
  }, [model.days, series]);
  const hoveredIndex = marks.findIndex((mark) => mark.key === hovered),
    hoveredMark = marks[hoveredIndex],
    hoveredPoint = geometry.actual[hoveredIndex];
  return (
    <ChartPanel
      title="How is the story changing?"
      note="Daily event observations, connected by straight segments. Refunds can make sales negative; costs and adjustments follow their own event dates."
      marks={marks}
    >
      <div className={styles.segmented} role="group" aria-label="Trend series">
        {(["net_sales", "operating_result"] as const).map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={series === s}
            onClick={() => controller.setDashboardSeries(s)}
          >
            {METRIC_LABELS[s]}
          </button>
        ))}
      </div>
      {geometry.available ? (
        <div className={styles.plot}>
          <div className={styles.axis}>
            <span>{formatUsd(geometry.max)}</span>
            <span>USD · Zero baseline</span>
            <span>{formatUsd(geometry.min)}</span>
          </div>
          <div
            className={styles.trendCanvas}
            onPointerLeave={() => setHovered(null)}
          >
            <svg
              viewBox="0 0 640 230"
              role="img"
              aria-label={`${METRIC_LABELS[series]} across ${marks.length} recorded UTC days. Hover the graph or use the day controls for exact values.`}
            >
              <path
                d={`M24 ${geometry.zero} H616`}
                stroke="var(--platform-control-line)"
                strokeDasharray="4 5"
              />
              <MotionLine points={geometry.points} zero={geometry.zero} />
              {hoveredPoint && (
                <line
                  className={styles.pointGuide}
                  x1={hoveredPoint[0]}
                  x2={hoveredPoint[0]}
                  y1="0"
                  y2="230"
                  aria-hidden="true"
                />
              )}
              {geometry.actual.map((point, i) => (
                <circle
                  key={marks[i]!.key}
                  cx={point[0]}
                  cy={point[1]}
                  r={active?.key === marks[i]!.key ? 6 : 3}
                  fill={
                    hovered === marks[i]!.key
                      ? "var(--platform-lime)"
                      : active?.key === marks[i]!.key
                        ? "var(--platform-action)"
                        : "var(--platform-surface)"
                  }
                  stroke="var(--platform-action)"
                  strokeWidth="2"
                />
              ))}
              <g aria-hidden="true">
                {geometry.actual.map((point, i) => {
                  const left = i
                      ? (geometry.actual[i - 1]![0]! + point[0]!) / 2
                      : 0,
                    right =
                      i + 1 < marks.length
                        ? (point[0]! + geometry.actual[i + 1]![0]!) / 2
                        : 640,
                    mark = marks[i]!;
                  return (
                    <rect
                      key={mark.key}
                      x={left}
                      y="0"
                      width={right - left}
                      height="230"
                      fill="transparent"
                      pointerEvents="all"
                      onPointerEnter={(event) => {
                        if (event.pointerType !== "touch") setHovered(mark.key);
                      }}
                      onClick={() => {
                        setHovered(mark.key);
                        controller.pinDashboard(mark.target);
                      }}
                    />
                  );
                })}
              </g>
            </svg>
            {hoveredMark && hoveredPoint && (
              <div
                id={tooltipId}
                role="tooltip"
                className={styles.pointTooltip}
                style={
                  {
                    "--point-x": `${(hoveredPoint[0]! / 640) * 100}%`,
                    "--point-y": `${(hoveredPoint[1]! / 230) * 100}%`,
                  } as CSSProperties
                }
              >
                <time dateTime={hoveredMark.label}>
                  {evidenceDate(hoveredMark.label, false)} · UTC
                </time>
                <span>{METRIC_LABELS[series]}</span>
                <strong>{factDisplay(hoveredMark.fact)}</strong>
              </div>
            )}
          </div>
        </div>
      ) : (
        <p className={styles.empty}>
          This period includes days without recorded history. Choose All
          activity to inspect the supplied history; unavailable days remain
          explicit in the exact table.
        </p>
      )}
      {model.timelineLimited && (
        <p className={styles.caption}>
          Daily chart covers the latest 31 days within this period; headline
          facts cover all selected activity.
        </p>
      )}
      <div
        className={styles.dayStrip}
        role="group"
        aria-label="Pin an exact daily observation"
        onPointerLeave={() => setHovered(null)}
      >
        {marks.map((mark) => (
          <button
            key={mark.key}
            type="button"
            aria-pressed={pinned?.kind === "day" && pinned.day === mark.key}
            aria-describedby={
              geometry.available && hovered === mark.key ? tooltipId : undefined
            }
            onPointerEnter={(event) => {
              if (event.pointerType !== "touch") setHovered(mark.key);
            }}
            onFocus={() => setHovered(mark.key)}
            onBlur={() => setHovered(null)}
            onClick={() => controller.pinDashboard(mark.target)}
          >
            <span>{mark.label.slice(5)}</span>
            <strong>{factDisplay(mark.fact)}</strong>
          </button>
        ))}
      </div>
      {selectedDay && (
        <div className={styles.trendActions}>
          <button
            type="button"
            aria-label={`View day details for ${evidenceDate(selectedDay.label, false)} UTC`}
            onClick={() => controller.openDashboardEvidence(selectedDay.target)}
          >
            View {evidenceDate(selectedDay.label, false)} details ↗
          </button>
        </div>
      )}
    </ChartPanel>
  );
}
export function RankedBars({
  title,
  note,
  marks,
  ordered = false,
  limit,
}: {
  title: string;
  note: string;
  marks: ChartMark[];
  ordered?: boolean;
  limit?: number;
}) {
  const { controller, state } = useSession();
  const [hovered, setHovered] = useState<string | null>(null);
  const rows = ordered
    ? marks
    : [...marks].sort(
        (a, b) =>
          (b.magnitude ?? b.fact.value ?? 0) -
          (a.magnitude ?? a.fact.value ?? 0),
      );
  const max = Math.max(
      1,
      ...rows.map((m) => Math.abs(m.magnitude ?? m.fact.value ?? 0)),
    ),
    signed = rows.some((m) => (m.magnitude ?? m.fact.value ?? 0) < 0);
  const pinnedKey = state.dashboard.pinned
    ? JSON.stringify(state.dashboard.pinned)
    : "";
  const active =
    rows.find((m) => m.key === hovered) ??
    rows.find((m) => JSON.stringify(m.target) === pinnedKey);
  return (
    <ChartPanel title={title} note={note} marks={rows}>
      <div className={styles.bars} onPointerLeave={() => setHovered(null)}>
        {rows.slice(0, limit ?? rows.length).map((mark) => {
          const value = mark.magnitude ?? mark.fact.value ?? 0,
            width = (Math.abs(value) / max) * (signed ? 50 : 100);
          const geometry = {
            "--bar-width": `${width}%`,
            "--bar-left": `${signed ? (value < 0 ? 50 - width : 50) : 0}%`,
          } as CSSProperties;
          return (
            <button
              key={mark.key}
              type="button"
              className={styles.barRow}
              aria-pressed={JSON.stringify(mark.target) === pinnedKey}
              onPointerEnter={(event) => {
                if (event.pointerType !== "touch") setHovered(mark.key);
              }}
              onFocus={() => setHovered(mark.key)}
              onBlur={() => setHovered(null)}
              onClick={() => controller.pinDashboard(mark.target)}
            >
              <span className={styles.barLabel}>
                {mark.extra}
                {mark.label}
                <strong>
                  {factDisplay(mark.fact)}
                  {mark.magnitude !== undefined &&
                  mark.fact.unit === "basis-points"
                    ? ` · ${mark.magnitude} ${mark.magnitudeLabel ?? "observations"}`
                    : ""}
                </strong>
              </span>
              <span
                className={styles.track}
                data-signed={signed}
                data-negative={value < 0}
                style={geometry}
              >
                <span />
              </span>
            </button>
          );
        })}
        {!rows.length && (
          <p className={styles.empty}>No supplied records in this group.</p>
        )}
      </div>
      {limit && rows.length > limit && (
        <p className={styles.caption}>
          Showing {limit} of {rows.length} groups. The exact table includes
          every group.
        </p>
      )}
      {active ? (
        <div className={styles.tooltip}>
          <div>
            <strong>
              {active.label} · {factDisplay(active.fact)}
            </strong>
            <p>{active.fact.reason ?? active.fact.dateBasis}</p>
          </div>
          <button
            type="button"
            onClick={() => controller.openDashboardEvidence(active.target)}
          >
            View contributing records ↗
          </button>
        </div>
      ) : (
        <p className={styles.caption}>
          Hover or focus for detail. Tap a bar to pin it, then open its
          contributing records. Exact table actions open the same evidence.
        </p>
      )}
    </ChartPanel>
  );
}
