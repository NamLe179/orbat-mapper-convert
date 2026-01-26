import { useEffect, useRef, useState, useCallback } from "react";
import { nanoid } from "nanoid";

// Helper function thay thế cho promiseTimeout của @vueuse/core
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Hook để quản lý việc mở rộng cây thư mục (Tree expansion)
 * Trong React, để gọi hàm của con từ cha, component con cần dùng useImperativeHandle.
 */
export function useExpandTree(setIsOpen?: (value: boolean) => void) {
  const itemRefs = useRef<any[]>([]);

  // Reset refs list mỗi lần render để tránh duplicate (tương đương onBeforeUpdate trong Vue để clear)
  itemRefs.current = [];

  const expandChildren = async () => {
    if (setIsOpen) setIsOpen(true);
    
    // Chờ 1 tick để state cập nhật và DOM render xong (tương tự nextTick)
    await wait(0);
    
    itemRefs.current.forEach((i) => {
      if (i && typeof i.expandChildren === "function") {
        i.expandChildren();
      }
    });
  };

  // Callback ref để gắn vào các phần tử con
  const setItemRef = useCallback((el: any) => {
    if (el) itemRefs.current.push(el);
  }, []);

  return { expandChildren, setItemRef };
}

export function inputEventFilter(event: Event | React.SyntheticEvent) {
  const target = event.target as HTMLElement;
  return !(
    ["INPUT", "TEXTAREA"].includes(target.tagName) ||
    target.dataset?.indent // added for FilterTree to avoid intervening with search
  );
}

export function setCharAt(str: string, index: number, chr: string) {
  if (index > str.length - 1) {
    return str;
  }
  return str.substr(0, index) + chr + str.substr(index + 1);
}

export function useFocusOnMount(id?: string, delay = 0) {
  // Sử dụng useState lazy initialization để ID không đổi giữa các lần render
  const [focusId] = useState(() => id || nanoid());

  useEffect(() => {
    const focusElement = async () => {
      if (delay) await wait(delay);
      
      // Trong useEffect, DOM đã được mount
      const inputElement = document.getElementById(focusId);
      if (inputElement) {
        inputElement.focus();
      }
    };

    focusElement();
  }, [focusId, delay]);

  return { focusId };
}

// Logic giữ nguyên, chỉ đảm bảo type cho React/DOM
export const isTypedCharValid = ({
  keyCode,
  metaKey,
  ctrlKey,
  altKey,
}: KeyboardEvent | React.KeyboardEvent) => {
  if (metaKey || ctrlKey || altKey) return false;

  // 0...9
  if ((keyCode >= 48 && keyCode <= 57) || (keyCode >= 96 && keyCode <= 105)) return true;

  // a...z
  if (keyCode >= 65 && keyCode <= 90) return true;

  // All other keys.
  return false;
};