import React from "react";
import { Button } from "@/components/ui/button";

// Kế thừa toàn bộ props của Button (Shadcn UI)
type PlainButtonProps = React.ComponentProps<typeof Button>;

export default function PlainButton({ children, ...props }: PlainButtonProps) {
  return (
    <Button 
      variant="outline" 
      size="sm" 
      {...props} // Spread props để cho phép override hoặc thêm sự kiện
    >
      {children}
    </Button>
  );
}