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
const SessionContext = createContext<SessionController | null>(null);
export function SessionProvider({
  children,
  fixtureAllowed,
  processor,
}: {
  children: ReactNode;
  fixtureAllowed: boolean;
  processor?: CatalogueProcessor;
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
        ...(storage ? { storage } : {}),
      }).then((value) => {
        if (disposed || current !== generation) {
          value.dispose();
          return;
        }
        owned = value;
        setController(value);
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
  }, [fixtureAllowed, processor]);
  if (!controller)
    return (
      <main className="foundation">
        <p role="status">Opening your temporary collection…</p>
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
