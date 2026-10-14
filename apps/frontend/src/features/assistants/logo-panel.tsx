"use client";
import { useId } from "react";
import Image from "next/image";
import { Button } from "../../components/ui/button";
import { useSession } from "../session/context";
import { logoEligible, logoNameReady } from "./setup";
import { PALETTES, TYPOGRAPHIES } from "../store-design/presets";
import styles from "./logo-panel.module.css";
export function LogoPanel({
  showNameInput = true,
}: {
  showNameInput?: boolean;
}) {
  const { controller, state, preparedLogo, logoBusy, logoNotice } =
      useSession(),
    design = state.previewDesign,
    name = state.setup.brandDraft?.name ?? design.name,
    nameReady = logoNameReady(state.setup, design),
    palette = PALETTES[design.theme],
    typography = TYPOGRAPHIES[design.typography];
  const nameId = useId();
  if (!logoEligible(state.setup, design)) return null;
  const candidates = state.logos.candidates.filter(
    (c) =>
      nameReady &&
      c.context.name === design.name &&
      c.context.theme === design.theme &&
      c.context.typography === design.typography &&
      c.context.designRevision === design.revision,
  );
  const oldChoice =
    design.logoId && !candidates.some((c) => c.id === design.logoId);
  return (
    <section
      className={styles.panel}
      aria-label="Optional logo directions"
      aria-busy={logoBusy}
    >
      {showNameInput && (
        <div className={styles.nameField}>
          <label htmlFor={nameId}>
            Store name <small>{name.length}/40</small>
          </label>
          <input
            id={nameId}
            value={name}
            required
            maxLength={40}
            autoComplete="organization"
            placeholder="e.g. Sunday Studio"
            aria-invalid={!nameReady}
            aria-describedby={`${nameId}-help`}
            onChange={(event) => controller.logoNameInput(event.target.value)}
          />
          <p id={`${nameId}-help`}>
            {nameReady
              ? "Your name updates the storefront preview."
              : "Enter a readable store name to continue."}
          </p>
        </div>
      )}
      <div
        className={styles.wordmark}
        style={{
          fontFamily: typography.heading,
          fontWeight: typography.weight,
          letterSpacing: typography.tracking,
          color: palette.text,
          background: palette.canvas,
        }}
      >
        {nameReady ? design.name : "Your store name"}
      </div>
      <div className={styles.look}>
        <span aria-hidden="true" style={{ background: palette.text }} />
        <span aria-hidden="true" style={{ background: palette.action }} />
        <span>
          {palette.label} · {typography.label}
        </span>
      </div>
      <p>
        Keep this wordmark, or create three simple logos inspired by your name,
        first initial and chosen look.
      </p>
      {nameReady && oldChoice && (
        <p role="status">
          Your selected image belongs to an earlier look. It keeps its original
          colours; choose the wordmark for this look or deliberately generate
          new directions.
        </p>
      )}
      <div className={styles.actions}>
        <Button
          disabled={!nameReady}
          onClick={() => controller.keepNamedWordmark()}
        >
          Keep my wordmark
        </Button>
        {controller.canAttemptAi() && state.logos.batches < 2 && (
          <Button
            variant="secondary"
            disabled={!nameReady || logoBusy}
            onClick={() => {
              if (controller.prepareNamedLogo() && state.fixture)
                void controller.generateLogos();
            }}
          >
            {state.logos.batches ? "Generate 3 more logos" : "Generate 3 logos"}
          </Button>
        )}
      </div>
      {preparedLogo &&
        !state.fixture &&
        !logoBusy &&
        controller.canAttemptAi() && (
          <div className={styles.review}>
            <strong>Three directions for {preparedLogo.name}</strong>
            <p>
              {PALETTES[preparedLogo.theme].label} ·{" "}
              {TYPOGRAPHIES[preparedLogo.typography].label}
            </p>
            <p>
              Only your store name, chosen palette and typography direction go
              to OpenAI. This requests one image batch of three separate marks.
              Image lettering can vary; review the spelling before choosing.
            </p>
            <p>
              {state.logos.batches
                ? "This is your final explicit batch. A complete valid result replaces the previous three choices."
                : "One initial batch and one optional explicit retry per temporary workspace."}
            </p>
            <Button onClick={() => void controller.generateLogos()}>
              Approve & generate 3 logos
            </Button>
          </div>
        )}
      {logoBusy && (
        <div className={styles.processing} role="status">
          <span />
          Three directions, coming together…
          <Button variant="quiet" onClick={() => controller.cancelLogos()}>
            Cancel logo request
          </Button>
        </div>
      )}
      {logoNotice && <p role="status">{logoNotice}</p>}
      {state.fixture && candidates.length > 0 && (
        <p className={styles.example}>
          Three local examples for your chosen look.
        </p>
      )}
      <div className={styles.candidates}>
        {candidates.map((candidate, index) => {
          const url = controller.logoUrl(candidate.id),
            selected = design.logoId === candidate.id,
            reviewed = state.logos.reviewed.includes(candidate.id);
          if (!url) return null;
          return (
            <article
              className={styles.candidate}
              key={candidate.id}
              data-selected={selected}
            >
              <strong>Direction {index + 1}</strong>
              <div
                className={styles.large}
                style={{ background: PALETTES[design.theme].canvas }}
              >
                <Image
                  unoptimized
                  src={url}
                  width={candidate.width}
                  height={candidate.height}
                  alt={`Logo direction ${index + 1} for ${design.name}`}
                  onError={() => controller.logoUnavailable(candidate.id)}
                />
              </div>
              <div
                className={styles.small}
                style={{ background: PALETTES[design.theme].canvas }}
              >
                <span>At header size</span>
                <Image
                  unoptimized
                  src={url}
                  width={candidate.width}
                  height={candidate.height}
                  alt=""
                />
              </div>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={reviewed}
                  onChange={(event) =>
                    controller.reviewLogo(candidate.id, event.target.checked)
                  }
                />
                The name is spelled correctly and readable at header size.
              </label>
              <Button
                variant="secondary"
                onClick={() => controller.previewLogo(candidate.id)}
              >
                {selected ? "Previewing this logo" : "Preview in my storefront"}
              </Button>
              <p>
                Explore Home, Collection and Product above, then confirm your
                choice.
              </p>
              <Button
                disabled={!selected || !reviewed}
                onClick={() => controller.useLogo(candidate.id)}
              >
                Use logo direction {index + 1}
              </Button>
            </article>
          );
        })}
      </div>
      {state.logos.batches >= 2 && (
        <p>
          Both explicit requests have been sent. Their provider outcome can be
          unknown. Keep one reviewed direction or your wordmark.
        </p>
      )}
    </section>
  );
}
