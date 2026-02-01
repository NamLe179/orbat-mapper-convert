"use client";

import React from "react";
import { Command as CommandPrimitive } from "cmdk"; // Import primitive từ cmdk
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

// Định nghĩa Props
interface CommandPaletteInputProps
  extends React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input> {
  // Vì cmdk Input dùng value/onValueChange, ta khai báo rõ ràng để TypeScript hiểu
  value: string;
  onValueChange: (value: string) => void;
}

export default function CommandPaletteInput({
  className,
  value,
  onValueChange,
  onKeyDown,
  ...props
}: CommandPaletteInputProps) {

  // Xử lý sự kiện Escape
  // Logic: Nếu đang có chữ trong ô tìm kiếm -> Xóa chữ & chặn đóng dialog.
  //        Nếu ô trống -> Để mặc định (sẽ đóng dialog do hành vi của cmdk/dialog).
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape" && value.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      onValueChange("");
      return;
    }
    // Gọi event gốc nếu có
    onKeyDown?.(e);
  };

  return (
    <div
      data-slot="command-input-wrapper"
      className="mr-4 flex h-12 items-center gap-2 border-b px-6"
    >
      <Search className="h-4 w-4 shrink-0 opacity-50" />
      
      {/* CommandPrimitive.Input là thành phần input chuẩn của cmdk, 
          giúp lọc danh sách CommandList tự động */}
      <CommandPrimitive.Input
        {...props}
        value={value}
        onValueChange={onValueChange}
        autoFocus
        onKeyDown={handleKeyDown}
        className={cn(
          "placeholder:text-muted-foreground border-muted flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
      />
    </div>
  );
}