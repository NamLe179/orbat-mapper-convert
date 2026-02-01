"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { isTypedCharValid } from "@/components/helpers";
import { type CellType } from "@/modules/scenarioeditor/types";
import { cn } from "@/lib/utils";

interface GridEditableCellProps {
  value?: string | number;
  rowIndex: number;
  colIndex: number;
  cellType?: CellType;
  
  // Events
  onUpdate?: (value: string | number) => void;
  onNextCell?: (el: HTMLElement | null) => void;
  onActive?: () => void;
  onEdit?: (value: string | number | undefined) => void;
}

export default function GridEditableCell({
  value = "",
  rowIndex,
  colIndex,
  cellType = "text",
  onUpdate,
  onNextCell,
  onActive,
  onEdit,
}: GridEditableCellProps) {
  
  // --- Refs & State ---
  const rootRef = useRef<HTMLDivElement>(null);
  const [editMode, setEditMode] = useState(false);
  const [iValue, setIValue] = useState<string | number>("");
  
  // Refs lưu state nội bộ không trigger render
  const valueCopyRef = useRef<string | number | undefined>("");
  const justFocusedRef = useRef(false);
  const timeoutIdRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // --- Computed ---
  const externalEdit = useMemo(() => ["sidc", "markdown"].includes(cellType), [cellType]);

  // --- Actions ---

  const handleExternalEdit = () => {
    onEdit?.(value);
  };

  const enterEditMode = (initialValue?: string | number) => {
    if (editMode) return;
    
    valueCopyRef.current = value;
    setIValue(initialValue ?? (value || ""));
    setEditMode(true);
  };

  const doCancel = () => {
    setIValue(valueCopyRef.current || "");
    setEditMode(false);
    // Cần timeout nhỏ hoặc requestAnimationFrame để focus lại div sau khi input unmount
    requestAnimationFrame(() => rootRef.current?.focus());
  };

  const saveAndExit = () => {
    setEditMode(false);
    if (iValue !== valueCopyRef.current) {
      onUpdate?.(iValue);
    }
  };

  // --- Event Handlers (Div Container) ---

  const onFocus = () => {
    justFocusedRef.current = true;
    // selected state trong Vue chỉ dùng để highlight border/focus, 
    // css focus-within:border-ring đã xử lý việc này trong Tailwind.
    
    clearTimeout(timeoutIdRef.current);
    timeoutIdRef.current = setTimeout(() => {
      justFocusedRef.current = false;
    }, 500);

    onActive?.();
  };

  const onBlur = () => {
    clearTimeout(timeoutIdRef.current);
  };

  const onClick = () => {
    if (!justFocusedRef.current) {
      if (externalEdit) {
        handleExternalEdit();
      } else {
        enterEditMode();
      }
    }
  };

  const onKeydown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    // Nếu đang trong edit mode, sự kiện keydown từ input sẽ bubble lên đây
    // Ta xử lý Enter/Esc ở đây cho tập trung
    if (editMode) {
      if (event.key === "Enter") {
        event.preventDefault(); // Ngăn form submit
        event.stopPropagation();
        
        // Save logic
        saveAndExit();
        
        // Next cell logic
        // Ta cần focus lại root trước khi emit nextCell để đảm bảo flow đúng
        requestAnimationFrame(() => {
            rootRef.current?.focus();
            onNextCell?.(rootRef.current);
        });
      } else if (event.key === "Escape") {
        event.stopPropagation();
        doCancel();
      }
      return;
    }

    // Nếu KHÔNG phải edit mode (đang focus vào div)
    const targetTagName = (event.target as HTMLElement).tagName;
    if (["INPUT", "TEXTAREA"].includes(targetTagName)) return;

    if (event.key === "Enter") {
      event.preventDefault();
      if (externalEdit) {
        handleExternalEdit();
      } else {
        enterEditMode();
      }
    } else if (isTypedCharValid(event.nativeEvent)) {
      // Nếu user gõ phím ký tự hợp lệ, vào edit mode và điền luôn ký tự đó
      enterEditMode(event.key);
    }
  };

  // --- Event Handlers (Input) ---
  
  const onEditBlur = () => {
    saveAndExit();
  };

  return (
    <div
      ref={rootRef}
      id={`cell-${rowIndex}-${colIndex}`}
      className={cn(
        "editable-cell border-card text-muted-foreground focus-within:border-ring truncate border-2 px-3 py-3 text-sm whitespace-nowrap outline-0",
        // Tailwind handled focus styling, class 'editable-cell' kept for compatibility
      )}
      tabIndex={0}
      onKeyDown={onKeydown}
      onClick={onClick}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      {editMode ? (
        <form onSubmit={(e) => e.preventDefault()}>
          <input
            type="text"
            className="text-foreground m-0 -my-3 w-full border-none bg-transparent p-0 focus:ring-0 outline-none"
            value={iValue}
            onChange={(e) => setIValue(e.target.value)}
            // Thay thế @vue:mounted="doFocus" và @blur
            autoFocus 
            onBlur={onEditBlur}
            // Ngăn click event bubble lên div cha để tránh logic onClick của div chạy lại
            onClick={(e) => e.stopPropagation()} 
          />
        </form>
      ) : (
        <span 
          className={cn(
            "text-foreground", 
            externalEdit && "cursor-pointer"
          )}
        >
          {value}&nbsp;
        </span>
      )}
    </div>
  );
}