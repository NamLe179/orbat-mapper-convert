import React from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

// Kế thừa các thuộc tính chuẩn của thẻ <a> (như href, onClick...)
interface DocLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  children?: React.ReactNode;
}

export default function DocLink({ children, className, ...props }: DocLinkProps) {
  return (
    <Button asChild variant="link" className={className}>
      <a target="_blank" rel="noopener noreferrer" {...props}>
        {/* Logic Slot default value: hiển thị children nếu có, không thì hiện "Help" */}
        {children || "Help"}
        
        <ExternalLink className="text-muted-foreground -ml-1 h-4 w-4" />
      </a>
    </Button>
  );
}