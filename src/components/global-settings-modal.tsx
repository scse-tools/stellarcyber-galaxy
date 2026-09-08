"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { UsersPanel } from "@/components/settings/users-panel";
import { TlsPanel } from "@/components/settings/tls-panel";
import { cn } from "@/lib/utils";

type Tab = "users" | "tls";

export function GlobalSettingsModal({
  open,
  onClose,
  currentUserId,
}: {
  open: boolean;
  onClose: () => void;
  currentUserId: string;
}) {
  const [tab, setTab] = useState<Tab>("users");
  if (!open) return null;

  return (
    <Modal open={open} title="Global settings" onClose={onClose} className="max-w-xl">
      <div className="mb-4 flex gap-1 rounded-lg border border-sc-border bg-sc-surface/70 p-1">
        {(["users", "tls"] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              tab === id ? "bg-sc-primary text-white" : "text-sc-muted hover:bg-sc-active hover:text-sc-text",
            )}
          >
            {id === "users" ? "Users & access" : "TLS certificate"}
          </button>
        ))}
      </div>
      {tab === "users" ? <UsersPanel currentUserId={currentUserId} /> : <TlsPanel />}
    </Modal>
  );
}
