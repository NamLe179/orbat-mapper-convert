export function enum2Items(enumType: { [key: number]: string }) {
  return Object.entries(enumType).map(([label, value]) => ({
    label,
    value,
  }));
}

/**
 * Compares two objects and returns the differences between them.
 */
export function getChangedValues<T extends Record<string, any>>(
  obj1: Partial<T>,
  obj2: T,
): Partial<T> {
  const diff: any = {};
  Object.keys(obj1).forEach((key) => {
    // So sánh nông (shallow comparison)
    if (obj2[key] !== obj1[key]) {
      diff[key] = obj1[key];
    }
  });
  return diff;
}

export function removeUndefined<T extends Record<string, any>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined)
  ) as T;
}

export function createNameToIdMap<T extends { name: string; id: string }>(
  items: Record<string, T>,
): Map<string, string> {
  return new Map(Object.values(items).map((e) => [e.name, e.id]));
}

export function createNameToIdMapObject<T extends { name: string; id: string }>(
  items: Record<string, T>,
): Record<string, string> {
  return Object.fromEntries(Object.values(items).map((e) => [e.name, e.id]));
}

// Simple hash function (djb2 algorithm)
function simpleHash(str: string) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i); // hash * 33 + c
  }
  return hash >>> 0; // Convert to unsigned
}

// Stable stringify to guarantee consistent key order for hashing
function stableStringify(obj: any): string {
  if (obj === null) return "null";
  if (typeof obj !== "object") return JSON.stringify(obj);
  
  if (Array.isArray(obj)) {
    return "[" + obj.map(stableStringify).join(",") + "]";
  }
  
  return (
    "{" +
    Object.keys(obj)
      .sort() // Quan trọng: sắp xếp key để hash luôn giống nhau
      .map((key) => JSON.stringify(key) + ":" + stableStringify(obj[key]))
      .join(",") +
    "}"
  );
}

// Hash a JS object
export function hashObject(obj: Record<string, any>): string {
  const str = stableStringify(obj);
  return simpleHash(str).toString(16); // Returns a hex string
}