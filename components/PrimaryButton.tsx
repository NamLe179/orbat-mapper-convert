import React from "react";
import { Button } from "@/components/ui/button";

// Kế thừa toàn bộ props của Button (Shadcn UI)
type PrimaryButtonProps = React.ComponentProps<typeof Button>;

export default function PrimaryButton({ children, ...props }: PrimaryButtonProps) {
  return (
    <Button 
      size="sm" 
      {...props} // Spread props để hỗ trợ onClick, className, disabled, type...
    >
      {children}
    </Button>
  );
}