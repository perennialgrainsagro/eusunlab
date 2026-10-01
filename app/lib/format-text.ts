import { createElement, type ReactNode } from "react";
import { safeUrl } from "./content.ts";

// ponytail: inline bold and links only; use a Markdown parser if more syntax is needed.
const boldPattern = /\*\*([^*\r\n]+)\*\*/g;
const inlinePattern = /\*\*([^*\r\n]+)\*\*|\[([^\]\r\n]+)\]\(((?:[^()\s]|\([^()\s]*\))+)\)/g;

export function formatText(text: string, allowLinks = false) {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  for (const match of text.matchAll(allowLinks ? inlinePattern : boldPattern)) {
    nodes.push(text.slice(cursor, match.index));
    if (match[1] !== undefined) {
      nodes.push(createElement("strong", { key: match.index }, formatText(match[1], allowLinks)));
    } else {
      const href = safeUrl(match[3]);
      const external = /^https?:/i.test(href);
      nodes.push(href ? createElement("a", {
        key: match.index,
        href,
        target: external ? "_blank" : undefined,
        rel: external ? "noreferrer noopener" : undefined,
      }, formatText(match[2])) : match[0]);
    }
    cursor = match.index + match[0].length;
  }
  nodes.push(text.slice(cursor));
  return nodes;
}

export function plainText(text: string): string {
  return text.replace(inlinePattern, (_, bold, label) => plainText(bold ?? label));
}
