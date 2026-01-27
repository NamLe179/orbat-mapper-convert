import React from "react";
import { cn } from "@/lib/utils"; // Giả định utility này đã có sẵn

interface CreateEmptyDashedProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  // Nhận vào một Component icon (ví dụ từ Lucide hoặc Heroicons)
  icon: React.ElementType;
  children: React.ReactNode;
}

export default function CreateEmptyDashed({
  icon: Icon, // Đổi tên thành Icon (PascalCase) để dùng làm thẻ JSX
  children,
  className,
  ...props
}: CreateEmptyDashedProps) {
  return (
    <button
      type="button"
      className={cn(
        "focus:ring-ring relative block w-full rounded-lg border-2 border-dashed border-gray-300 p-12 text-center hover:border-gray-400 focus:ring-2 focus:ring-offset-2 focus:outline-hidden",
        className
      )}
      {...props}
    >
      <Icon
        className="text-muted-foreground mx-auto h-12 w-12"
        aria-hidden="true"
      />
      <span className="text-foreground mt-2 block text-sm font-medium">
        {children}
      </span>
    </button>
  );
}