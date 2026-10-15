"use client";
import { useRef, useState } from "react";
import type { MouseEvent } from "react";
import { USD_SCOPE } from "@retailor/contracts/currency";
import { displayMinor, formatMinor } from "@retailor/commerce/currency";
import { Icon } from "../../components/ui/icon";
import { collection, EMPTY_FILTERS, categoryLabel } from "./browse";
import type { Filters } from "./browse";
import { facetCounts, parseFilterPrices } from "./facets";
import type { StorefrontInput, StorefrontActions } from "./storefront";
import styles from "./storefront.module.css";

function Choices<T extends string>({
  label,
  selected,
  options,
  change,
}: {
  label: string;
  selected: T | null;
  options: readonly { value: T | null; label: string; count: number }[];
  change: (value: T | null) => void;
}) {
  return (
    <div className={styles.facetChoices} role="group" aria-label={label}>
      {options.map((option) => (
        <button
          type="button"
          key={option.value ?? "all"}
          aria-pressed={selected === option.value}
          disabled={
            option.count === 0 &&
            selected !== option.value &&
            option.value !== null
          }
          onClick={() =>
            change(selected === option.value ? null : option.value)
          }
        >
          {option.label}
          <span>{option.count}</span>
          {selected === option.value && <Icon name="check" size={12} />}
        </button>
      ))}
    </div>
  );
}

export function FilterSheet({
  input,
  actions,
}: {
  input: StorefrontInput;
  actions: StorefrontActions;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    opener = useRef<HTMLButtonElement>(null),
    backdropPress = useRef(false);
  const [draft, setDraft] = useState(input.browse.filters),
    [scope, setScope] = useState(input.currency ?? USD_SCOPE);
  const [minimum, setMinimum] = useState(""),
    [maximum, setMaximum] = useState(""),
    [error, setError] = useState("");
  const parsed = parseFilterPrices(draft, minimum, maximum);
  const preview = parsed.ok ? parsed.filters : draft;
  const displayed = (cents: number) => displayMinor(cents, scope);
  const facets = facetCounts(input.items, preview, displayed);
  const count = parsed.ok
    ? collection(
        input.items,
        { filters: preview, sort: input.browse.sort },
        displayed,
      ).length
    : null;
  const close = () => ref.current?.close();
  const outside = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target !== event.currentTarget) return false;
    const rect = event.currentTarget.getBoundingClientRect();
    return (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    );
  };
  const priceText = (value: number | null) =>
    value === null
      ? ""
      : formatMinor(value, scope.currency).slice(1).replaceAll(",", "");
  const change = (patch: Partial<Filters>) => {
    setDraft({ ...draft, ...patch });
    setError("");
  };
  return (
    <>
      <button
        ref={opener}
        className={styles.filterButton}
        onClick={() => {
          const current = input.currency ?? USD_SCOPE;
          setDraft({ ...input.browse.filters });
          setScope(current);
          setError("");
          const text = (value: number | null) =>
            value === null
              ? ""
              : formatMinor(value, current.currency)
                  .slice(1)
                  .replaceAll(",", "");
          setMinimum(text(input.browse.filters.minPrice));
          setMaximum(text(input.browse.filters.maxPrice));
          ref.current?.showModal();
        }}
      >
        Filters +
      </button>
      <dialog
        ref={ref}
        className={styles.filterDialog}
        aria-labelledby="store-filters-heading"
        onClose={() => {
          backdropPress.current = false;
          opener.current?.focus({ preventScroll: true });
        }}
        onPointerDown={(event) => {
          backdropPress.current =
            event.isPrimary && event.button === 0 && outside(event);
        }}
        onPointerCancel={() => {
          backdropPress.current = false;
        }}
        onClick={(event) => {
          const dismiss = backdropPress.current && outside(event);
          backdropPress.current = false;
          if (dismiss) close();
        }}
      >
        <header className={styles.sheetHeading}>
          <div>
            <h2 id="store-filters-heading">Find your favourite.</h2>
            <output className={styles.filterCount} aria-live="polite">
              {count === null ? (
                "Set your price range"
              ) : (
                <>
                  <strong key={count}>{count}</strong>{" "}
                  {count === 1 ? "garment matches" : "garments match"}
                </>
              )}
            </output>
          </div>
          <button autoFocus aria-label="Close filters" onClick={close}>
            <Icon name="close" />
          </button>
        </header>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!parsed.ok) {
              setError(parsed.message);
              return;
            }
            actions.browse({ filters: parsed.filters }, scope);
            close();
          }}
        >
          <div className={styles.filterContents}>
            <fieldset className={styles.facet}>
              <legend>Category</legend>
              <Choices<NonNullable<Filters["category"]>>
                label="Category filters"
                selected={draft.category}
                options={[
                  {
                    value: null,
                    label: "All clothing",
                    count: facets.allCategories,
                  },
                  ...facets.categories.map((option) => ({
                    ...option,
                    label: categoryLabel(option.value),
                  })),
                ]}
                change={(category) => change({ category })}
              />
            </fieldset>
            <fieldset className={styles.facet}>
              <legend>Size</legend>
              <Choices
                label="All size labels"
                selected={draft.size}
                options={[
                  { value: null, label: "Any size", count: facets.allSizes },
                ]}
                change={(size) => change({ size })}
              />
              {facets.sizeGroups.map((group) => (
                <div className={styles.sizeGroup} key={group.label}>
                  <span>{group.label}</span>
                  <Choices
                    label={group.label}
                    selected={draft.size}
                    options={group.options.map((option) => ({
                      ...option,
                      label: option.value,
                    }))}
                    change={(size) => change({ size })}
                  />
                </div>
              ))}
            </fieldset>
            {facets.colours.length > 0 && (
              <fieldset className={styles.facet}>
                <legend>Colour</legend>
                <Choices
                  label="Colour filters"
                  selected={draft.colour}
                  options={[
                    {
                      value: null,
                      label: "Any colour",
                      count: facets.allColours,
                    },
                    ...facets.colours.map((option) => ({
                      ...option,
                      label: option.value,
                    })),
                  ]}
                  change={(colour) => change({ colour })}
                />
              </fieldset>
            )}
            <fieldset className={styles.priceFields}>
              <legend>Price range · {scope.currency}</legend>
              <label>
                From
                <input
                  name="minPrice"
                  inputMode="decimal"
                  maxLength={15}
                  placeholder="0.00"
                  value={minimum}
                  onChange={(event) => {
                    setMinimum(event.target.value);
                    setError("");
                  }}
                />
              </label>
              <label>
                To
                <input
                  name="maxPrice"
                  inputMode="decimal"
                  maxLength={15}
                  placeholder="Any price"
                  value={maximum}
                  onChange={(event) => {
                    setMaximum(event.target.value);
                    setError("");
                  }}
                />
              </label>
              <button
                type="button"
                className={styles.priceShortcut}
                onClick={() => {
                  setMinimum("");
                  setMaximum(priceText(5000));
                  setError("");
                }}
              >
                Up to {formatMinor(5000, scope.currency)}
              </button>
            </fieldset>
            <label className={styles.check}>
              <input
                name="available"
                type="checkbox"
                checked={draft.available}
                onChange={(event) =>
                  change({ available: event.target.checked })
                }
              />
              In stock
            </label>
            {error && (
              <p className={styles.problem} role="alert">
                {error}
              </p>
            )}
          </div>
          <footer className={styles.filterFooter}>
            <button className={styles.primary} type="submit">
              {count === null
                ? "Show matches"
                : `Show ${count} ${count === 1 ? "garment" : "garments"}`}{" "}
              <Icon name="arrow" />
            </button>
            <button
              className={styles.textButton}
              type="button"
              onClick={() => {
                actions.browse({ filters: { ...EMPTY_FILTERS } });
                close();
              }}
            >
              Clear all filters
            </button>
          </footer>
        </form>
      </dialog>
    </>
  );
}
