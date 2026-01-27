import React, { CSSProperties } from "react";
import type { Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/types";
import { cn } from "@/lib/utils"; // Giả định utility merge class có sẵn

interface DropIndicatorProps {
  edge: Edge;
  gap?: string;
}

type Orientation = "horizontal" | "vertical";

export default function DropIndicator({ edge, gap = "0px" }: DropIndicatorProps) {
  // Constants
  const strokeSize = 2;
  const terminalSize = 8;
  const offsetToAlignTerminalWithLine = (strokeSize - terminalSize) / 2;

  // Logic map orientation
  const edgeToOrientationMap: Record<Edge, Orientation> = {
    top: "horizontal",
    bottom: "horizontal",
    left: "vertical",
    right: "vertical",
  };
  
  const orientation = edgeToOrientationMap[edge];

  // Styles mapping (Chuyển sang cú pháp Tailwind JIT chuẩn cho CSS variables)
  const orientationStyles: Record<Orientation, string> = {
    horizontal:
      "h-[var(--line-thickness)] left-[var(--terminal-radius)] right-0 before:left-[var(--negative-terminal-size)]",
    vertical:
      "w-[var(--line-thickness)] top-[var(--terminal-radius)] bottom-0 before:top-[var(--negative-terminal-size)]",
  };

  const edgeStyles: Record<Edge, string> = {
    top: "top-[var(--line-offset)] before:top-[var(--offset-terminal)]",
    right: "right-[var(--line-offset)] before:right-[var(--offset-terminal)]",
    bottom: "bottom-[var(--line-offset)] before:bottom-[var(--offset-terminal)]",
    left: "left-[var(--line-offset)] before:left-[var(--offset-terminal)]",
  };

  // CSS Variables object
  // Chúng ta cast về any hoặc mở rộng CSSProperties để TS không báo lỗi với custom variables
  const style = {
    "--line-thickness": `${strokeSize}px`,
    "--line-offset": `calc(-0.5 * (${gap} + ${strokeSize}px))`,
    "--terminal-size": `${terminalSize}px`,
    "--terminal-radius": `${terminalSize / 2}px`,
    "--negative-terminal-size": `-${terminalSize}px`,
    "--offset-terminal": `${offsetToAlignTerminalWithLine}px`,
  } as CSSProperties;

  return (
    <div
      style={style}
      className={cn(
        // Base styles
        "pointer-events-none absolute z-10 box-border bg-blue-700",
        
        // Before pseudo-element (the dot/terminal)
        "before:content-[''] before:absolute",
        "before:h-[var(--terminal-size)] before:w-[var(--terminal-size)]",
        "before:rounded-full before:border-solid before:border-blue-700",
        "before:border-[length:var(--line-thickness)]", // Tailwind arbitrary value cho border-width

        // Orientation & Edge specific styles
        orientationStyles[orientation],
        edgeStyles[edge]
      )}
    />
  );
}