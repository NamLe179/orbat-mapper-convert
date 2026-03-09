"use client";

import { useEffect, useState, type RefObject } from "react";
import { dropTargetForExternal } from "@atlaskit/pragmatic-drag-and-drop/external/adapter";
import { containsFiles, getFiles } from "@atlaskit/pragmatic-drag-and-drop/external/file";

export interface UseFileDropZoneReturn {
  isOverDropZone: boolean;
}

/**
 * Hook xử lý cho kéo thả file
 */

// Chức năng: Tạo một drop zone cho phép người dùng kéo thả file vào một phần tử DOM cụ thể
export function useFileDropZone(
  targetRef: RefObject<HTMLElement | null>,
  onDropHandler?: (files: File[] | null) => void,
): UseFileDropZoneReturn {
  const [isOverDropZone, setIsOverDropZone] = useState(false);

  useEffect(() => {
    const element = targetRef.current;
    
    // Nếu ref chưa được gắn vào DOM, không làm gì cả
    if (!element) return;

    // Đăng ký drop target
    const cleanup = dropTargetForExternal({
      element: element,
      canDrop: containsFiles,
      onDragEnter: () => setIsOverDropZone(true),
      onDragLeave: () => setIsOverDropZone(false),
      onDrop({ source }) {
        const files: File[] = getFiles({ source });
        setIsOverDropZone(false);
        
        if (onDropHandler) {
          onDropHandler(files.length === 0 ? null : files);
        }
      },
    });

    // Cleanup function (tương đương onUnmounted)
    return () => {
      cleanup();
    };
  }, [targetRef, onDropHandler]); // Re-run effect nếu ref hoặc handler thay đổi

  return {
    isOverDropZone,
  };
}