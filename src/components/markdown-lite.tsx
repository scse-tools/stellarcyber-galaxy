"use client";

import type { ReactNode } from "react";

/** Renders inline **bold**, *italic* and `code` within a line. */
function inline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const regex = /(\*\*([^*]+)\*\*|`([^`]+)`|\*([^*]+)\*)/g;
  let last = 0;
  let key = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    if (match[2] !== undefined) nodes.push(<strong key={key++} className="font-semibold">{match[2]}</strong>);
    else if (match[3] !== undefined)
      nodes.push(
        <code key={key++} className="rounded bg-sc-active px-1 py-0.5 font-mono text-[0.85em]">
          {match[3]}
        </code>,
      );
    else if (match[4] !== undefined) nodes.push(<em key={key++}>{match[4]}</em>);
    last = match.index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/** Minimal Markdown renderer: headings, bullet/numbered lists, bold/italic/code and paragraphs. */
export function MarkdownLite({ text }: { text: string }) {
  const lines = text.replace(/\r/g, "").split("\n");
  const blocks: ReactNode[] = [];
  let para: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let key = 0;

  const flushPara = () => {
    if (para.length) {
      blocks.push(
        <p key={key++} className="text-sm leading-relaxed text-sc-text">
          {inline(para.join(" "))}
        </p>,
      );
      para = [];
    }
  };
  const flushList = () => {
    if (!list) return;
    const items = list.items.map((it, j) => <li key={j}>{inline(it)}</li>);
    blocks.push(
      list.ordered ? (
        <ol key={key++} className="list-decimal space-y-1 pl-5 text-sm leading-relaxed text-sc-text">
          {items}
        </ol>
      ) : (
        <ul key={key++} className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-sc-text">
          {items}
        </ul>
      ),
    );
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushPara();
      flushList();
      continue;
    }
    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      flushPara();
      flushList();
      blocks.push(
        <p key={key++} className="mt-1 text-sm font-semibold text-sc-text">
          {inline(heading[2])}
        </p>,
      );
      continue;
    }
    const ul = line.match(/^[-*]\s+(.*)$/);
    const ol = line.match(/^\d+\.\s+(.*)$/);
    if (ul || ol) {
      flushPara();
      const ordered = Boolean(ol);
      if (!list || list.ordered !== ordered) {
        flushList();
        list = { ordered, items: [] };
      }
      list.items.push(ul ? ul[1] : ol![1]);
      continue;
    }
    para.push(line);
  }
  flushPara();
  flushList();

  return <div className="space-y-2">{blocks}</div>;
}
