"use client";

import type { ConsoleLoginResult } from "@/lib/console/session";
import { isConsolePlanted, openConsoleDashboard, plantConsoleSession } from "@/lib/console-window";
import type { InstanceSummary } from "@/lib/types";

export interface ConsoleSession {
  initialized: boolean;
  planted: boolean;
  loading: boolean;
  ok: boolean;
  checkedAt: string | null;
  error: string | null;
}

export const BLANK_CONSOLE: ConsoleSession = {
  initialized: false,
  planted: false,
  loading: false,
  ok: false,
  checkedAt: null,
  error: null,
};

type Json = <T>(url: string, init?: RequestInit) => Promise<T>;

interface Ctx {
  request: Json;
  instances: () => InstanceSummary[];
  sessions: () => Record<string, ConsoleSession>;
  patch: (id: string, session: ConsoleSession) => void;
}

/** Logs in server-side, then drives the browser's own auto-login form into a named window. */
export async function initConsole(ctx: Ctx, id: string): Promise<void> {
  const previous = ctx.sessions()[id] ?? BLANK_CONSOLE;
  ctx.patch(id, { ...previous, loading: true, error: null });
  try {
    const { login } = await ctx.request<{ login: ConsoleLoginResult }>(
      `/api/instances/${id}/console/session`,
      { method: "POST", body: "{}" },
    );
    plantConsoleSession(id, login);
    ctx.patch(id, {
      initialized: true,
      planted: true,
      loading: false,
      ok: true,
      checkedAt: new Date().toISOString(),
      error: null,
    });
  } catch (error) {
    ctx.patch(id, {
      ...BLANK_CONSOLE,
      error: error instanceof Error ? error.message : "Console login failed.",
    });
    throw error;
  }
}

/**
 * Opens the authenticated dashboard when the cookie is already planted; otherwise plants it first.
 * The console's COOP + SameSite=Strict defences mean planting and entering are two top-level
 * navigations, so a first-time open plants the session and the dashboard opens on the next click.
 */
export async function openConsole(ctx: Ctx, id: string): Promise<boolean> {
  const instance = ctx.instances().find((entry) => entry.id === id);
  if (!instance) return false;
  if (isConsolePlanted(id)) {
    openConsoleDashboard(id, instance.consoleUrl);
    return true;
  }
  await initConsole(ctx, id);
  return false;
}

/** Pings each initialized console so its server session stays warm across refresh cycles. */
export async function keepaliveConsoles(ctx: Ctx): Promise<void> {
  const targets = ctx.instances().filter((entry) => ctx.sessions()[entry.id]?.initialized);
  await Promise.all(
    targets.map(async (entry) => {
      try {
        const { keepalive } = await ctx.request<{ keepalive: { ok: boolean; checkedAt: number } }>(
          `/api/instances/${entry.id}/console/keepalive`,
          { method: "POST", body: "{}" },
        );
        const current = ctx.sessions()[entry.id] ?? BLANK_CONSOLE;
        ctx.patch(entry.id, {
          ...current,
          initialized: true,
          ok: keepalive.ok,
          checkedAt: new Date(keepalive.checkedAt).toISOString(),
        });
      } catch {
        /* a failed keepalive surfaces on the next explicit action */
      }
    }),
  );
}
