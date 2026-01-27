import React from "react";
import { cn } from "@/lib/utils";

interface PanelHeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children?: React.ReactNode;
}

export default function PanelHeading({ 
  children, 
  className, 
  ...props 
}: PanelHeadingProps) {
  return (
    <h2
      className={cn(
        "text-sidebar-foreground text-base leading-7 font-semibold",
        className
      )}
      {...props}
    >
      {children}
    </h2>
  );
}