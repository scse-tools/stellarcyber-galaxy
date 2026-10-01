import type { CaseAlert } from "@/lib/types";

export type ObservableKind =
  | "ip_public"
  | "ip_private"
  | "domain"
  | "hostname"
  | "username"
  | "email"
  | "url"
  | "filename"
  | "hash";

/** Internal accumulation kind: IPs are pooled together, then split into public/private on output. */
type AccumKind = Exclude<ObservableKind, "ip_public" | "ip_private"> | "ip";

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
  ip_public: "Public IP addresses",
  ip_private: "Private IP addresses",
  domain: "Domains",
  hostname: "Hostnames",
  username: "Usernames",
  email: "Email addresses",
  url: "URLs",
  filename: "File names",
  hash: "File hashes",
};

// Output group order (IPs first, public before private).
const KIND_ORDER: ObservableKind[] = [
  "ip_public",
  "ip_private",
  "domain",
  "hostname",
  "username",
  "email",
  "url",
  "filename",
  "hash",
];

// Accumulation order used while walking alerts (IPs pooled under a single "ip" bucket).
const ACCUM_ORDER: AccumKind[] = [
  "ip",
  "domain",
  "hostname",
  "username",
  "email",
  "url",
  "filename",
  "hash",
];

/** True for RFC1918 space plus loopback and link-local — the "internal" addresses. */
export function isPrivateIp(ip: string): boolean {
  const v4 = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const a = Number(v4[1]);
    const b = Number(v4[2]);
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 127) return true; // loopback
    if (a === 169 && b === 254) return true; // link-local
    return false;
  }
  const v6 = ip.toLowerCase();
  if (v6 === "::1") return true; // loopback
  if (v6.startsWith("fe80")) return true; // link-local
  if (/^f[cd]/.test(v6)) return true; // unique local fc00::/7
  return false;
}

const IPV4 = /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g;
const IPV6 = /\b(?:[A-Fa-f0-9]{1,4}:){2,7}[A-Fa-f0-9]{1,4}\b/g;
const EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const URL_RE = /\bhttps?:\/\/[^\s"'<>]+/gi;
const HASH = /\b(?:[A-Fa-f0-9]{64}|[A-Fa-f0-9]{40}|[A-Fa-f0-9]{32})\b/g;
const DOMAIN = /\b(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,24}\b/g;

// Each observable type is only pulled from fields whose NAME matches its category — e.g. an IP must
// come from a field like srcip/dst_ip/remote_ip, a username from a *user* field, a hash from an
// md5/sha*/hash field, and so on. This keeps embedded values in free-text fields out of the pool.
const IP_KEY = /(^|[_.])[a-z0-9]*ip(v4|v6|addr)?s?([_.]|$)/;
const EMAIL_KEY = /(e?mail|sender|recipient|rcpt|mailbox)/;
const URL_KEY = /(url|uri|referer|referrer)/;
const DOMAIN_KEY = /(domain|fqdn|dns[_.]?(name|query|rrname)|(^|[_.])sld([_.]|$)|(^|[_.])tld([_.]|$))/;
const HOST_KEY = /(hostname|host[_.]?name|(^|[_.])host([_.]|$)|_host$|computer|netbios|dev_name|device_name|machine|node[_.]?name)/;
const USER_KEY = /(user|account|logon|login|samaccount|principal)/;
const HASH_KEY = /((^|[_.])(md5|sha1|sha256|sha512|imphash|checksum|hash)([_.]|$)|md5|sha[0-9])/;
const FILE_KEY = /(file|filename|process|image|attachment|object_name)/;

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

type Sink = (kind: AccumKind, value: string) => void;

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

/**
 * Classify one (key, value) leaf. An observable is only emitted when the field NAME matches its
 * category AND the value passes that category's validation — so values are drawn from the right
 * fields (ip-style names for IPs, user-style for usernames, md5/sha/hash for hashes, url/uri for URLs, etc.).
 */
function classify(key: string, raw: string, sink: Sink): void {
  const value = raw.trim();
  if (!value) return;

  if (IP_KEY.test(key)) {
    for (const ip of matches(IPV4, value)) sink("ip", ip);
    for (const ip of matches(IPV6, value)) sink("ip", ip);
  }
  if (EMAIL_KEY.test(key)) {
    for (const email of matches(EMAIL, value)) sink("email", email.toLowerCase());
  }
  if (URL_KEY.test(key)) {
    const urls = matches(URL_RE, value);
    if (urls.length) for (const url of urls) sink("url", url);
    else if (value.includes("://") || value.startsWith("/")) sink("url", value);
  }
  if (DOMAIN_KEY.test(key)) {
    const lower = value.toLowerCase();
    if (looksLikeDomain(lower)) sink("domain", lower);
    else for (const domain of matches(DOMAIN, value)) if (looksLikeDomain(domain)) sink("domain", domain.toLowerCase());
  }
  if (HOST_KEY.test(key) && !/\s/.test(value) && !isIp(value) && value.length <= 255 && /[a-z]/i.test(value)) {
    sink("hostname", value.toLowerCase());
  }
  if (USER_KEY.test(key) && !value.includes("@") && value.length <= 64 && !/^\d+$/.test(value)) {
    sink("username", value);
  }
  if (HASH_KEY.test(key)) {
    for (const hash of matches(HASH, value)) sink("hash", hash.toLowerCase());
  }
  if (FILE_KEY.test(key)) {
    const found = matches(FILENAME, value);
    if (found.length) for (const file of found) sink("filename", file.trim());
    else if (/[\\/]/.test(value)) sink("filename", value.trim());
  }
}

/**
 * Pools observables (IPs, domains, hostnames, usernames, emails, URLs, file names, hashes) across
 * every alert in a case. Each value is counted by how many alerts it appears in.
 */
export function extractObservables(alerts: CaseAlert[]): ObservableGroup[] {
  const emptyCounts = (): Record<AccumKind, Map<string, number>> => ({
    ip: new Map(),
    domain: new Map(),
    hostname: new Map(),
    username: new Map(),
    email: new Map(),
    url: new Map(),
    filename: new Map(),
    hash: new Map(),
  });
  const counts = emptyCounts();

  for (const alert of alerts) {
    // Collect this alert's distinct observables first, so each value counts once per alert.
    const perAlert: Record<AccumKind, Set<string>> = {
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

    for (const kind of ACCUM_ORDER) {
      for (const value of perAlert[kind]) counts[kind].set(value, (counts[kind].get(value) ?? 0) + 1);
    }
  }

  const toObservables = (map: Map<string, number>) =>
    [...map.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));

  // Split the pooled IPs into public/private; everything else maps straight through.
  const groups = new Map<ObservableKind, ObservableGroup["observables"]>();
  const publicIps = new Map<string, number>();
  const privateIps = new Map<string, number>();
  for (const [value, count] of counts.ip) (isPrivateIp(value) ? privateIps : publicIps).set(value, count);
  groups.set("ip_public", toObservables(publicIps));
  groups.set("ip_private", toObservables(privateIps));
  for (const kind of ACCUM_ORDER) {
    if (kind === "ip") continue;
    groups.set(kind, toObservables(counts[kind]));
  }

  return KIND_ORDER.map((kind) => ({
    kind,
    label: GROUP_LABELS[kind],
    observables: groups.get(kind) ?? [],
  })).filter((group) => group.observables.length > 0);
}
