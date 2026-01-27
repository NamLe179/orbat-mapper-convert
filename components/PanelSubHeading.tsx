import React from "react";
import { cn } from "@/lib/utils";

interface PanelSubHeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children?: React.ReactNode;
}

export default function PanelSubHeading({ 
  children, 
  className, 
  ...props 
}: PanelSubHeadingProps) {
  return (
    <h2
      className={cn(
        "text-sm font-semibold", 
        className               
      )}
      {...props}
    >
      {children}
    </h2>
  );
}