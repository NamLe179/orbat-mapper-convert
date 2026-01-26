import { u } from "unist-builder";
import { x } from "xastscript";

/**
 * Creates a DOM Document from a string.
 * Note: DOMParser is a Web API and is not available during Server-Side Rendering (SSR).
 * Ensure this function is called only on the client-side.
 */
export function createFromString(xmlString: string): Document {
  if (typeof window === "undefined") {
    throw new Error(
      "createFromString uses DOMParser and cannot be run on the server. Please ensure this is called within a Client Component or useEffect."
    );
  }
  const parser = new DOMParser();
  return parser.parseFromString(xmlString, "text/xml");
}

export function getElements(element: Element | Document, tagName: string): Element[] {
  return Array.from(element.getElementsByTagName(tagName));
}

export function getOneElement(
  element: Element | Document,
  tagName: string,
): Element | null {
  const elements = getElements(element, tagName);
  return elements.length ? elements[0] : null;
}

export function nodeValue(node: Element | null) {
  node?.normalize();
  return (node && node.textContent) || "";
}

// --- XML/AST Builders (Framework Agnostic) ---

export const BR = u("text", "\n");
export const TAB = u("text", "  ");
export const BRTAB = u("text", "\n  ");

export function tagValue(tagName: string, value: string | number) {
  return x(tagName, [u("text", `${value}`)]);
}

export function tagIdValue(tagName: string, id: string, value: string | number) {
  return x(tagName, { ID: id }, [u("text", `${value}`)]);
}