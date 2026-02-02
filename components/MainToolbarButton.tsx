import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils"; // Giả định utility merge class có sẵn

// Kế thừa props của Button, thêm prop active
interface MainToolbarButtonProps extends React.ComponentProps<typeof Button> {
  active?: boolean;
}

export default function MainToolbarButton({
  active = false,
  className,
  children,
  ...props
}: MainToolbarButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        // Logic class dựa trên trạng thái active
        // Active: background xanh lá nhạt
        active 
          ? "bg-green-100 hover:!bg-green-200 dark:bg-green-900/30 dark:hover:!bg-green-900/50" 
          : "hover:!bg-muted",
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
}