import React from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils"; // Giả định utility merge class có sẵn

interface InlineFormPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  onClose?: () => void;
  children?: React.ReactNode;
}

export default function InlineFormPanel({
  title,
  onClose,
  children,
  className,
  ...props
}: InlineFormPanelProps) {
  return (
    <div
      className={cn("overflow-hidden shadow-sm", className)}
      {...props}
    >
      <div className="relative px-4 py-5 sm:p-6">
        {/* Title Section (v-if="title") */}
        {title && (
          <p className="text-muted-foreground -mt-2 mb-4 text-sm">
            {title}
          </p>
        )}

        {/* Close Button Section */}
        <div className="absolute top-0 right-0 hidden pt-4 pr-4 sm:block">
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground focus:ring-ring bg-background rounded-md focus:ring-2 focus:ring-offset-2 focus:outline-hidden"
            onClick={onClose}
          >
            <span className="sr-only">Close</span>
            <XMarkIcon className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        {/* Slot content */}
        {children}
      </div>
    </div>
  );
}