import React from "react";
import { Button } from "@/components/ui/button";

// Kế thừa toàn bộ props của Button (Shadcn UI)
type SecondaryButtonProps = React.ComponentProps<typeof Button>;

export default function SecondaryButton({ children, ...props }: SecondaryButtonProps) {
  return (
    <Button 
      variant="secondary" 
      size="sm" 
      {...props} 
    >
      {children}
    </Button>
  );
}