import type { ChartUnit, UnitNodeVisitorCallback } from "./types";

/**
 * Traverses the unit tree recursively.
 */
export function walkTree(root: ChartUnit, callback: UnitNodeVisitorCallback) {
  let level = 0;

  function helper(currentUnit: ChartUnit, parent: ChartUnit | null) {
    callback(currentUnit, level, parent);
    if (currentUnit.subUnits) {
      level += 1;
      for (const subUnit of currentUnit.subUnits) {
        helper(subUnit, currentUnit);
      }
      level -= 1;
    }
  }

  helper(root, null);
}

/**
 * Creates an SVG element with the correct namespace.
 * Note: This relies on the DOM API and must be called on the Client-side.
 */
export function createElement(elementName: string) {
  // Safety check for SSR in Next.js
  if (typeof document === "undefined") {
    throw new Error(
      "createElement uses 'document' and cannot be run on the server. Ensure this is called within a Client Component or useEffect."
    );
  }
  return document.createElementNS("http://www.w3.org/2000/svg", elementName);
}

export function flattenArray<T>(array: any[]): T[] {
  return ([] as T[]).concat(...array);
  // return array.reduce((acc, val) => acc.concat(val), []);
}

export function arrSum(array: number[]): number {
  return array.reduce((a, b) => a + b, 0);
}