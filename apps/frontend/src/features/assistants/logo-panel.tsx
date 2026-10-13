"use client";
import Image from "next/image";
import { Button } from "../../components/ui/button";
import { useSession } from "../session/context";
import { logoEligible } from "./setup";
import { PALETTES, TYPOGRAPHIES } from "../store-design/presets";
import styles from "./logo-panel.module.css";
export function LogoPanel() {
  const { controller, state, preparedLogo, logoBusy, logoNotice } =
      useSession(),
    design = state.previewDesign;
  if (!logoEligible(state.setup, design)) return null;
  const candidates = state.logos.candidates.filter(
    (c) =>
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
      <div
        className={styles.wordmark}
        style={{
          fontFamily: TYPOGRAPHIES[design.typography].heading,
          color: PALETTES[design.theme].text,
          background: PALETTES[design.theme].canvas,
        }}
      >
        {design.name}
      </div>
      <p>
        Your wordmark is ready. A generated image needs your review: the exact
        font and spelling can vary.
      </p>
      {oldChoice && (
        <p role="status">
          Your selected image belongs to an earlier look. It keeps its original
          colours; choose the wordmark for this look or deliberately generate
          new directions.
        </p>
      )}
      <div className={styles.actions}>
        <Button onClick={() => controller.keepWordmark()}>
          Keep my wordmark
        </Button>
        {!logoBusy && controller.canAttemptAi() && state.logos.batches < 2 && (
          <Button variant="secondary" onClick={() => controller.prepareLogo()}>
            {state.logos.batches
              ? "Review explicit logo retry"
              : "Generate 3 logos"}
          </Button>
        )}
      </div>
      {preparedLogo && !logoBusy && controller.canAttemptAi() && (
        <div className={styles.review}>
          <strong>Three directions for {preparedLogo.name}</strong>
          <p>
            {PALETTES[preparedLogo.theme].label} ·{" "}
            {TYPOGRAPHIES[preparedLogo.typography].label}
          </p>
          <p>
            {state.fixture
              ? "Development example: three code-authored marks, with paid calls disabled."
              : "Only your store name, chosen palette and typography direction go to OpenAI. This requests one image batch of three separate marks."}
          </p>
          <p>
            {state.logos.batches
              ? "This is your final explicit batch. A complete valid result replaces the previous three choices."
              : "One initial batch and one optional explicit retry per temporary workspace."}
          </p>
          <Button onClick={() => void controller.generateLogos()}>
            {state.fixture
              ? "Create 3 example directions"
              : "Approve & generate 3 logos"}
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
