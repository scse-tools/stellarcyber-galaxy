"use client";

import { useState } from "react";
import { KeyRound, LogOut, ShieldCheck, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChangePasswordModal } from "@/components/change-password-modal";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/auth/types";

/** Current-user badge with change-password and sign-out actions. */
export function UserMenu({ user }: { user: SessionUser }) {
  const [pwOpen, setPwOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const isAdmin = user.role === "admin";

  async function logout() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs",
          isAdmin ? "border-sc-link/40 text-sc-link" : "border-sc-border text-sc-muted",
        )}
        title={isAdmin ? "Administrator — full access" : "User — read only"}
      >
        {isAdmin ? <ShieldCheck size={14} /> : <UserIcon size={14} />}
        <span className="font-medium text-sc-text">{user.username}</span>
        <span className="text-sc-faint">· {isAdmin ? "admin" : "read only"}</span>
      </span>
      <Button variant="ghost" onClick={() => setPwOpen(true)} aria-label="Change password" title="Change password">
        <KeyRound size={15} />
      </Button>
      <Button variant="ghost" onClick={() => void logout()} disabled={busy} aria-label="Sign out" title="Sign out">
        <LogOut size={15} />
      </Button>
      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
    </div>
  );
}
