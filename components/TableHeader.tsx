import React from "react";

interface TableHeaderProps {
  title?: string;
  description?: string;
  children?: React.ReactNode; // Thay thế cho <slot />
}

export default function TableHeader({ 
  title, 
  description, 
  children 
}: TableHeaderProps) {
  return (
    <div className="flex items-center">
      <div className="flex-auto">
        {title && (
          <h4 className="text-foreground text-base leading-6 font-semibold">
            {title}
          </h4>
        )}
        
        {/* Render description nếu có */}
        {description && (
          <p className="text-muted-foreground mt-2 text-sm">
            {description}
          </p>
        )}
      </div>
      
      {/* Slot content (ví dụ: các nút action) */}
      <div className="mt-4 ml-16 flex-none">
        {children}
      </div>
    </div>
  );
}