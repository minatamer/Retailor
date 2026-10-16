"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Script from "next/script";
import { Workspace } from "./workspace";
import { liveProcessor } from "../catalogue/live-processor";
import { assistantRequester } from "../assistants/request";
import { logoRequester } from "../logos/request";
import { ApiRequestError } from "../../http/api-error";
import { Button } from "../../components/ui/button";
import { Icon } from "../../components/ui/icon";
import { mountVerification, type Turnstile } from "./turnstile";
import styles from "./workspace.module.css";
interface Challenge {
  siteKey: string;
  action: "catalogue" | "assistant" | "logos";
  finish(token?: string): void;
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
      action: "catalogue" | "assistant" | "logos",
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
          else reject(new ApiRequestError("FORBIDDEN"));
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
      logoRequest: logoRequester((siteKey, signal) =>
        proof(siteKey, signal, "logos"),
      ),
    };
  }, []);
  return (
    <>
      <Workspace
        fixtureAllowed={false}
        processor={ports.processor}
        assistantRequest={ports.assistantRequest}
        logoRequest={ports.logoRequest}
      />
      {challenge && <ChallengeDialog challenge={challenge} />}
    </>
  );
}
function ChallengeDialog({ challenge }: { challenge: Challenge }) {
  const [scriptReady, setScriptReady] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null),
    container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const ownedDialog = dialog.current;
    if (!scriptReady || !container.current || !window.turnstile) return;
    const dispose = mountVerification(
      window.turnstile,
      container.current,
      challenge,
      () => {
        if (ownedDialog && !ownedDialog.open) ownedDialog.showModal();
      },
    );
    return () => {
      dispose();
      ownedDialog?.close();
    };
  }, [scriptReady, challenge]);
  return (
    <dialog
      ref={dialog}
      className={styles.challengeDialog}
      aria-labelledby="challenge-heading"
      aria-describedby="challenge-description"
      onCancel={(event) => {
        event.preventDefault();
        challenge.finish();
      }}
    >
      <header className={styles.challengeHeader}>
        <span className={styles.challengeMark}>
          <Icon name="sparkle" size={24} />
        </span>
        <span>Ready when you are</span>
      </header>
      <h2 id="challenge-heading">One quick check.</h2>
      <p id="challenge-description">
        {challenge.action === "catalogue"
          ? "Before we draft your collection, complete the check below. Only selected photo previews go to OpenAI; originals stay in your browser."
          : challenge.action === "logos"
            ? "Before we create your logos, complete the check below. Your name and styling stay on this server; no AI provider receives them."
            : "Before Tailor replies, complete the check below. Your demo’s records, message and recent conversation provide context. Photos are excluded."}
      </p>
      <div className={styles.challengeVerification}>
        <div ref={container} />
      </div>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        onReady={() => setScriptReady(true)}
        onError={() => challenge.finish()}
      />
      <footer className={styles.challengeFooter}>
        <Button variant="secondary" onClick={() => challenge.finish()}>
          Cancel and keep my work
        </Button>
      </footer>
    </dialog>
  );
}
