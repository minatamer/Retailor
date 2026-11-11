"use client";

import { useEffect, useRef, useState } from "react";
import type { MetricFact } from "@retailor/contracts/facts";
import { factDisplay } from "./model";
import { animateValue } from "./animated-value";
import styles from "./dashboard.module.css";

export function AnimatedFact({ fact }: { fact: MetricFact }) {
  const { value, unit } = fact;
  const [initialDisplay] = useState(() => factDisplay({ value, unit }));
  const visual = useRef<HTMLSpanElement>(null);
  const current = useRef({ value, unit });
  useEffect(() => {
    const node = visual.current;
    if (!node) return;
    const previous = current.current;
    const write = (next: number | null) => {
      current.current = { value: next, unit };
      node.textContent = factDisplay({ value: next, unit });
    };
    if (previous.unit !== unit || previous.value === null || value === null) {
      write(value);
      return;
    }
    return animateValue(
      {
        write,
        request: (step) => requestAnimationFrame(step),
        cancel: (frame) => cancelAnimationFrame(frame),
      },
      previous.value,
      value,
    );
  }, [value, unit]);
  return (
    <span className={styles.factValue}>
      <span className={styles.exactValue}>{factDisplay({ value, unit })}</span>
      <span ref={visual} data-animated-fact={fact.factId} aria-hidden="true">
        {initialDisplay}
      </span>
    </span>
  );
}
