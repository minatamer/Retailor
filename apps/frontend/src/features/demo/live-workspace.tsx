"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Script from "next/script";
import { Workspace } from "./workspace";
import { liveProcessor } from "../catalogue/live-processor";
import { assistantRequester } from "../assistants/request";
import { CatalogueRequestError } from "../catalogue/request-error";
import { Button } from "../../components/ui/button";
import styles from "./workspace.module.css";
interface Challenge {
  siteKey: string;
  action: "catalogue" | "assistant";
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
  const ports = useMemo(() => {
    const proof = (
      siteKey: string,
      signal: AbortSignal,
      action: "catalogue" | "assistant",
    ) =>
      new Promise<string>((resolve, reject) => {
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
        setChallenge({ siteKey, finish, action });
      });
    return {
      processor: liveProcessor((siteKey, signal) =>
        proof(siteKey, signal, "catalogue"),
      ),
      assistantRequest: assistantRequester((siteKey, signal) =>
        proof(siteKey, signal, "assistant"),
      ),
    };
  }, []);
  return (
    <>
      <Workspace
        fixtureAllowed={false}
        processor={ports.processor}
        assistantRequest={ports.assistantRequest}
      />
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
          action: challenge.action,
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
        {challenge.action === "catalogue"
          ? "Verify this deliberate draft request. Only selected photo previews go to OpenAI; originals stay in your browser."
          : "Verify this deliberate Tailor turn. This demo’s records, prompt and recent role messages provide context. Photos are excluded."}
      </p>
      <div ref={container} />
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        onReady={() => setScriptReady(true)}
        onError={() => challenge.finish()}
      />
      <Button variant="secondary" onClick={() => challenge.finish()}>
        Cancel and keep my work
      </Button>
    </dialog>
  );
}
