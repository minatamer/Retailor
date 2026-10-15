"use client";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Button, Choice } from "../../components/ui/button";
import { useSession } from "../session/context";
import { DesignChoices, BrandFields } from "../assistants/tailor";
import { LogoPanel } from "../assistants/logo-panel";
import { logoEligible } from "../assistants/setup";
import { layoutLabel, PALETTES, TYPOGRAPHIES } from "./presets";
import styles from "./owner-design.module.css";
const FIELDS = {
  template: "Layout",
  theme: "Colour",
  typography: "Typography",
  brand: "Brand & hero",
};
export function OwnerDesign({ preview }: { preview: ReactNode }) {
  const { controller, state } = useSession();
  const [field, setField] = useState<keyof typeof FIELDS>("template");
  const previewRef = useRef<HTMLDivElement>(null),
    controlsRef = useRef<HTMLDivElement>(null),
    headingRef = useRef<HTMLHeadingElement>(null),
    editRef = useRef<HTMLButtonElement>(null);
  const previousEditing = useRef(state.designEditing);
  useEffect(() => {
    if (previousEditing.current !== state.designEditing) {
      if (state.designEditing)
        headingRef.current?.focus({ preventScroll: true });
      else editRef.current?.focus({ preventScroll: true });
      headingRef.current?.scrollIntoView({
        block: "start",
        behavior: "smooth",
      });
    }
    previousEditing.current = state.designEditing;
  }, [state.designEditing]);
  return (
    <section className={styles.panel} aria-labelledby="owner-design-title">
      <header>
        <div>
          <span>Personalize</span>
          <h2 id="owner-design-title" ref={headingRef} tabIndex={-1}>
            A look that feels like you.
          </h2>
          <p>
            Personalize page layouts, colours, type and branding. Your products
            and records stay connected.
          </p>
        </div>
        {!state.designEditing && (
          <Button
            ref={editRef}
            variant="secondary"
            onClick={() => controller.beginOwnerDesign()}
          >
            Personalize store
          </Button>
        )}
      </header>
      {!state.designEditing && (
        <p>
          {state.acceptedDesign.name} · {layoutLabel(state.acceptedDesign)} ·{" "}
          {PALETTES[state.acceptedDesign.theme].label} ·{" "}
          {TYPOGRAPHIES[state.acceptedDesign.typography].label}
        </p>
      )}
      {state.designEditing && (
        <>
          <p role="status" className={styles.previewNotice}>
            Previewing changes. Apply keeps this look; Cancel restores your
            accepted design.
          </p>
          <div className={styles.layout}>
            <div ref={controlsRef} className={styles.controls}>
              <nav className={styles.tabs} aria-label="Personalization options">
                {(Object.keys(FIELDS) as (keyof typeof FIELDS)[]).map((key) => (
                  <Choice
                    key={key}
                    selected={field === key}
                    onClick={() => setField(key)}
                  >
                    {FIELDS[key]}
                  </Choice>
                ))}
              </nav>
              {field === "brand" ? (
                <div>
                  <h3>Brand details & hero</h3>
                  <BrandFields />
                  {!logoEligible(state.setup, state.previewDesign) && (
                    <Button
                      variant="secondary"
                      onClick={() => controller.confirmOwnerLogoLook()}
                    >
                      Confirm colour & type for optional logos
                    </Button>
                  )}
                  <LogoPanel showNameInput={false} />
                </div>
              ) : (
                <DesignChoices kind={field} />
              )}
              <div className={styles.actions}>
                <Button onClick={() => controller.applyOwnerDesign()}>
                  Apply look
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => controller.cancelDesign()}
                >
                  Cancel design changes
                </Button>
                <Button
                  variant="quiet"
                  onClick={() =>
                    previewRef.current?.scrollIntoView({
                      block: "start",
                      behavior: "smooth",
                    })
                  }
                >
                  See design preview
                </Button>
              </div>
            </div>
            <div ref={previewRef} className={styles.preview}>
              <Button
                variant="quiet"
                onClick={() =>
                  controlsRef.current?.scrollIntoView({
                    block: "start",
                    behavior: "smooth",
                  })
                }
              >
                Back to design controls ↑
              </Button>
              {preview}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
