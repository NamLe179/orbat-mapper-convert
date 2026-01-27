"use client";

import React, { useEffect, useRef } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/solid";
import { cn } from "@/lib/utils"; // Giả định bạn có utility này, nếu không có thể bỏ qua

interface SearchModalInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value?: string;
  onValueChange?: (value: string) => void;
  inputId?: string;
  focus?: boolean;
}

export default function SearchModalInput({
  value,
  onValueChange,
  placeholder = "Search for anything",
  inputId = "searchField",
  focus = false,
  className,
  ...props // Các props còn lại (attrs) sẽ được truyền vào input
}: SearchModalInputProps) {
  
  const inputRef = useRef<HTMLInputElement>(null);

  // Logic thay thế cho useFocusOnMount
  useEffect(() => {
    if (focus && inputRef.current) {
      // setTimeout nhỏ giúp đảm bảo modal đã render xong trước khi focus
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [focus]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Ngăn chặn hành vi mặc định cho arrow up/down (theo code Vue gốc)
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
    }
    
    // Truyền tiếp event onKeyDown nếu component cha có truyền vào
    props.onKeyDown?.(e);
  };

  return (
    <form className="flex w-full md:ml-0" onSubmit={(e) => e.preventDefault()}>
      <label htmlFor={inputId} className="sr-only">
        Search
      </label>
      <div className="text-muted-foreground focus-within:text-muted-foreground relative w-full">
        <div
          className="pointer-events-none absolute inset-y-0 left-0 flex items-center"
          aria-hidden="true"
        >
          <MagnifyingGlassIcon className="h-5 w-5" aria-hidden="true" />
        </div>
        <input
          ref={inputRef}
          id={inputId}
          name="search-field"
          type="search"
          autoComplete="off"
          spellCheck="false"
          placeholder={placeholder}
          className={cn(
            "text-foreground block h-full w-full border-transparent py-2 pr-3 pl-8 placeholder-gray-500",
            "focus:border-transparent focus:ring-0 focus:outline-hidden sm:text-base",
            className // Cho phép override class từ bên ngoài
          )}
          value={value}
          onChange={(e) => onValueChange?.(e.target.value)}
          onKeyDown={handleKeyDown}
          {...props} 
        />
      </div>
    </form>
  );
}