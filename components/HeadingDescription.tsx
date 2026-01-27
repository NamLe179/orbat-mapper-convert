import React from "react";
import { cn } from "@/lib/utils"; // Giả định bạn đang dùng utility merge class (shadcn/ui standard)

// Kế thừa tất cả thuộc tính của thẻ <p>
interface HeadingDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children?: React.ReactNode;
}

export default function HeadingDescription({ 
  children, 
  className, 
  ...props 
}: HeadingDescriptionProps) {
  return (
    <p
      className={cn(
        "text-muted-foreground mt-1 text-sm leading-6",
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
}