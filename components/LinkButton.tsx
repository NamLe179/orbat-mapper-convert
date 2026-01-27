import React from "react";
import { Button } from "@/components/ui/button";

// Kế thừa toàn bộ props của Button (Shadcn UI)
type LinkButtonProps = React.ComponentProps<typeof Button>;

export default function LinkButton({ children, ...props }: LinkButtonProps) {
  return (
    <Button 
      type="button" 
      variant="link" 
      {...props} // Spread props để hỗ trợ onClick, className, disabled...
    >
      {children}
    </Button>
  );
}