"use client";

import React, { useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils"; // Giả định bạn có hàm merge class (clsx/tailwind-merge)

interface GridHeaderResizeHandleProps {
  width: number;
  onUpdate?: (newWidth: number) => void;
  onDragging?: (isDragging: boolean) => void;
}

export default function GridHeaderResizeHandle({
  width,
  onUpdate,
  onDragging,
}: GridHeaderResizeHandleProps) {
  // Refs lưu trữ giá trị mutable không gây re-render
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const initialWidthRef = useRef(0);
  
  // Ref để throttle
  const requestRef = useRef<number | null>(null);

  // State để update UI (border class)
  const [isDraggingState, setIsDraggingState] = useState(false);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Prevent default để tránh select text khi kéo
    e.preventDefault();
    e.stopPropagation();

    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);

    initialWidthRef.current = width;
    startXRef.current = e.clientX;
    isDraggingRef.current = true;
    
    setIsDraggingState(true);
    onDragging?.(true);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    
    const target = e.currentTarget;
    if (target.hasPointerCapture(e.pointerId)) {
      target.releasePointerCapture(e.pointerId);
    }

    isDraggingRef.current = false;
    setIsDraggingState(false);
    onDragging?.(false);
    
    // Cancel pending animation frame
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    
    if (!isDraggingRef.current) return;

    // Logic Throttle dùng requestAnimationFrame
    // Đảm bảo mượt mà (60fps) thay vì fixed 10ms như VueUse
    if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
    }

    requestRef.current = requestAnimationFrame(() => {
        const diff = e.clientX - startXRef.current;
        onUpdate?.(initialWidthRef.current + diff);
    });
  };

  // Click stop propagation
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      role="separator"
      className={cn(
        "absolute top-0 right-0 h-full w-4 cursor-col-resize hover:bg-red-100 sm:w-2",
        // Conditional class logic
        isDraggingState && "border"
      )}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
      // Xử lý thêm onPointerCancel hoặc onPointerLeave nếu cần an toàn tuyệt đối, 
      // nhưng setPointerCapture thường đã lo việc này.
    />
  );
}