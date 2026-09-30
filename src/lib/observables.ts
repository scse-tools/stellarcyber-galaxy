import type { CaseAlert } from "@/lib/types";

export type ObservableKind =
  | "ip"
  | "domain"
  | "hostname"
  | "username"
  | "email"
  | "url"
  | "filename"
  | "hash";

export interface Observable {
  value: string;
  /** Number of alerts the value appears in. */
  count: number;
}

export interface ObservableGroup {
  kind: ObservableKind;
  label: string;
  observables: Observable[];
}

const GROUP_LABELS: Record<ObservableKind, string> = {
  ip: "IP addresses",
  domain: "Domains",
  hostname: "Hostnames",
  username: "Usernames",
  email: "Email addresses",
  url: "URLs",
  filename: "File names",
  hash: "File hashes",
};

const KIND_ORDER: ObservableKind[] = [
  "ip",
  "domain",
  "hostname",
  "username",
  "email",
  "url",
  "filename",
  "hash",
];

const IPV4 = /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g;
const IPV6 = /\b(?:[A-Fa-f0-9]{1,4}:){2,7}[A-Fa-f0-9]{1,4}\b/g;
const EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const URL_RE = /\bhttps?:\/\/[^\s"'<>]+/gi;
const HASH = /\b(?:[A-Fa-f0-9]{64}|[A-Fa-f0-9]{40}|[A-Fa-f0-9]{32})\b/g;
const DOMAIN = /\b(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,24}\b/g;

const USER_KEY = /(user|account|logon|login|samaccount|principal)/;
const HOST_KEY = /(host|hostname|computer|device|dev_name|machine|netbios|node_name)/;
const DOMAIN_KEY = /(domain|fqdn|dns|tld|sld)/;
const FILE_KEY = /(file|filename|process|image|attachment|object_name)/;
const HASH_KEY = /(hash|md5|sha1|sha256|sha512|imphash|checksum)/;
const URL_KEY = /(url|uri|referer|referrer|location)/;

// File extensions used both to spot file names and to stop file.ext being read as a domain.
const FILE_EXTS =
  /\.(exe|dll|sys|ps1|bat|cmd|sh|py|js|vbs|jar|msi|scr|com|bin|dat|tmp|log|txt|doc|docx|xls|xlsx|ppt|pptx|pdf|zip|rar|7z|gz|tar|png|jpg|jpeg|gif|bmp|iso|img|reg|conf|cfg|json|xml|yml|yaml)$/i;
const FILENAME = new RegExp(`\\b[\\w .()-]{1,120}${FILE_EXTS.source.slice(1)}`, "i");

const isIp = (value: string) => {
  IPV4.lastIndex = 0;
  IPV6.lastIndex = 0;
  return IPV4.test(value) || IPV6.test(value);
};

const looksLikeDomain = (value: string) =>
  /^[A-Za-z0-9.-]+$/.test(value) && value.includes(".") && !FILE_EXTS.test(value) && !isIp(value);

/** Pull the host out of a URL without throwing on the odd malformed value. */
function urlHost(url: string): string | null {
  try {
    return new URL(url).hostname || null;
  } catch {
    return null;
  }
}

type Sink = (kind: ObservableKind, value: string) => void;

/** Recursively visit every scalar leaf, carrying its (nearest) key for key-based hints. */
function walk(key: string, value: unknown, visit: (key: string, value: string) => void): void {
  if (value === null || value === undefined) return;
  if (Array.isArray(value)) {
    for (const item of value) walk(key, item, visit);
    return;
  }
  if (typeof value === "object") {
    for (const [childKey, childValue] of Object.entries(value)) walk(childKey, childValue, visit);
    return;
  }
  if (typeof value === "string" || typeof value === "number") visit(key.toLowerCase(), String(value));
}

function matches(regex: RegExp, text: string): string[] {
  regex.lastIndex = 0;
  return text.match(regex) ?? [];
}

/** Classify one (key, value) leaf, feeding any observables it yields to the sink. */
function classify(key: string, raw: string, sink: Sink): void {
  const value = raw.trim();
  if (!value) return;

  // Value-pattern matches work regardless of the field name (catches embedded IOCs in free text).
  for (const email of matches(EMAIL, value)) {
    sink("email", email.toLowerCase());
    const domain = email.split("@")[1];
    if (domain) sink("domain", domain.toLowerCase());
  }
  for (const url of matches(URL_RE, value)) {
    sink("url", url);
    const host = urlHost(url);
    if (host && !isIp(host)) sink("domain", host.toLowerCase());
  }
  for (const hash of matches(HASH, value)) sink("hash", hash.toLowerCase());
  for (const ip of matches(IPV4, value)) sink("ip", ip);
  for (const ip of matches(IPV6, value)) sink("ip", ip);

  // Standalone, single-token values (skip long free text and anything already an email/url).
  const singleToken = value.length <= 100 && !/\s/.test(value) && !value.includes("@") && !value.includes("/");
  if (singleToken) {
    for (const domain of matches(DOMAIN, value)) {
      if (looksLikeDomain(domain)) sink("domain", domain.toLowerCase());
    }
  }

  // Key-based hints for observables that have no reliable value signature.
  if (USER_KEY.test(key) && !value.includes("@") && value.length <= 64 && !/^\d+$/.test(value)) {
    sink("username", value);
  }
  if (HOST_KEY.test(key) && singleToken && !isIp(value)) {
    sink("hostname", value.toLowerCase());
    if (looksLikeDomain(value)) sink("domain", value.toLowerCase());
  }
  if (DOMAIN_KEY.test(key) && singleToken && looksLikeDomain(value)) sink("domain", value.toLowerCase());
  if (URL_KEY.test(key) && value.includes("/") && !/\s/.test(value)) sink("url", value);
  if (HASH_KEY.test(key) && /^[A-Fa-f0-9]{8,128}$/.test(value)) sink("hash", value.toLowerCase());
  if (FILE_KEY.test(key)) {
    const found = matches(FILENAME, value)[0];
    if (found) sink("filename", found.trim());
  }
}

/**
 * Pools observables (IPs, domains, hostnames, usernames, emails, URLs, file names, hashes) across
 * every alert in a case. Each value is counted by how many alerts it appears in.
 */
export function extractObservables(alerts: CaseAlert[]): ObservableGroup[] {
  const counts: Record<ObservableKind, Map<string, number>> = {
    ip: new Map(),
    domain: new Map(),
    hostname: new Map(),
    username: new Map(),
    email: new Map(),
    url: new Map(),
    filename: new Map(),
    hash: new Map(),
  };

  for (const alert of alerts) {
    // Collect this alert's distinct observables first, so each value counts once per alert.
    const perAlert: Record<ObservableKind, Set<string>> = {
      ip: new Set(),
      domain: new Set(),
      hostname: new Set(),
      username: new Set(),
      email: new Set(),
      url: new Set(),
      filename: new Set(),
      hash: new Set(),
    };
    const sink: Sink = (kind, value) => perAlert[kind].add(value);
    for (const [key, value] of Object.entries(alert)) walk(key, value, (k, v) => classify(k, v, sink));

    for (const kind of KIND_ORDER) {
      for (const value of perAlert[kind]) counts[kind].set(value, (counts[kind].get(value) ?? 0) + 1);
    }
  }

  return KIND_ORDER.map((kind) => ({
    kind,
    label: GROUP_LABELS[kind],
    observables: [...counts[kind].entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value)),
  })).filter((group) => group.observables.length > 0);
}
