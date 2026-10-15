"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import type { ReactNode } from "react";
import { SessionController } from "./controller";
import type { CatalogueProcessor } from "./controller";
import type { AssistantRequester } from "../assistants/request";
import type { LogoRequester } from "../logos/request";
import { Brand } from "../../components/ui/brand";
import styles from "./context.module.css";
const SessionContext = createContext<SessionController | null>(null);
export function SessionProvider({
  children,
  fixtureAllowed,
  processor,
  assistantRequest,
  logoRequest,
}: {
  children: ReactNode;
  fixtureAllowed: boolean;
  processor?: CatalogueProcessor;
  assistantRequest?: AssistantRequester;
  logoRequest?: LogoRequester;
}) {
  const [controller, setController] = useState<SessionController | null>(null);
  useEffect(() => {
    let disposed = false,
      generation = 0,
      owned: SessionController | undefined,
      opening = new AbortController();
    let storage: Storage | undefined;
    try {
      storage = window.sessionStorage;
    } catch {
      /* Controller reports memory-only recovery. */
    }
    const initialize = () => {
      const current = ++generation;
      opening = new AbortController();
      void SessionController.open({
        fixtureAllowed,
        signal: opening.signal,
        ...(processor ? { processor } : {}),
        ...(assistantRequest ? { assistantRequest } : {}),
        ...(logoRequest ? { logoRequest } : {}),
        ...(storage ? { storage } : {}),
      }).then((value) => {
        if (disposed || current !== generation) {
          value.dispose();
          return;
        }
        owned = value;
        setController(value);
        const checkoutReturn = new URL(window.location.href);
        const outcome = checkoutReturn.searchParams.get("checkout");
        const attempt = checkoutReturn.searchParams.get("attempt");
        if (attempt && (outcome === "success" || outcome === "cancel")) {
          void value
            .resumeStripeCheckout(attempt, outcome === "cancel")
            .finally(() => {
              if (disposed || current !== generation) return;
              checkoutReturn.searchParams.delete("checkout");
              checkoutReturn.searchParams.delete("attempt");
              window.history.replaceState(
                window.history.state,
                "",
                `${checkoutReturn.pathname}${checkoutReturn.search}${checkoutReturn.hash}`,
              );
            });
        }
      });
    };
    initialize();
    const hidden = () => {
      opening.abort();
      owned?.dispose();
    };
    const shown = (event: PageTransitionEvent) => {
      if (event.persisted) {
        setController(null);
        initialize();
      } else owned?.checkExpiry();
    };
    const active = () => {
      if (document.visibilityState === "visible") owned?.checkExpiry();
    };
    window.addEventListener("pagehide", hidden);
    window.addEventListener("pageshow", shown);
    document.addEventListener("visibilitychange", active);
    return () => {
      disposed = true;
      generation++;
      opening.abort();
      owned?.dispose();
      window.removeEventListener("pagehide", hidden);
      window.removeEventListener("pageshow", shown);
      document.removeEventListener("visibilitychange", active);
    };
  }, [fixtureAllowed, processor, assistantRequest, logoRequest]);
  if (!controller)
    return (
      <main className={styles.loading}>
        <div className={styles.content} role="status">
          <div className={styles.brand}>
            <Brand />
          </div>
          <span className={styles.spinner} aria-hidden="true" />
          <span className={styles.status}>Opening your store…</span>
        </div>
      </main>
    );
  return <SessionContext value={controller}>{children}</SessionContext>;
}
export function useSession() {
  const controller = useContext(SessionContext);
  if (!controller) throw new Error("A workspace session provider is required.");
  return {
    controller,
    ...useSyncExternalStore(
      controller.subscribe,
      controller.getSnapshot,
      controller.getSnapshot,
    ),
  };
}
