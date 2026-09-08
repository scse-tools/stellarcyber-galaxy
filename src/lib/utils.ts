import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatRelativeTime(iso: string | undefined): string {
  if (!iso) return "never";
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.round(minutes / 60)}h ago`;
}

/** Builds an absolute deep link into a console, e.g. consoleLink(url, "/cases"). */
export function consoleLink(consoleUrl: string, path: string): string {
  try {
    return new URL(path, consoleUrl).toString();
  } catch {
    return consoleUrl;
  }
}

/** Derives the MCP endpoint from the console URL: `<origin>/mcp`. */
export function deriveMcpUrl(consoleUrl: string): string {
  try {
    return new URL("/mcp", new URL(consoleUrl).origin).toString();
  } catch {
    return consoleUrl.replace(/\/+$/, "") + "/mcp";
  }
}

/** Best-effort host label for a console URL, e.g. `salesdemo.stellarcyber.cloud`. */
export function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
