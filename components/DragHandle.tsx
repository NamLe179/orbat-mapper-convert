"use client";

import React, { useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { isClient } from "@/utils"; // Giả định import này đã tồn tại

interface DragHandleProps {
  parentRef?: React.RefObject<HTMLElement | SVGElement | null>;
  horizontal?: boolean;
  left?: boolean;
  
  // Callback events thay cho emit
  onResizeStart?: (startValue: number) => void;
  onResizing?: (diff: number) => void;
  onResizeEnd?: () => void;
}

export default function DragHandle({
  parentRef,
  horizontal = false,
  left = false,
  onResizeStart,
  onResizing,
  onResizeEnd,
}: DragHandleProps) {
  const dragging = useRef(false);
  const startMouseValue = useRef(0);

  // --- Handlers ---

  const onDragging = useCallback((event: Event) => {
    // Lưu ý: Event listener được add vào document nên cần preventDefault để tránh bôi đen text, v.v.
    event.preventDefault();
    event.stopPropagation();

    if (dragging.current) {
      let currentMouseValue = 0;
      
      if (event.type === "touchmove") {
        currentMouseValue = (event as TouchEvent).touches[0].clientX;
      } else {
        currentMouseValue = (event as MouseEvent).clientX;
      }

      const diff = currentMouseValue - startMouseValue.current;
      onResizing?.(diff);
    }
  }, [onResizing]);

  const onDragEnd = useCallback(() => {
    dragging.current = false;
    onResizeEnd?.();

    if (isClient) {
      document.removeEventListener("mousemove", onDragging);
      document.removeEventListener("touchmove", onDragging);
      document.removeEventListener("mouseup", onDragEnd);
      document.removeEventListener("touchend", onDragEnd);
      document.removeEventListener("contextmenu", onDragEnd);
    }
  }, [onDragging, onResizeEnd]);

  const onDragStart = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    dragging.current = true;

    // Logic gốc của Vue: Emit width hiện tại của parent trước khi drag
    if (parentRef && parentRef.current) {
      const width = parentRef.current.getBoundingClientRect().width;
      onResizeStart?.(width);
    }

    // Logic gốc của Vue: Lưu vị trí chuột ban đầu để tính delta
    if (event.type === "touchstart") {
      startMouseValue.current = (event as React.TouchEvent).touches[0].clientX;
    } else {
      startMouseValue.current = (event as React.MouseEvent).clientX;
    }
  }, [parentRef, onResizeStart]);

  const onButtonDown = (event: React.MouseEvent | React.TouchEvent) => {
    // React event là SyntheticEvent, nhưng ta cần behavior giống Native
    // event.preventDefault() ở đây quan trọng để ngăn touch scroll hoặc text selection
    // Tuy nhiên với touchstart, preventDefault có thể warning nếu không phải passive, 
    // nhưng trong React handler này ok.
    if (event.type !== "touchstart") {
        event.preventDefault();
    }
    
    onDragStart(event);

    if (isClient) {
      document.addEventListener("mousemove", onDragging);
      document.addEventListener("touchmove", onDragging, { passive: false });
      document.addEventListener("mouseup", onDragEnd);
      document.addEventListener("touchend", onDragEnd);
      document.addEventListener("contextmenu", onDragEnd);
    }
  };

  // Cleanup effect: Đề phòng component unmount khi đang drag
  useEffect(() => {
    return () => {
      if (isClient) {
        document.removeEventListener("mousemove", onDragging);
        document.removeEventListener("touchmove", onDragging);
        document.removeEventListener("mouseup", onDragEnd);
        document.removeEventListener("touchend", onDragEnd);
        document.removeEventListener("contextmenu", onDragEnd);
      }
    };
  }, [onDragging, onDragEnd]);

  return (
    <div
      className={cn(
        "bg-muted absolute flex items-center justify-center border hover:border-red-900 hover:bg-red-900",
        // Logic class động
        horizontal
          ? "inset-x-0 bottom-0 h-1 cursor-row-resize"
          : "inset-y-0 w-1 cursor-col-resize",
        !horizontal && left ? "left-0" : "",
        !horizontal && !left ? "right-0" : ""
      )}
      onMouseDown={onButtonDown}
      onTouchStart={onButtonDown}
    >
      <div
        className={cn(
          "bg-background z-10 flex h-8 flex-none items-center justify-center rounded shadow-sm",
          horizontal && "rotate-90 transform"
        )}
        style={{ width: "0.9375rem" }}
      >
        <svg
          viewBox="0 0 14 24"
          fill="none"
          strokeWidth="2"
          stroke="currentColor"
          className="h-3 flex-none text-red-700"
          style={{ width: "0.4375rem" }}
        >
          <path d="M 1 0 V 24 M 7 0 V 24 M 13 0 V 24"></path>
        </svg>
      </div>
    </div>
  );
}