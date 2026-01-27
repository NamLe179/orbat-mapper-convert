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
        // Lưu ý: Đổi cú pháp 'class!' (Vue/Windi) thành '!class' (Tailwind chuẩn)
        active 
          ? "bg-army2 hover:!bg-army2/90" 
          : "hover:!bg-army2/50",
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
}