"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Script from "next/script";
import { Workspace } from "./workspace";
import { liveProcessor } from "../catalogue/live-processor";
import { CatalogueRequestError } from "../catalogue/request-error";
import { Button } from "../../components/ui/button";
import styles from "./workspace.module.css";
interface Challenge {
  siteKey: string;
  finish(token?: string): void;
}
interface Turnstile {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      size: "compact";
      theme: "light";
      callback(token: string): void;
      "error-callback"(): void;
      "expired-callback"(): void;
      retry: "never";
    },
  ): string;
  remove(id: string): void;
}
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}
export function LiveWorkspace() {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const processor = useMemo(
    () =>
      liveProcessor(
        (siteKey, signal) =>
          new Promise((resolve, reject) => {
            let settled = false;
            const timer = setTimeout(() => finish(), 90_000);
            const abort = () => finish();
            const finish = (token?: string) => {
              if (settled) return;
              settled = true;
              clearTimeout(timer);
              signal.removeEventListener("abort", abort);
              setChallenge(null);
              if (token) resolve(token);
              else reject(new CatalogueRequestError("FORBIDDEN"));
            };
            signal.addEventListener("abort", abort, { once: true });
            if (signal.aborted) {
              finish();
              return;
            }
            setChallenge({ siteKey, finish });
          }),
      ),
    [],
  );
  return (
    <>
      <Workspace fixtureAllowed={false} processor={processor} />
      {challenge && <ChallengeDialog challenge={challenge} />}
    </>
  );
}
function ChallengeDialog({ challenge }: { challenge: Challenge }) {
  const [scriptReady, setScriptReady] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null),
    container = useRef<HTMLDivElement>(null),
    widget = useRef<string | null>(null);
  useEffect(() => {
    const ownedDialog = dialog.current;
    if (ownedDialog && !ownedDialog.open) ownedDialog.showModal();
    if (
      scriptReady &&
      container.current &&
      window.turnstile &&
      widget.current === null
    ) {
      try {
        widget.current = window.turnstile.render(container.current, {
          sitekey: challenge.siteKey,
          action: "catalogue",
          size: "compact",
          theme: "light",
          retry: "never",
          callback: (token) => challenge.finish(token),
          "error-callback": () => challenge.finish(),
          "expired-callback": () => challenge.finish(),
        });
      } catch {
        challenge.finish();
      }
    }
    return () => {
      try {
        if (widget.current !== null) window.turnstile?.remove(widget.current);
      } catch {
        /* Third-party cleanup cannot prevent owned cancellation. */
      }
      widget.current = null;
      ownedDialog?.close();
    };
  }, [scriptReady, challenge]);
  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby="challenge-heading"
      onCancel={(event) => {
        event.preventDefault();
        challenge.finish();
      }}
    >
      <h2 id="challenge-heading">One quick check.</h2>
      <p>
        Verify this deliberate draft request. Only your selected photo previews
        go to OpenAI; originals stay in your browser.
      </p>
      <div ref={container} />
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        onReady={() => setScriptReady(true)}
        onError={() => challenge.finish()}
      />
      <Button variant="secondary" onClick={() => challenge.finish()}>
        Cancel and keep my photos
      </Button>
    </dialog>
  );
}
