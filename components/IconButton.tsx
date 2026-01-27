import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils"; // Giả định utility merge class có sẵn

// Kế thừa toàn bộ props của component Button gốc
type IconButtonProps = React.ComponentProps<typeof Button>;

export default function IconButton({ 
  children, 
  className, 
  ...props 
}: IconButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("text-foreground/80", className)}
      {...props}
    >
      {children}
    </Button>
  );
}