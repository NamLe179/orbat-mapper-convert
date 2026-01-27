"use client";

import React, { useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface PanelResizeHandleProps {
  width: number;
  left?: boolean;
  onUpdate?: (newWidth: number) => void;
  onDragging?: (isDragging: boolean) => void;
  onReset?: () => void;
  className?: string;
}

export default function PanelResizeHandle({
  width,
  left = false,
  onUpdate,
  onDragging,
  onReset,
  className,
}: PanelResizeHandleProps) {
  const [isDragging, setIsDragging] = useState(false);
  
  // Sử dụng useRef để lưu trữ các giá trị mutable mà không gây re-render
  const dragInfo = useRef({
    startX: 0,
    initialWidth: 0,
    lastRun: 0, // Dùng cho throttling
  });

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    // Capture pointer để browser tiếp tục gửi sự kiện kể cả khi chuột rời khỏi element
    e.currentTarget.setPointerCapture(e.pointerId);
    
    dragInfo.current.startX = e.clientX;
    dragInfo.current.initialWidth = width;
    
    setIsDragging(true);
    onDragging?.(true);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsDragging(false);
    onDragging?.(false);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDragging) return;

    // Logic Throttle: Giới hạn gọi hàm mỗi 10ms (tương đương useThrottleFn(..., 10))
    const now = Date.now();
    if (now - dragInfo.current.lastRun < 10) return;
    dragInfo.current.lastRun = now;

    // Tính toán delta
    const delta = e.clientX - dragInfo.current.startX;
    
    // Áp dụng công thức tính width từ code Vue cũ
    const newWidth = left
      ? dragInfo.current.initialWidth - delta
      : dragInfo.current.initialWidth + delta;

    onUpdate?.(newWidth);
  };

  return (
    <button
      type="button"
      role="separator"
      onDoubleClick={onReset}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
      className={cn(
        // Base classes
        "absolute top-0 bottom-0 z-30 w-1.5 cursor-col-resize touch-none",
        // Custom variants (giữ nguyên từ Vue)
        "pointer-none:w-3 pointer-none:bg-army2 pointer-fine:hover:bg-army2",
        // Conditional positioning
        left ? "left-0" : "right-0",
        className
      )}
    />
  );
}