import { useEffect, useState, useRef, useCallback, type RefObject } from "react";

/**
 * Hook trả về giá trị đã được debounce sau một khoảng thời gian.
 * Thường dùng để thay thế logic watch + delay của Vue.
 * * @example
 * const searchQuery = ...;
 * const debouncedQuery = useDebounce(searchQuery, 500);
 * useEffect(() => { api.search(debouncedQuery) }, [debouncedQuery]);
 */
export function useDebounce<T>(value: T, delay: number = 200): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook trả về một hàm callback đã được debounce.
 * Dùng khi bạn muốn delay việc gọi hàm (ví dụ: save data khi gõ phím).
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 200
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );
}

/**
 * Utility để focus vào một element thông qua React Ref.
 * Thay thế cho doFocus({ el }) của Vue.
 */
export const doFocus = (ref: RefObject<HTMLElement>) => {
  ref.current?.focus();
};