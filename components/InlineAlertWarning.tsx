import React from "react";
import { ExclamationTriangleIcon } from "@heroicons/react/20/solid";
import { cn } from "@/lib/utils"; // Giả định utility merge class có sẵn

interface InlineAlertWarningProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export default function InlineAlertWarning({ 
  children, 
  className, 
  ...props 
}: InlineAlertWarningProps) {
  return (
    <div
      className={cn(
        "border-l-4 border-yellow-400 bg-yellow-50 p-4",
        className
      )}
      {...props}
    >
      <div className="flex">
        <div className="shrink-0">
          <ExclamationTriangleIcon
            className="h-5 w-5 text-yellow-400"
            aria-hidden="true"
          />
        </div>
        <div className="ml-3">
          <p className="text-sm text-yellow-700">
            {children}
          </p>
        </div>
      </div>
    </div>
  );
}