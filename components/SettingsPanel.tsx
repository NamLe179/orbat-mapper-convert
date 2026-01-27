"use client";

import React, { useState, useEffect, useId } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/solid";
import { cn } from "@/lib/utils"; // Giả định có utility này

interface SettingsPanelProps {
  label: React.ReactNode; // Cho phép truyền string hoặc JSX thay cho slot 'label'
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  rightElement?: React.ReactNode; // Thay cho slot 'right'
  children?: React.ReactNode;
  className?: string;
}

export default function SettingsPanel({
  label,
  open, // Nếu truyền prop này, component sẽ hoạt động ở chế độ Controlled
  defaultOpen = true,
  onOpenChange,
  rightElement,
  children,
  className,
}: SettingsPanelProps) {
  // Logic: Nếu prop 'open' được truyền (khác undefined), dùng nó. Nếu không, dùng state nội bộ.
  const isControlled = open !== undefined;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);

  const isOpen = isControlled ? open : internalOpen;
  
  // React 18+ hook để tạo ID duy nhất an toàn cho SSR
  const panelId = useId(); 

  const handleToggle = () => {
    const newState = !isOpen;
    if (!isControlled) {
      setInternalOpen(newState);
    }
    onOpenChange?.(newState);
  };

  return (
    <div className={cn("px-6 py-4", className)}>
      <h3 className="-my-3 flex w-full items-center justify-between py-3">
        <button
          type="button"
          className="group text-muted-foreground flex min-w-0 flex-auto items-center text-sm cursor-pointer"
          onClick={handleToggle}
          aria-expanded={isOpen}
          aria-controls={panelId}
        >
          <span className="text-foreground min-w-0 flex-auto truncate text-left font-bold">
            {label}
          </span>
        </button>

        {/* Right Section & Chevron */}
        <button 
          type="button"
          onClick={handleToggle}
          className="relative ml-6 flex shrink-0 items-center cursor-pointer"
        >
          {rightElement}
          
          <ChevronDownIcon
            className={cn(
              "text-muted-foreground group-hover:text-foreground ml-2 h-6 w-6 flex-none transform transition-transform duration-200",
              isOpen ? "rotate-0" : "rotate-180" // Vue gốc logic: open=0 (xuống), close=180 (lên) hoặc ngược lại tùy icon gốc
            )}
          />
        </button>
      </h3>

      {/* Content Area */}
      {/* v-show tương đương style display hoặc conditional rendering. 
          Dùng conditional rendering (&&) để unmount cho nhẹ DOM, 
          hoặc dùng style display nếu muốn giữ state bên trong. 
          Ở đây mình dùng conditional rendering theo chuẩn React phổ biến. */}
      {isOpen && (
        <div id={panelId} className="space-y-4 pt-6 animate-in fade-in slide-in-from-top-1 duration-200">
          {children}
        </div>
      )}
    </div>
  );
}