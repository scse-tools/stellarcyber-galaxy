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

/** Normalizes an epoch value to milliseconds, or null when it isn't a plausible timestamp. */
export function epochMs(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (n >= 1e12) return n; // milliseconds
  if (n >= 1e9) return n * 1000; // seconds
  return null;
}

/** Formats an epoch value (s or ms) as `YYYY-MM-DD HH:MM:SS UTC`, or "" when not a timestamp. */
export function formatEpoch(value: unknown): string {
  const ms = epochMs(value);
  return ms === null ? "" : new Date(ms).toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
}

/** Human-readable byte size, e.g. 1536 → "1.5 KB", 0 → "0 B". */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  const exponent = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

/** Best-effort host label for a console URL, e.g. `salesdemo.stellarcyber.cloud`. */
export function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
