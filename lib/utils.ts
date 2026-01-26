import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Updater } from "@tanstack/react-table";

/**
 * Utility để merge Tailwind classes (giữ nguyên từ Vue qua React)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Helper xử lý cập nhật state cho TanStack Table trong React.
 * Thay vì mutate Ref như Vue, hàm này trả về giá trị mới để dùng trong setState.
 * * @example
 * const [sorting, setSorting] = useState([])
 * // ...
 * onSortingChange: (updater) => {
 * setSorting((prev) => valueUpdater(updater, prev))
 * }
 */
export function valueUpdater<T>(updaterOrValue: Updater<T>, previousValue: T): T {
  return typeof updaterOrValue === "function"
    ? (updaterOrValue as (old: T) => T)(previousValue)
    : updaterOrValue;
}