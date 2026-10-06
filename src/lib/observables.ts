import type { CaseAlert } from "@/lib/types";

export type ObservableKind =
  | "ip_public"
  | "ip_private"
  | "mac"
  | "domain"
  | "hostname"
  | "username"
  | "email"
  | "url"
  | "filename"
  | "hash"
  | "registry"
  | "geo"
  | "reputation";

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
  mac: "MAC addresses",
  domain: "Domains",
  hostname: "Hostnames",
  username: "Usernames",
  email: "Email addresses",
  url: "URLs",
  filename: "File names",
  hash: "File hashes",
  registry: "Registry keys",
  geo: "Geolocations",
  reputation: "Reputations",
};

// Output group order (IPs first, public before private).
const KIND_ORDER: ObservableKind[] = [
  "ip_public",
  "ip_private",
  "mac",
  "domain",
  "hostname",
  "username",
  "email",
  "url",
  "filename",
  "hash",
  "registry",
  "geo",
  "reputation",
];

// Accumulation order used while walking alerts (IPs pooled under a single "ip" bucket).
const ACCUM_ORDER: AccumKind[] = [
  "ip",
  "mac",
  "domain",
  "hostname",
  "username",
  "email",
  "url",
  "filename",
  "hash",
  "registry",
  "geo",
  "reputation",
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

// Whole-value IP validators (anchored). IPv6 must be the full 8-group form OR use "::" compression —
// loose colon-hex strings (e.g. 3-group values, MACs) are intentionally NOT treated as IPv6.
const IPV4_ANCHORED = /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/;
const IPV6_CORE = [
  "(?:[0-9A-Fa-f]{1,4}:){7}[0-9A-Fa-f]{1,4}", // full 8 groups
  "(?:[0-9A-Fa-f]{1,4}:){1,7}:", // trailing ::
  "(?:[0-9A-Fa-f]{1,4}:){1,6}:[0-9A-Fa-f]{1,4}",
  "(?:[0-9A-Fa-f]{1,4}:){1,5}(?::[0-9A-Fa-f]{1,4}){1,2}",
  "(?:[0-9A-Fa-f]{1,4}:){1,4}(?::[0-9A-Fa-f]{1,4}){1,3}",
  "(?:[0-9A-Fa-f]{1,4}:){1,3}(?::[0-9A-Fa-f]{1,4}){1,4}",
  "(?:[0-9A-Fa-f]{1,4}:){1,2}(?::[0-9A-Fa-f]{1,4}){1,5}",
  "[0-9A-Fa-f]{1,4}:(?::[0-9A-Fa-f]{1,4}){1,6}",
  ":(?:(?::[0-9A-Fa-f]{1,4}){1,7}|:)", // leading ::
  "(?:[0-9A-Fa-f]{1,4}:){1,4}:(?:(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)", // v4-mapped
  "::(?:[fF]{4}(?::0{1,4})?:)?(?:(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)",
].join("|");
const IPV6_ANCHORED = new RegExp(`^(?:${IPV6_CORE})$`);

/** Pulls valid IPv4/IPv6 addresses out of an ip-named field value (handles lists and :port). */
function extractIps(value: string): string[] {
  const out: string[] = [];
  for (const raw of value.split(/[\s,;]+/)) {
    const token = raw.trim();
    if (!token) continue;
    const bracket = token.match(/^\[([^\]]+)\](?::\d+)?$/); // [v6]:port
    if (bracket) {
      if (IPV6_ANCHORED.test(bracket[1])) out.push(bracket[1].toLowerCase());
      continue;
    }
    const v4 = token.match(/^((?:\d{1,3}\.){3}\d{1,3})(?::\d+)?$/); // v4 with optional :port
    if (v4 && IPV4_ANCHORED.test(v4[1])) {
      out.push(v4[1]);
      continue;
    }
    if (IPV6_ANCHORED.test(token)) out.push(token.toLowerCase());
  }
  return out;
}
// 48-bit MAC (00:1A:2B:3C:4D:5E, dash, or Cisco dotted). Distinguished from IPv6 by its 2-hex octets.
const MAC = /\b(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\b|\b(?:[0-9A-Fa-f]{4}\.){2}[0-9A-Fa-f]{4}\b/g;
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
const MAC_KEY = /mac(_?addr(ess)?)?|hwaddr|ether(net)?_?addr/;
const REGISTRY_KEY = /registry|reg_?key|reg_?path|reg_?value/;
const GEO_KEY = /(geo|geoip|country|city|region|continent|(^|[_.])location([_.]|$))/;
// Reputation fields all contain "reputation"; *reputation_source* fields name the source, not the value.
const REPUTATION_KEY = /reputation/;

// Values that carry no signal — ignored across every category.
const IGNORE_VALUES = new Set(["", "-", "n/a", "na", "none", "null", "nil", "unknown", "undefined", "0.0.0.0", "::"]);

// File extensions used both to spot file names and to stop file.ext being read as a domain.
const FILE_EXTS =
  /\.(exe|dll|sys|ps1|bat|cmd|sh|py|js|vbs|jar|msi|scr|com|bin|dat|tmp|log|txt|doc|docx|xls|xlsx|ppt|pptx|pdf|zip|rar|7z|gz|tar|png|jpg|jpeg|gif|bmp|iso|img|reg|conf|cfg|json|xml|yml|yaml)$/i;
const FILENAME = new RegExp(`\\b[\\w .()-]{1,120}${FILE_EXTS.source.slice(1)}`, "i");

const isIp = (value: string) => {
  const v = value.trim();
  return IPV4_ANCHORED.test(v) || IPV6_ANCHORED.test(v);
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
  if (!value || IGNORE_VALUES.has(value.toLowerCase())) return;

  // MAC addresses first (they look like IPv6 to the naive eye) — pulled from mac-style fields.
  if (MAC_KEY.test(key)) {
    for (const mac of matches(MAC, value)) sink("mac", mac.toLowerCase());
  }
  if (IP_KEY.test(key)) {
    for (const ip of extractIps(value)) sink("ip", ip);
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
  if (REGISTRY_KEY.test(key) && (/^hk(ey_)?(lm|cu|cr|u|cc)/i.test(value) || value.includes("\\"))) {
    sink("registry", value);
  }
  // Geolocation components: textual places only (skip bare lat/long numbers).
  if (GEO_KEY.test(key) && /[a-z]/i.test(value) && value.length <= 64 && !/^\d/.test(value)) {
    sink("geo", value);
  }
  if (REPUTATION_KEY.test(key) && !key.includes("reputation_source") && value.length <= 64) {
    sink("reputation", value);
  }
}

/** Stable selection/index key for one observable (matches the UI's obsKey). */
export const observableKey = (kind: ObservableKind, value: string) => `${kind}::${value}`;

/** The output ObservableKind for an accumulation kind + value (splits IPs into public/private). */
function outputKind(accum: AccumKind, value: string): ObservableKind {
  if (accum !== "ip") return accum;
  return isPrivateIp(value) ? "ip_private" : "ip_public";
}

export interface ObservableIndex {
  groups: ObservableGroup[];
  /** observableKey -> ids of the alerts it appears in. */
  byObservable: Map<string, Set<string>>;
  /** alert id -> observableKeys found in that alert. */
  byAlert: Map<string, Set<string>>;
}

/** An alert's identity for cross-filtering (its ES `_id`, or a positional fallback). */
export const alertId = (alert: CaseAlert, index: number): string => alert._id || `idx:${index}`;

/**
 * Pools observables across every alert and records which alerts each observable appears in (and
 * vice-versa), so the observable panel and the alert table can cross-filter each other.
 */
export function buildObservableIndex(alerts: CaseAlert[]): ObservableIndex {
  const counts: Record<ObservableKind, Map<string, number>> = {
    ip_public: new Map(),
    ip_private: new Map(),
    mac: new Map(),
    domain: new Map(),
    hostname: new Map(),
    username: new Map(),
    email: new Map(),
    url: new Map(),
    filename: new Map(),
    hash: new Map(),
    registry: new Map(),
    geo: new Map(),
    reputation: new Map(),
  };
  const byObservable = new Map<string, Set<string>>();
  const byAlert = new Map<string, Set<string>>();

  alerts.forEach((alert, index) => {
    const id = alertId(alert, index);
    // Collect this alert's distinct observables first, so each value counts once per alert.
    const perAlert: Record<AccumKind, Set<string>> = {
      ip: new Set(),
      mac: new Set(),
      domain: new Set(),
      hostname: new Set(),
      username: new Set(),
      email: new Set(),
      url: new Set(),
      filename: new Set(),
      hash: new Set(),
      registry: new Set(),
      geo: new Set(),
      reputation: new Set(),
    };
    const sink: Sink = (kind, value) => perAlert[kind].add(value);
    for (const [key, value] of Object.entries(alert)) walk(key, value, (k, v) => classify(k, v, sink));

    const keysForAlert = new Set<string>();
    for (const accum of ACCUM_ORDER) {
      for (const value of perAlert[accum]) {
        const kind = outputKind(accum, value);
        counts[kind].set(value, (counts[kind].get(value) ?? 0) + 1);
        const key = observableKey(kind, value);
        keysForAlert.add(key);
        if (!byObservable.has(key)) byObservable.set(key, new Set());
        byObservable.get(key)!.add(id);
      }
    }
    byAlert.set(id, keysForAlert);
  });

  const groups = KIND_ORDER.map((kind) => ({
    kind,
    label: GROUP_LABELS[kind],
    observables: [...counts[kind].entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value)),
  })).filter((group) => group.observables.length > 0);

  return { groups, byObservable, byAlert };
}

/** Pools observables across every alert (groups only). */
export function extractObservables(alerts: CaseAlert[]): ObservableGroup[] {
  return buildObservableIndex(alerts).groups;
}
