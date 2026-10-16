interface WidgetOptions {
  sitekey: string;
  action: "catalogue" | "assistant" | "logos";
  size: "compact";
  theme: "light";
  appearance: "interaction-only";
  retry: "never";
  callback(token: string): void;
  "before-interactive-callback"(): void;
  "error-callback"(): void;
  "expired-callback"(): void;
  "timeout-callback"(): void;
  "unsupported-callback"(): void;
}
export interface Turnstile {
  render(container: HTMLElement, options: WidgetOptions): string;
  remove(id: string): void;
}

/** A fresh widget belongs to one deliberate operation; only interaction opens UI. */
export function mountVerification(
  api: Turnstile,
  container: HTMLElement,
  challenge: {
    siteKey: string;
    action: WidgetOptions["action"];
    finish(token?: string): void;
  },
  showInteraction: () => void,
): () => void {
  let active = true;
  let widget: string | null = null;
  const finish = (token?: string) => {
    if (!active) return;
    active = false;
    challenge.finish(token);
  };
  try {
    widget = api.render(container, {
      sitekey: challenge.siteKey,
      action: challenge.action,
      size: "compact",
      theme: "light",
      appearance: "interaction-only",
      retry: "never",
      callback: finish,
      "before-interactive-callback": () => {
        if (active) showInteraction();
      },
      "error-callback": () => finish(),
      "expired-callback": () => finish(),
      "timeout-callback": () => finish(),
      "unsupported-callback": () => finish(),
    });
  } catch {
    finish();
  }
  return () => {
    active = false;
    if (widget === null) return;
    const ownedWidget = widget;
    widget = null;
    try {
      api.remove(ownedWidget);
    } catch {
      /* Third-party cleanup cannot prevent owned cancellation. */
    }
  };
}
