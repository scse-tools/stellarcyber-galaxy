"use client";

import { useEffect, useState, type ComponentType } from "react";
import { Activity, Cable, LayoutGrid, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ViewMode } from "@/lib/types";

const NAV_COLLAPSED_KEY = "galaxy.navCollapsed";

interface NavItem {
  id: ViewMode;
  label: string;
  Icon: ComponentType<{ size?: number }>;
}

// New sections (e.g. reports, settings) can be appended here as the app grows.
const ITEMS: NavItem[] = [
  { id: "cases", label: "Cases", Icon: LayoutGrid },
  { id: "health", label: "Deployment health", Icon: Activity },
  { id: "studio", label: "Onboarding Studio", Icon: Cable },
];

interface SideNavProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

/** Collapsible left-hand navigation: one item per view (Cases, Deployment health, …). */
export function SideNav({ viewMode, onViewModeChange }: SideNavProps) {
  const [collapsed, setCollapsed] = useState(false);

  // Read the saved collapse state after mount to avoid a hydration mismatch.
  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(NAV_COLLAPSED_KEY) === "1");
    } catch {
      /* private browsing - default to expanded */
    }
  }, []);

  const toggleCollapsed = () =>
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(NAV_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });

  return (
    <nav
      aria-label="Views"
      className={cn(
        "sticky top-0 flex max-h-screen shrink-0 flex-col gap-1 self-start overflow-y-auto",
        "rounded-xl border border-sc-border-soft bg-sc-surface/50 p-2 transition-[width] duration-200",
        collapsed ? "w-14" : "w-52",
      )}
    >
      <button
        type="button"
        onClick={toggleCollapsed}
        aria-label={collapsed ? "Expand menu" : "Collapse menu"}
        title={collapsed ? "Expand menu" : "Collapse menu"}
        className="mb-1 flex items-center gap-2 rounded-md px-2 py-2 text-sc-faint transition-colors hover:bg-sc-active hover:text-sc-text"
      >
        {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        {collapsed ? null : <span className="text-[11px] font-medium uppercase tracking-wide">Menu</span>}
      </button>

      {ITEMS.map(({ id, label, Icon }) => {
        const active = viewMode === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onViewModeChange(id)}
            aria-pressed={active}
            title={label}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sc-link",
              collapsed && "justify-center",
              active ? "bg-sc-primary text-white" : "text-sc-muted hover:bg-sc-active hover:text-sc-text",
            )}
          >
            <span className="shrink-0">
              <Icon size={18} />
            </span>
            {collapsed ? null : <span className="truncate">{label}</span>}
          </button>
        );
      })}
    </nav>
  );
}
