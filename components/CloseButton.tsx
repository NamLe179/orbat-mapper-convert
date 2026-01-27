import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

// Kế thừa toàn bộ props của component Button (onClick, disabled, className, etc.)
export default function CloseButton(props: React.ComponentProps<typeof Button>) {
  return (
    <Button variant="ghost" size="icon" {...props}>
      <span className="sr-only">Close</span>
      <X className="h-4 w-4" aria-hidden="true" />
    </Button>
  );
}