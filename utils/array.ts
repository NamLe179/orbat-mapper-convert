import type { EntityId } from "@/types/base";
// Đảm bảo bạn đã có file này trong thư mục types, nếu chưa hãy tạo nó hoặc tạm thời dùng string | number
import type { FeatureId } from "@/types/scenarioGeoModels"; 

/**
 * Groups an array of objects by a specific key using a Map.
 */
export function groupBy<T extends object, K extends keyof T>(arr: T[], key: K) {
  return arr.reduce((acc, item) => {
    const groupKey = item[key];
    const group = acc.get(groupKey);
    if (group) {
      group.push(item);
    } else {
      acc.set(groupKey, [item]);
    }
    return acc;
  }, new Map<T[K], T[]>());
}

/**
 * Groups an array of objects using a getter function.
 */
export function groupByGetter<T extends object>(arr: T[], getter: (i: T) => string) {
  return arr.reduce((acc, item) => {
    const key = getter(item);
    const group = acc.get(key);
    if (group) {
      group.push(item);
    } else {
      acc.set(key, [item]);
    }
    return acc;
  }, new Map<string, T[]>());
}

/**
 * MUTATES the array: Removes a specific element by value.
 * Warning: In React, pass a copy of the state array, not the state itself.
 */
export function removeElement(
  value: EntityId | FeatureId,
  array: (EntityId | FeatureId)[],
) {
  const index = array.indexOf(value);
  if (index > -1) {
    array.splice(index, 1);
  }
}

// https://gist.github.com/albertein/4496103
/**
 * MUTATES the array: Moves an element up or down by a delta.
 * Warning: In React, pass a copy of the state array, not the state itself.
 */
export function moveElement<T>(array: T[], element: T, delta: number) {
  const index = array.indexOf(element);
  const newIndex = index + delta;
  if (newIndex < 0 || newIndex === array.length) {
    return;
  }
  const indexes = [index, newIndex].sort((a, b) => a - b); // Ensure numerical sort
  // Swap elements
  array.splice(indexes[0], 2, array[indexes[1]], array[indexes[0]]);
}

/**
 * MUTATES the array: Moves an item from one index to another.
 * Warning: In React, pass a copy of the state array, not the state itself.
 */
export function moveItemMutable<T>(array: T[], fromIndex: number, toIndex: number): T[] {
  if (!(fromIndex >= 0 && fromIndex < array.length)) return array;
  if (!(toIndex >= 0 && toIndex <= array.length)) return array; // Fixed condition to allow moving to end

  const item = array[fromIndex];
  array.splice(fromIndex, 1);
  array.splice(toIndex, 0, item);
  return array;
}

/**
 * MUTATES the array: Sorts array by object property.
 * Warning: In React, use `toSorted` (newer JS) or copy before sorting.
 */
export function sortBy<T extends object, K extends keyof T>(
  arr: T[],
  key: K,
  ascending = true,
) {
  return arr.sort((a, b) => {
    const valA = a[key] || "";
    const valB = b[key] || "";
    
    if (valA > valB) {
      return ascending ? 1 : -1;
    }
    if (valA < valB) {
      return ascending ? -1 : 1;
    }
    return 0;
  });
}

/**
 * Merges two arrays of objects based on a unique key.
 * If duplicates exist, items from array 'b' overwrite items from array 'a'.
 */
export function mergeArray<T>(a: T[], b: T[], key: keyof T): T[] {
  const map = new Map<any, T>();
  
  for (const item of a) {
    map.set(item[key], item);
  }
  
  for (const item of b) {
    map.set(item[key], item);
  }
  
  return Array.from(map.values());
}