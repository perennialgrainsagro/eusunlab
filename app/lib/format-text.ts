import { createElement, type ReactNode } from "react";
import { contentUrl } from "./content-schema.ts";

// shortcut: inline bold and links only; use a Markdown parser if more syntax is needed.
const inlinePattern = /\*\*([^*\r\n]+)\*\*|\[([^\]\r\n]+)\]\(((?:[^()\s]|\([^()\s]*\))+)\)/g;

export function formatText(text: string, allowLinks = true) {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  for (const match of text.matchAll(inlinePattern)) {
    nodes.push(text.slice(cursor, match.index));
    if (match[1] !== undefined) {
      nodes.push(createElement("strong", { key: match.index }, formatText(match[1], allowLinks)));
    } else {
      const href = contentUrl(match[3], true);
      const external = /^https?:/i.test(href);
      const label = formatText(match[2], false);
      nodes.push(!href ? match[0] : !allowLinks ? label : createElement("a", {
        key: match.index,
        href,
        target: external ? "_blank" : undefined,
        rel: external ? "noreferrer noopener" : undefined,
      }, label));
    }
    cursor = match.index + match[0].length;
  }
  nodes.push(text.slice(cursor));
  return nodes;
}

export function plainText(text: string): string {
  return text.replace(inlinePattern, (_, bold, label) => plainText(bold ?? label));
}

export function firstSentence(text: string): string {
  const input = text.trim();
  const sentences = new Intl.Segmenter("en", { granularity: "sentence" }).segment(plainText(input));
  const sentence = sentences[Symbol.iterator]().next().value?.segment.trimEnd() || "";
  return truncateInlineText(input, sentence.length);
}

function truncateInlineText(text: string, length: number): string {
  let result = "";
  let cursor = 0;
  for (const match of text.matchAll(inlinePattern)) {
    const prefix = text.slice(cursor, match.index);
    if (length <= prefix.length) return result + prefix.slice(0, length);
    result += prefix;
    length -= prefix.length;
    const label = match[1] ?? match[2];
    const labelLength = plainText(label).length;
    const value = truncateInlineText(label, Math.min(length, labelLength));
    result += match[1] !== undefined ? "**" + value + "**" : "[" + value + "](" + match[3] + ")";
    length -= labelLength;
    if (length <= 0) return result;
    cursor = match.index + match[0].length;
  }
  return result + text.slice(cursor, cursor + length);
}
