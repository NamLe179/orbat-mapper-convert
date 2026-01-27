import React from "react";
import { ChevronRightIcon, HomeIcon } from "@heroicons/react/20/solid";
import { type BreadcrumbItem } from "@/components/types";
import { cn } from "@/lib/utils"; // Optional: dùng nếu bạn muốn merge class sau này

interface SimpleBreadcrumbsProps {
  items: BreadcrumbItem[];
  // React thường cần thêm onAction nếu button này dùng để navigate bằng JS
  onAction?: (item: BreadcrumbItem) => void; 
}

export default function SimpleBreadcrumbs({ items, onAction }: SimpleBreadcrumbsProps) {
  return (
    <nav className="flex" aria-label="Breadcrumb">
      <ol role="list" className="flex items-center space-x-2">
        {/* Root / Home Item */}
        <li>
          <div>
            <p className="text-muted-foreground">
              <HomeIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className="sr-only">Root</span>
            </p>
          </div>
        </li>

        {/* Dynamic Items */}
        {items.map((item) => (
          <li key={item.name}>
            <div className="flex items-center">
              <ChevronRightIcon
                className="text-muted-foreground h-5 w-5 shrink-0"
                aria-hidden="true"
              />
              
              {/* Conditional Rendering: Static Span vs Button */}
              {item.static ? (
                <span
                  className="text-muted-foreground ml-2 text-sm font-medium"
                >
                  {item.name}
                </span>
              ) : (
                <button
                  type="button"
                  className="text-muted-foreground hover:text-muted-foreground/80 ml-2 text-sm font-medium transition-colors"
                  onClick={() => onAction?.(item)}
                >
                  {item.name}
                </button>
              )}
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
}