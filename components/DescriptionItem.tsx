import React from "react";
import { cn } from "@/lib/utils"; // Giả định bạn đã có hàm này

interface DescriptionItemProps {
  // label vừa đóng vai trò là prop string, vừa là slot (ReactNode)
  label?: React.ReactNode;
  ddClass?: string;
  className?: string; // Thêm className cho wrapper div để linh hoạt hơn
  children?: React.ReactNode;
}

export default function DescriptionItem({
  label,
  ddClass,
  className,
  children,
}: DescriptionItemProps) {
  return (
    <div className={className}>
      <dt className="text-muted-foreground text-sm font-medium">
        {label}
      </dt>
      <dd className={cn("mt-1 text-sm", ddClass)}>
        {children}
      </dd>
    </div>
  );
}