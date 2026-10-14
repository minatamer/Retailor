"use client";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { Icon } from "../../components/ui/icon";
import type { OwnerView } from "../operations/state";
import { useSession } from "../session/context";
import { TYPOGRAPHIES } from "../store-design/presets";
import styles from "./owner-navigation.module.css";

export const OWNER_VIEWS = [
  { id: "overview", label: "At a glance", icon: "dashboard" },
  { id: "products", label: "Garments", icon: "garment" },
  { id: "orders", label: "Orders", icon: "receipt" },
  { id: "returns", label: "Returns & refunds", icon: "returns" },
  { id: "inventory", label: "Inventory & costs", icon: "inventory" },
  { id: "expenses", label: "Expenses", icon: "expense" },
  { id: "traffic", label: "Visits & customers", icon: "customers" },
  { id: "feedback", label: "Feedback", icon: "feedback" },
  { id: "design", label: "Design", icon: "design" },
] as const satisfies ReadonlyArray<{
  id: OwnerView;
  label: string;
  icon: Parameters<typeof Icon>[0]["name"];
}>;

export function OwnerNavigation({
  collapsed,
  onToggle,
  drawerId,
  mobileOpen,
  onClose,
}: {
  collapsed: boolean;
  onToggle(): void;
  drawerId: string;
  mobileOpen: boolean;
  onClose(): void;
}) {
  const { controller, state } = useSession();
  const dialog = useRef<HTMLDialogElement>(null);
  const design = state.acceptedDesign,
    typography = TYPOGRAPHIES[design.typography],
    logoUrl = controller.logoUrl(design.logoId);

  useEffect(() => {
    if (!mobileOpen) return;
    const node = dialog.current;
    if (!node) return;
    node.showModal();
    const desktop = window.matchMedia("(min-width: 901px)");
    const resize = () => {
      if (!desktop.matches) return;
      node.close();
      onClose();
      document
        .getElementById("owner-register-heading")
        ?.focus({ preventScroll: true });
    };
    desktop.addEventListener("change", resize);
    return () => {
      desktop.removeEventListener("change", resize);
      node.close();
    };
  }, [mobileOpen, onClose]);

  const brand = (
    <div className={styles.brand} title={design.name}>
      <span className={styles.mark} aria-hidden="true">
        {logoUrl && design.logoId ? (
          <Image
            unoptimized
            src={logoUrl}
            width={44}
            height={44}
            alt=""
            onError={() => controller.logoUnavailable(design.logoId!)}
          />
        ) : (
          <span style={{ fontFamily: typography.heading }}>
            {Array.from(design.name.trim())[0] ?? "R"}
          </span>
        )}
      </span>
      <div className={styles.copy}>
        <strong
          style={{
            fontFamily: typography.heading,
            fontWeight: typography.weight,
          }}
        >
          {design.name}
        </strong>
        <span>Your store</span>
      </div>
    </div>
  );
  const links = (mobile: boolean) => (
    <nav className={styles.links} aria-label="Owner views">
      {OWNER_VIEWS.map((item) => (
        <button
          type="button"
          key={item.id}
          aria-label={item.label}
          title={item.label}
          aria-current={state.ownerView === item.id ? "page" : undefined}
          onClick={() => {
            if (mobile) {
              dialog.current?.close();
              onClose();
            }
            controller.ownerNavigate(item.id);
          }}
        >
          <Icon name={item.icon} size={22} />
          <span className={styles.label}>{item.label}</span>
        </button>
      ))}
    </nav>
  );
  return (
    <>
      <aside
        className={`${styles.panel} ${styles.desktop}`}
        data-collapsed={collapsed}
        aria-label={`${design.name} navigation`}
      >
        {brand}
        <div id={`${drawerId}-desktop`} className={styles.navigation}>
          {links(false)}
        </div>
        <button
          type="button"
          className={styles.collapse}
          onClick={onToggle}
          aria-expanded={!collapsed}
          aria-controls={`${drawerId}-desktop`}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <Icon name="sidebar" size={22} />
          <span className={styles.label}>Collapse sidebar</span>
        </button>
      </aside>
      <dialog
        ref={dialog}
        id={drawerId}
        className={`${styles.panel} ${styles.drawer}`}
        aria-label={`${design.name} navigation`}
        onCancel={(event) => {
          event.preventDefault();
          onClose();
        }}
        onClose={onClose}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const rect = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          )
            onClose();
        }}
      >
        {brand}
        <button
          type="button"
          className={styles.close}
          onClick={onClose}
          aria-label="Close navigation"
        >
          <Icon name="close" />
        </button>
        <div className={styles.navigation}>{links(true)}</div>
      </dialog>
    </>
  );
}
