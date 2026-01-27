import React from "react";
import { cn } from "@/lib/utils";

interface ProseSectionProps extends React.HTMLAttributes<HTMLElement> {
  children?: React.ReactNode;
}

export default function ProseSection({ 
  children, 
  className, 
  ...props 
}: ProseSectionProps) {
  return (
    <div>
      <section
        className={cn(
          "prose prose-slate dark:prose-invert md:prose-lg mx-auto max-w-4xl p-6",
          className
        )}
        {...props}
      >
        {children}
      </section>
    </div>
  );
}