"use client";

import { useState } from "react";
import { ExternalLink, KeyRound, Loader2, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGalaxyStore } from "@/store/instances-store";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { InstanceSummary } from "@/lib/types";

/**
 * Auto-login into a console. Because the console's session cookie is SameSite=Strict and its login
 * response carries COOP:same-origin, planting the cookie and entering the dashboard are two separate
 * top-level navigations. "Initialize" plants the session (a brief sign-in tab opens); "Open console"
 * then enters the authenticated dashboard, and keeps working with no further login.
 */
export function ConsoleControls({ instance }: { instance: InstanceSummary }) {
  const session = useGalaxyStore((state) => state.console[instance.id]);
  const initConsole = useGalaxyStore((state) => state.initConsole);
  const openConsole = useGalaxyStore((state) => state.openConsole);
  const [busy, setBusy] = useState<"init" | "open" | null>(null);

  const planted = Boolean(session?.planted);
  const loading = busy !== null || Boolean(session?.loading);

  const handleInit = async () => {
    setBusy("init");
    try {
      await initConsole(instance.id);
    } catch {
      /* error surfaced via the store */
    } finally {
      setBusy(null);
    }
  };

  const handleOpen = async () => {
    setBusy("open");
    try {
      await openConsole(instance.id);
    } catch {
      /* error surfaced via the store */
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="space-y-2.5 rounded-lg border border-sc-border-soft bg-sc-raised/40 p-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-sc-faint">
          Console session
        </span>
        <SessionBadge session={session} />
      </div>

      <div className="flex gap-2">
        <Button
          variant="primary"
          className="flex-1"
          disabled={loading || !planted}
          title={planted ? "Enter the authenticated dashboard" : "Initialize the session first"}
          onClick={() => void handleOpen()}
        >
          {busy === "open" ? <Loader2 size={15} className="animate-spin" /> : <ExternalLink size={15} />}
          Open console
        </Button>
        <Button
          className={planted ? undefined : "flex-1"}
          variant={planted ? "secondary" : "primary"}
          disabled={loading}
          onClick={() => void handleInit()}
          title="Sign in with the stored credentials"
        >
          {busy === "init" ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}
          {planted ? "Re-initialize" : "Initialize session"}
        </Button>
      </div>

      {session?.error ? (
        <p className="rounded-md border border-critical/40 bg-critical/10 px-2.5 py-1.5 text-[11px] text-critical">
          {session.error}
        </p>
      ) : planted ? (
        <p className="text-[11px] text-sc-faint">
          Signed in with the stored credentials · keepalive checked{" "}
          {formatRelativeTime(session?.checkedAt ?? undefined)}. Open console enters the dashboard
          directly — no login. You can close the sign-in tab that appeared.
        </p>
      ) : (
        <p className="text-[11px] text-sc-faint">
          Initialize logs in with the stored credentials (a brief sign-in tab opens). Then Open
          console goes straight to the dashboard. Allow pop-ups for this app.
        </p>
      )}
    </section>
  );
}

function SessionBadge({ session }: { session?: { planted: boolean; ok: boolean } }) {
  const [Icon, label, tone] = !session?.planted
    ? [ShieldQuestion, "Not initialized", "text-sc-faint"]
    : session.ok
      ? [ShieldCheck, "Active", "text-[var(--severity-success)]"]
      : [ShieldAlert, "Check session", "text-high"];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-medium", tone)}>
      <Icon size={13} />
      {label}
    </span>
  );
}
