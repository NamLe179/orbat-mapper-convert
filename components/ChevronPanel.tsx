"use client";

import React, { useState, useId, useEffect } from "react";
import { ChevronRightIcon } from "@heroicons/react/24/solid";
import { cn } from "@/lib/utils";

interface ChevronPanelProps {
  // Props dữ liệu
  label?: React.ReactNode;
  children?: React.ReactNode;
  
  // Props Slot (Left/Right content)
  left?: React.ReactNode;
  right?: React.ReactNode;

  // Props điều khiển trạng thái (State)
  open?: boolean;           // Nếu truyền vào, component sẽ hoạt động ở chế độ Controlled
  defaultOpen?: boolean;    // Giá trị khởi tạo nếu không truyền 'open'
  
  // Props giao diện
  headerClass?: string;
  headerRef?: React.Ref<HTMLDivElement>;

  // Callback events (thay cho emit)
  onOpenChange?: (isOpen: boolean) => void; // update:open
  onOpened?: () => void;
  onClosed?: () => void;
}

export default function ChevronPanel({
  label,
  children,
  left,
  right,
  open,
  defaultOpen = true,
  headerClass,
  headerRef,
  onOpenChange,
  onOpened,
  onClosed,
}: ChevronPanelProps) {
  // Tạo ID an toàn cho SSR/Hydration
  const panelId = useId();

  // State nội bộ cho trường hợp Uncontrolled
  const [internalOpen, setInternalOpen] = useState(defaultOpen);

  // Xác định trạng thái hiện tại: Dùng prop 'open' nếu có, ngược lại dùng state nội bộ
  const isExpanded = open !== undefined ? open : internalOpen;

  // Xử lý toggle
  const toggleOpen = () => {
    const newState = !isExpanded;

    // Nếu không bị control bởi prop bên ngoài, tự update state
    if (open === undefined) {
      setInternalOpen(newState);
    }

    // Trigger callbacks
    onOpenChange?.(newState);
    if (newState) {
      onOpened?.();
    } else {
      onClosed?.();
    }
  };

  return (
    <div className="border-border border-b py-2">
      <div ref={headerRef}>
        <h3
          className={cn(
            "group -my-3 flex w-full items-center justify-between py-3",
            headerClass
          )}
        >
          {/* Slot Left */}
          {left}

          <button
            type="button"
            className="group text-muted-foreground relative flex min-w-0 flex-auto items-center text-sm"
            onClick={toggleOpen}
            aria-expanded={isExpanded}
            aria-controls={panelId}
          >
            <ChevronRightIcon
              className={cn(
                "text-muted-foreground group-hover:text-foreground size-5 flex-none transform transition-transform",
                isExpanded && "rotate-90"
              )}
            />

            <span className="ml-2 min-w-0 flex-auto truncate text-left font-bold">
              {/* Ưu tiên children label nếu có, không thì hiển thị text */}
              {label}
            </span>
          </button>

          {/* Slot Right */}
          <span className="relative ml-6 flex shrink-0 items-center">
            {right}
          </span>
        </h3>
      </div>

      {/* Panel Content (v-show equivalent) */}
      <div
        id={panelId}
        className={cn("space-y-4 pt-6 pl-6", !isExpanded && "hidden")}
      >
        {children}
      </div>
    </div>
  );
}