"use client";

import React, { useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { cn } from "@/lib/utils";

interface EditableLabelProps {
  // Thay thế cho defineModel (required)
  value: string;
  onChange: (value: string) => void;
  
  // Thay thế cho emit('update-value') - thường dùng khi blur
  onUpdateValue?: (value: string) => void;
  
  // Styling
  textClass?: string;
  className?: string;
}

export default function EditableLabel({
  value,
  onChange,
  onUpdateValue,
  textClass = "text-base font-semibold leading-6 text-foreground dark:text-foreground",
  className,
}: EditableLabelProps) {
  const [spellCheck, setSpellCheck] = useState(false);

  const handleFocus = () => {
    setSpellCheck(true);
  };

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setSpellCheck(false);
    // Emit sự kiện update-value khi blur
    onUpdateValue?.(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      e.stopPropagation(); // @keydown.esc.stop
      e.currentTarget.blur();
    }
    
    if (e.key === "Enter") {
      e.preventDefault(); // @keydown.enter.prevent - ngăn xuống dòng
      e.currentTarget.blur();
    }
  };

  return (
    <TextareaAutosize
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      spellCheck={spellCheck}
      className={cn(
        // Base classes
        "ring-ring -mx-3 w-full resize-none rounded-md border-0 bg-transparent ring-0 ring-inset hover:ring-1 focus:ring-2 focus:ring-inset",
        // Text styling classes (default props)
        textClass,
        // Custom className overrides
        className
      )}
    />
  );
}