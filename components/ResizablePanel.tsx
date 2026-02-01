"use client";

import React, { useRef, useState } from "react";
import DragHandle from "@/components/DragHandle";

interface ResizablePanelProps {
  left?: boolean;
  // Thay thế defineModel<number>("width")
  width: number;
  onWidthChange: (width: number) => void;
  
  // Events
  onResizeEnd?: () => void;
  
  // Slot
  children?: React.ReactNode;
}

export default function ResizablePanel({
  left = false,
  width,
  onWidthChange,
  onResizeEnd,
  children,
}: ResizablePanelProps) {
  
  const panelRef = useRef<HTMLElement>(null);
  const [initialWidth, setInitialWidth] = useState(width);

  // Vue: @resizestart="initialWidth = $event"
  const handleResizeStart = (val: number) => {
    setInitialWidth(val);
  };

  // Vue: @resizing="panelWidth = props.left ? initialWidth - $event : initialWidth + $event"
  const handleResizing = (delta: number) => {
    const newWidth = left ? initialWidth - delta : initialWidth + delta;
    onWidthChange(newWidth);
  };

  return (
    <aside
      ref={panelRef}
      className="bg-muted/50 relative flex shrink-0 flex-col border-r-2"
      style={{ width: `${width}px` }}
    >
      {children}
      
      <DragHandle
        parentRef={panelRef}
        left={left}
        onResizeStart={handleResizeStart}
        onResizing={handleResizing}
        onResizeEnd={onResizeEnd}
      />
    </aside>
  );
}