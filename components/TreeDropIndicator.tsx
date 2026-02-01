"use client";

import React, { useMemo, CSSProperties } from "react";
import type { Instruction } from "@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item";
import DropIndicator from "@/components/DropIndicator";
import { cn } from "@/lib/utils"; // Giả định bạn có utility này (thường có trong setup Shadcn/Nextjs)

interface TreeDropIndicatorProps {
  instruction: Instruction;
}

// Mock constants (giữ nguyên logic từ Vue)
const token = (name: string) => {
  const tokens: Record<string, string> = {
    "color.border.warning": "#FFAB00",
  };
  return tokens[name] || "";
};

const line = {
  backgroundColor: "red",
  thickness: 2,
};

export default function TreeDropIndicator({ instruction }: TreeDropIndicatorProps) {
  
  // --- Computed Logic ---

  const isBlocked = instruction.type === "instruction-blocked";

  const baseStyle = useMemo(() => {
    if (instruction.type === "instruction-blocked") {
      return {};
    }
    
    // Lưu ý: instruction có thể không có currentLevel/indentPerLevel tuỳ theo type,
    // nhưng theo logic Vue cũ thì code này chạy chung.
    // Ta cần ép kiểu 'any' hoặc check type guard nếu type Instruction quá chặt.
    const currentLevel = (instruction as any).currentLevel ?? 0;
    const indentPerLevel = (instruction as any).indentPerLevel ?? 0;

    return {
      "--horizontal-indent": `${currentLevel * indentPerLevel}px`,
      "--indicator-color": !isBlocked
        ? line.backgroundColor
        : token("color.border.warning"),
      // Fallback defaults cho các biến CSS không được định nghĩa trong script
      "--terminal-size": "8px", 
      "--line-thickness": "2px",
    } as CSSProperties;
  }, [instruction, isBlocked]);

  const reparentStyle = useMemo(() => {
    if (instruction.type !== "reparent") {
      return {};
    }
    const desiredLevel = instruction.desiredLevel ?? 0;
    const indentPerLevel = instruction.indentPerLevel ?? 0;

    return {
      ...baseStyle,
      "--horizontal-indent": `-${desiredLevel * indentPerLevel}px`,
    } as CSSProperties;
  }, [instruction, baseStyle]);

  // --- Styles Strings (Converted to Valid Tailwind JIT) ---

  // Fix: Chuyển cú pháp (var) thành [var(--var)]
  const lineStyles = cn(
    "pointer-events-none absolute top-0 right-0 z-10 box-border bg-blue-700",
    "before:content-[''] before:absolute",
    "before:h-[var(--terminal-size)] before:w-[var(--terminal-size)]",
    "before:rounded-full",
    "before:border-[length:var(--line-thickness)] before:border-solid before:border-blue-700"
  );

  const lineAboveStyles = cn(
    "before:top-0 before:-translate-x-1/2 before:-translate-y-1/2",
    "after:top-[-1px]" // Giữ nguyên logic after dù không thấy define content cho after trong chuỗi gốc
  );

  const outlineStyles =
    "absolute inset-0 pointer-events-none border-2 border-blue-700 rounded-[3px]";

  // --- Render ---

  if (instruction.type === "reorder-above") {
    return <DropIndicator edge="top" />;
  }

  if (instruction.type === "reorder-below") {
    return <DropIndicator edge="bottom" />;
  }

  if (instruction.type === "make-child") {
    return (
      <div 
        className={outlineStyles} 
        style={baseStyle} 
      />
    );
  }

  if (instruction.type === "reparent") {
    return (
      <div
        className={cn(lineStyles, lineAboveStyles)}
        style={reparentStyle}
      />
    );
  }

  return null;
}