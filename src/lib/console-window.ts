"use client";

import type { ConsoleLoginResult } from "@/lib/console/session";

/**
 * Auto-login into a Stellar Cyber console from the browser.
 *
 * The console is defended in ways that shape this flow, all confirmed against a live instance:
 *  - Session cookies are SameSite=Strict, so they can only be planted by a *top-level* navigation
 *    (an iframe or cross-origin fetch would have the cookie dropped).
 *  - Its login endpoint answers with JSON, not a redirect, and carries
 *    `Cross-Origin-Opener-Policy: same-origin`, which severs our handle to the window the moment it
 *    lands on that JSON. So we cannot script the posting window afterwards.
 *
 * Therefore we plant the cookie in a *throwaway* window, then reach the dashboard with a separate
 * top-level `window.open(consoleUrl)` — the console's own SPA then authenticates via its same-site
 * XHR and shows the dashboard. The dashboard open must ride a user gesture, so it is a second click.
 */

const consoleName = (instanceId: string) => `sc-console-${instanceId}`;
const plantName = (instanceId: string) => `sc-plant-${instanceId}`;

// Records which instances have had their cookie planted this browser session.
const planted = new Set<string>();

export function isConsolePlanted(instanceId: string): boolean {
  return planted.has(instanceId);
}

/**
 * Plants the console session cookie by top-level POSTing the console's own login form into a small
 * throwaway window. The encoded password is exactly what the console's login page itself submits.
 */
export function plantConsoleSession(instanceId: string, login: ConsoleLoginResult): void {
  const target = window.open(
    "about:blank",
    plantName(instanceId),
    "width=520,height=420,noopener=no",
  );
  if (!target) {
    throw new Error("Pop-up blocked. Allow pop-ups for this app, then try Initialize again.");
  }

  const form = document.createElement("form");
  form.method = "POST";
  form.action = login.action;
  form.target = plantName(instanceId);
  form.acceptCharset = "UTF-8";
  form.style.display = "none";

  const body: Record<string, string> = {
    name: login.fields.name,
    email: login.fields.email,
    password: login.fields.password,
    buildHash: login.fields.buildHash,
  };
  for (const [key, value] of Object.entries(body)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = key;
    input.value = value;
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
  form.remove();
  planted.add(instanceId);
}

/**
 * Opens the authenticated console dashboard in its named window. Must be called from a user
 * gesture. Returns the window handle (or null if the pop-up was blocked).
 */
export function openConsoleDashboard(instanceId: string, consoleUrl: string): Window | null {
  return window.open(consoleUrl, consoleName(instanceId));
}
