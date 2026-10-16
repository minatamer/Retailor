"use client";
import { useEffect, useId, useRef, useState } from "react";
import { formatUsd } from "@retailor/commerce/money";
import { Button } from "../../components/ui/button";
import { Icon } from "../../components/ui/icon";
import styles from "./design-lab.module.css";
const DAYS = [
  { label: "10 Jun", value: 6800, orders: [{ id: "EX-01", value: 6800 }] },
  {
    label: "11 Jun",
    value: 10800,
    orders: [
      { id: "EX-02", value: 5400 },
      { id: "EX-03", value: 5400 },
    ],
  },
  { label: "12 Jun", value: 5400, orders: [{ id: "EX-04", value: 5400 }] },
  { label: "13 Jun", value: 8200, orders: [{ id: "EX-05", value: 8200 }] },
  {
    label: "14 Jun",
    value: 12600,
    orders: [
      { id: "EX-06", value: 6400 },
      { id: "EX-07", value: 6200 },
    ],
  },
  { label: "15 Jun", value: 13400, orders: [{ id: "EX-08", value: 13400 }] },
] as const;
export function DashboardSpecimen() {
  const [active, setActive] = useState(5);
  const [recordsOpen, setRecordsOpen] = useState(false);
  const [entered, setEntered] = useState(false);
  const plot = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!plot.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setEntered(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(plot.current);
    return () => observer.disconnect();
  }, []);
  const gradient = useId().replaceAll(":", "");
  const selected = DAYS[active] ?? DAYS[5];
  const points = DAYS.map(
    (day, index) => `${30 + index * 112},${185 - day.value / 100}`,
  ).join(" ");
  return (
    <div className={styles.dashboard}>
      <div className={styles.dashboardTop}>
        <span className={styles.eyebrow}>FORME / Owner view</span>
        <span className={styles.referenceTag}>
          Synthetic design example · 10–15 June
        </span>
      </div>
      <div className={styles.kpiGrid}>
        {[
          {
            label: "Net sales",
            amount: "$572.00",
            hint: "8 example orders",
            icon: "↗",
          },
          {
            label: "Included orders",
            amount: "8",
            hint: "Demo activity only",
            icon: "+",
          },
          {
            label: "Average order value",
            amount: "$71.50",
            hint: "Pre-refund example basis",
            icon: "↗",
          },
          {
            label: "Operating profit",
            amount: "$200.00",
            hint: "$286 costs · $86 expenses",
            icon: "↗",
          },
        ].map((metric) => (
          <article key={metric.label} className={styles.kpi}>
            <span>
              {metric.label}
              <i aria-hidden="true">{metric.icon}</i>
            </span>
            <strong>{metric.amount}</strong>
            <small>{metric.hint}</small>
          </article>
        ))}
      </div>
      <div className={styles.chartGrid}>
        <figure className={styles.chart}>
          <figcaption>
            <div>
              <span className={styles.eyebrow}>Sales, day by day</span>
              <h3>The shape of a good week.</h3>
            </div>
            <span>USD</span>
          </figcaption>
          <div className={styles.plot} ref={plot} data-entered={entered}>
            <svg
              viewBox="0 0 620 215"
              role="img"
              aria-label="Sales trend across six synthetic example days, with exact selectable values below"
            >
              <defs>
                <linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--platform-action)"
                    stopOpacity=".22"
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--platform-action)"
                    stopOpacity="0"
                  />
                </linearGradient>
              </defs>
              <path
                d="M30 52h560M30 100h560M30 150h560M30 190h560"
                stroke="var(--platform-line)"
                strokeDasharray="4 6"
              />
              <polygon
                points={`30,190 ${points} 590,190`}
                fill={`url(#${gradient})`}
              />
              <polyline
                points={points}
                fill="none"
                stroke="var(--platform-action)"
                strokeWidth="3"
                strokeLinejoin="round"
                strokeLinecap="round"
                className={styles.chartLine}
              />
              {DAYS.map((day, index) => (
                <circle
                  key={day.label}
                  cx={30 + index * 112}
                  cy={185 - day.value / 100}
                  r={active === index ? 6 : 3}
                  fill={active === index ? "var(--platform-action)" : "white"}
                  stroke="var(--platform-action)"
                  strokeWidth="2"
                />
              ))}
            </svg>
          </div>
          <div
            className={styles.dayButtons}
            role="group"
            aria-label="Inspect daily example sales"
          >
            {DAYS.map((day, index) => (
              <button
                key={day.label}
                aria-pressed={active === index}
                onPointerEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
                onClick={() => {
                  setActive(index);
                  setRecordsOpen(true);
                }}
              >
                <span>{day.label}</span>
                <strong>{formatUsd(day.value)}</strong>
              </button>
            ))}
          </div>
          <details className={styles.exactTable}>
            <summary>Exact six-day values</summary>
            <table>
              <caption>Synthetic illustration, not workspace activity</caption>
              <thead>
                <tr>
                  <th>Day</th>
                  <th>Sales</th>
                  <th>Orders</th>
                </tr>
              </thead>
              <tbody>
                {DAYS.map((day) => (
                  <tr key={day.label}>
                    <th>{day.label}</th>
                    <td>{formatUsd(day.value)}</td>
                    <td>{day.orders.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </figure>
        <aside className={styles.evidence}>
          <span className={styles.eyebrow}>Behind the number</span>
          <h3>{selected.label}</h3>
          <strong className={styles.evidenceAmount}>
            {formatUsd(selected.value)}
          </strong>
          <p>
            {selected.orders.length} example{" "}
            {selected.orders.length === 1
              ? "order contributes"
              : "orders contribute"}{" "}
            to this day’s sales. No real customer activity.
          </p>
          <Button
            variant="secondary"
            onClick={() => setRecordsOpen((value) => !value)}
            aria-expanded={recordsOpen}
          >
            {" "}
            {recordsOpen ? "Hide" : "View"} example orders{" "}
            <Icon name="arrow" size={16} />
          </Button>
          {recordsOpen && (
            <ul className={styles.records}>
              {selected.orders.map((order) => (
                <li key={order.id}>
                  <span>{order.id}</span>
                  <strong>{formatUsd(order.value)}</strong>
                </li>
              ))}
            </ul>
          )}
          <div className={styles.evidenceNote}>
            <Icon name="check" size={16} />
            <span>Exact values now. Motion explains the shape.</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
