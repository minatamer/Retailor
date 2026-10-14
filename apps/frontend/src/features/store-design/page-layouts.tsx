"use client";
import {
  resolvedTemplates,
  StorePageSchema,
  withPageTemplates,
  TemplateSchema,
} from "@retailor/contracts/design";
import type { Design, StorePage } from "@retailor/contracts/design";
import { Choice, Button } from "../../components/ui/button";
import { Icon } from "../../components/ui/icon";
import { TEMPLATES } from "./presets";
import styles from "./page-layouts.module.css";

const PAGE_LABELS: Record<StorePage, string> = {
  home: "Home",
  collection: "Collection",
  product: "Product",
};
export function PageLayouts({
  design,
  onChange,
  onPreview,
}: {
  design: Design;
  onChange(design: Design, page: StorePage): void;
  onPreview(page: StorePage): void;
}) {
  const pages = resolvedTemplates(design);
  return (
    <details
      className={styles.mixing}
      open={design.pageTemplates ? true : undefined}
    >
      <summary>
        <span>Mix layouts by page</span>
        <small>{design.pageTemplates ? "Custom look" : "Optional"}</small>
        <Icon name="arrow" size={16} />
      </summary>
      <div className={styles.content}>
        <p>
          Keep one look, or choose a different layout for each page. Your
          colours, type and clothes stay together.
        </p>
        {StorePageSchema.options.map((page) => (
          <div className={styles.page} key={page}>
            <header>
              <strong>{PAGE_LABELS[page]}</strong>
              <Button
                variant="quiet"
                onClick={() => onPreview(page)}
                aria-label={`Preview ${PAGE_LABELS[page]}`}
              >
                Preview <Icon name="arrow" size={14} />
              </Button>
            </header>
            <div
              className={styles.options}
              role="group"
              aria-label={`${PAGE_LABELS[page]} layout`}
            >
              {TemplateSchema.options.map((template) => (
                <Choice
                  key={template}
                  selected={pages[page] === template}
                  aria-label={`${PAGE_LABELS[page]}: ${TEMPLATES[template].label}`}
                  onClick={() => {
                    onChange(
                      withPageTemplates(design, { ...pages, [page]: template }),
                      page,
                    );
                  }}
                >
                  {TEMPLATES[template].label}
                  {pages[page] === template && <Icon name="check" size={12} />}
                </Choice>
              ))}
            </div>
          </div>
        ))}
        {design.pageTemplates && (
          <Button
            variant="secondary"
            onClick={() =>
              onChange({ ...design, pageTemplates: undefined }, "home")
            }
          >
            Use {TEMPLATES[design.template].label} for every page
          </Button>
        )}
      </div>
    </details>
  );
}
