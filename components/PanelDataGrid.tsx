import React from "react";
import { cn } from "@/lib/utils";

interface PanelDataGridProps extends React.HTMLAttributes<HTMLElement> {
  children?: React.ReactNode;
}

export default function PanelDataGrid({ 
  className, 
  children, 
  ...props 
}: PanelDataGridProps) {
  return (
    <section
      className={cn(
        "grid w-full grid-cols-[8ch_1fr] gap-3 pb-1 text-sm",
        className
      )}
      {...props}
    >
      {children}
    </section>
  );
}