"use client";

import React, { useRef, useEffect } from "react";
import { ChevronRightIcon } from "@heroicons/react/20/solid";
import { cn } from "@/lib/utils"; // Giả định utility merge class

interface OrbatGridGroupRowProps {
  select?: boolean;
  item: string;
  open?: boolean;
  checked?: boolean;
  indeterminate?: boolean;
  
  // Events
  onToggle?: (isOpen: boolean) => void;
  onCheckedChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function OrbatGridGroupRow({
  select = false,
  item,
  open = true,
  checked,
  indeterminate,
  onToggle,
  onCheckedChange,
}: OrbatGridGroupRowProps) {
  
  // Ref để xử lý trạng thái indeterminate của checkbox
  const checkboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = !!indeterminate;
    }
  }, [indeterminate]);

  const handleRowClick = () => {
    onToggle?.(!open);
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Tương đương @click.stop
    onToggle?.(!open);
  };

  return (
    <div className="group bg-muted/50 hover:bg-muted flex divide-x divide-gray-200">
      {select && (
        <div className="text-foreground flex w-10 flex-none items-center justify-center overflow-hidden border-b px-4 py-3.5">
          <input
            ref={checkboxRef}
            type="checkbox"
            id={item} // ID dựa trên item name, lưu ý trùng lặp nếu item giống nhau
            checked={checked}
            onChange={onCheckedChange}
            className="text-primary focus:ring-ring rounded border-gray-300 sm:left-6"
          />
        </div>
      )}
      
      <div
        className="flex flex-auto cursor-pointer items-center border-b px-2"
        onClick={handleRowClick}
      >
        <button 
          onClick={handleButtonClick} 
          className="ml-0 focus:outline-none"
          type="button"
        >
          <ChevronRightIcon
            className={cn(
              "group-hover:text-foreground dark:text-muted-foreground dark:group-hover:text-foreground h-6 w-6 text-red-800 transition-transform",
              open && "rotate-90"
            )}
          />
        </button>
        <span className="font-bold">{item}</span> {/* font-bolder trong Vue -> font-bold trong Tailwind chuẩn */}
      </div>
    </div>
  );
}