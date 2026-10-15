"use client";

import { useState } from "react";
import type { Design } from "@retailor/contracts/design";
import { Icon } from "../../components/ui/icon";
import { TEMPLATES } from "../store-design/presets";
import styles from "./landing.module.css";

const LAYOUTS = ["studio", "pulse", "gallery"] as const;

/** Schematic home compositions for the marketing example, not another store renderer. */
function LayoutFigure({ template }: { template: Design["template"] }) {
  return (
    <svg
      className={styles.layoutDiagram}
      viewBox="0 0 96 76"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x="0.75"
        y="0.75"
        width="94.5"
        height="74.5"
        rx="5"
        fill="white"
        stroke="var(--platform-line)"
        strokeWidth="1.5"
      />
      <path d="M1 14h94" stroke="var(--platform-line)" />
      <rect
        x="7"
        y="6"
        width="16"
        height="3"
        rx="1"
        fill="var(--landing-navy)"
      />
      <path
        d="M64 8h5m5 0h5m5 0h5"
        stroke="var(--platform-muted)"
        strokeWidth="2"
      />
      {template === "studio" && (
        <>
          <image
            href="/landing/jeans-indigo.webp"
            x="6"
            y="30"
            width="45"
            height="40"
            preserveAspectRatio="xMidYMid slice"
          />
          <image
            href="/sample/forme/F07.webp"
            x="54"
            y="30"
            width="36"
            height="40"
            preserveAspectRatio="xMidYMid slice"
          />
          <path
            d="M7 21h43m-43 5h30"
            stroke="var(--landing-navy)"
            strokeWidth="3"
          />
          <rect
            x="70"
            y="21"
            width="18"
            height="5"
            fill="var(--landing-navy)"
          />
        </>
      )}
      {template === "pulse" && (
        <>
          <image
            href="/landing/jeans-indigo.webp"
            x="6"
            y="20"
            width="26"
            height="33"
            preserveAspectRatio="xMidYMid slice"
          />
          <image
            href="/landing/jeans-black.webp"
            x="35"
            y="20"
            width="26"
            height="33"
            preserveAspectRatio="xMidYMid slice"
          />
          <image
            href="/sample/forme/F07.webp"
            x="64"
            y="20"
            width="26"
            height="33"
            preserveAspectRatio="xMidYMid slice"
          />
          <rect
            x="6"
            y="57"
            width="84"
            height="15"
            fill="var(--landing-navy)"
          />
          <path d="M11 62h39m-39 5h31" stroke="white" strokeWidth="2" />
          <rect
            x="70"
            y="62"
            width="15"
            height="5"
            fill="var(--landing-lime)"
          />
        </>
      )}
      {template === "gallery" && (
        <>
          <path
            d="M6 37h22m-22 6h18"
            stroke="var(--landing-navy)"
            strokeWidth="3"
          />
          <image
            href="/landing/jeans-indigo.webp"
            x="35"
            y="20"
            width="33"
            height="50"
            preserveAspectRatio="xMidYMid meet"
          />
          <image
            href="/landing/jeans-black.webp"
            x="72"
            y="20"
            width="19"
            height="23"
            preserveAspectRatio="xMidYMid meet"
          />
          <image
            href="/sample/forme/F07.webp"
            x="72"
            y="47"
            width="19"
            height="23"
            preserveAspectRatio="xMidYMid meet"
          />
        </>
      )}
    </svg>
  );
}

export function OwnerLayoutExample() {
  const [selected, setSelected] = useState<Design["template"]>("studio");
  return (
    <div className={styles.chatReply}>
      <p>
        Let’s personalize your store. Choose a starting look and see a real
        preview.
      </p>
      <div className={styles.ownerLayouts}>
        <div
          className={styles.layoutChoices}
          role="group"
          aria-label="Try a starting look"
        >
          {LAYOUTS.map((template) => (
            <button
              key={template}
              type="button"
              aria-label={`${TEMPLATES[template].label} layout preview`}
              aria-pressed={selected === template}
              onClick={() => setSelected(template)}
            >
              <LayoutFigure template={template} />
              <span className={styles.layoutLabel}>
                <strong>{TEMPLATES[template].label}</strong>
                <span>
                  {selected === template && <Icon name="check" size={13} />}
                </span>
              </span>
            </button>
          ))}
        </div>
        <p className={styles.layoutStatus} role="status">
          <strong>{TEMPLATES[selected].label} selected.</strong>{" "}
          {TEMPLATES[selected].description}
        </p>
      </div>
    </div>
  );
}
