"use client";

import { createElement, Fragment, useEffect, useState, type ReactNode } from "react";
import { MarkdownLite } from "@/components/markdown-lite";

// Heuristics to tell apart the three shapes LLM output arrives in.
const HTML_RE =
  /<\/?(p|div|br|ul|ol|li|h[1-6]|table|thead|tbody|tr|td|th|span|strong|em|b|i|u|a|pre|code|blockquote|hr)\b[^>]*>/i;
const MARKDOWN_RE =
  /(^|\n)\s{0,3}(#{1,6}\s|[-*+]\s|\d+\.\s)|\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|(^|\n)\s*\|.*\|/;

// Styling for the HTML tags we allow through the safe renderer.
const TAG_CLASS: Record<string, string> = {
  p: "text-sm leading-relaxed text-sc-text",
  div: "text-sm leading-relaxed text-sc-text",
  h1: "text-base font-semibold text-sc-text mt-1",
  h2: "text-sm font-semibold text-sc-text mt-1",
  h3: "text-sm font-semibold text-sc-text mt-1",
  h4: "text-sm font-semibold text-sc-text",
  h5: "text-sm font-semibold text-sc-text",
  h6: "text-sm font-semibold text-sc-text",
  ul: "list-disc space-y-1 pl-5 text-sm text-sc-text",
  ol: "list-decimal space-y-1 pl-5 text-sm text-sc-text",
  li: "",
  blockquote: "border-l-2 border-sc-border pl-2 text-sm text-sc-muted",
  pre: "overflow-auto rounded bg-sc-active p-2 font-mono text-[11px]",
  code: "rounded bg-sc-active px-1 font-mono text-[0.85em]",
  strong: "font-semibold",
  b: "font-semibold",
  em: "italic",
  i: "italic",
  u: "underline",
  span: "",
  table: "w-full border-collapse text-xs",
  thead: "",
  tbody: "",
  tr: "",
  td: "border border-sc-border-soft px-1.5 py-0.5 align-top",
  th: "border border-sc-border-soft px-1.5 py-0.5 text-left font-medium",
};
const DROP = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "LINK", "META", "HEAD", "SVG"]);

function nodeToReact(node: ChildNode, key: number): ReactNode {
  if (node.nodeType === Node.TEXT_NODE) return node.nodeValue;
  if (node.nodeType !== Node.ELEMENT_NODE) return null;
  const el = node as Element;
  const tag = el.tagName;
  if (DROP.has(tag)) return null;
  const children = Array.from(el.childNodes).map((child, i) => nodeToReact(child, i));
  if (tag === "BR") return createElement("br", { key });
  if (tag === "HR") return createElement("hr", { key, className: "my-2 border-sc-border-soft" });
  if (tag === "A") {
    const href = el.getAttribute("href") ?? "";
    const safe = /^(https?:|mailto:)/i.test(href) ? href : undefined; // block javascript: etc.
    return createElement(
      "a",
      { key, href: safe, target: "_blank", rel: "noopener noreferrer", className: "text-sc-link hover:underline" },
      children,
    );
  }
  const cls = TAG_CLASS[tag.toLowerCase()];
  if (cls !== undefined) return createElement(tag.toLowerCase(), { key, className: cls || undefined }, children);
  return createElement(Fragment, { key }, children); // unknown tag: keep its contents, drop the wrapper
}

/** Safely render an HTML string by walking a parsed DOM (no innerHTML, allow-listed tags only). */
function renderHtml(html: string): ReactNode {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return <div className="space-y-2">{Array.from(doc.body.childNodes).map((n, i) => nodeToReact(n, i))}</div>;
}

/**
 * Renders model output appropriately for its shape: sanitized HTML as formatted HTML, Markdown via
 * the Markdown renderer, and plain text preformatted so its line breaks and spacing are preserved.
 */
export function RichText({ text }: { text: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!text) return null;

  if (HTML_RE.test(text)) {
    // DOMParser is client-only; before mount, show stripped text to avoid SSR/hydration issues.
    if (!mounted) {
      return <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-sc-text">{text.replace(/<[^>]+>/g, "")}</pre>;
    }
    return renderHtml(text);
  }
  if (MARKDOWN_RE.test(text)) return <MarkdownLite text={text} />;
  return <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-sc-text">{text}</pre>;
}
