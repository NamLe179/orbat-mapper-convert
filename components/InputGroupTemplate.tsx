"use client";

import React, { useId } from "react";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";

interface InputGroupTemplateProps {
  label?: React.ReactNode;
  description?: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
  // Children hỗ trợ 2 kiểu:
  // 1. ReactNode thông thường (ví dụ: <Input />)
  // 2. Render function (Scoped slot) để lấy ID thủ công: ({ id }) => <Input id={id} />
  children?: React.ReactNode | ((args: { id: string }) => React.ReactNode);
}

export default function InputGroupTemplate({
  label,
  description,
  hint,
  className,
  children,
}: InputGroupTemplateProps) {
  const id = useId();

  // Xử lý logic render cho children (Scoped Slot :id="id")
  const renderChildren = () => {
    if (typeof children === "function") {
      // Trường hợp dùng Render Prop (giống hệt Scoped Slot Vue)
      return children({ id });
    }

    if (React.isValidElement(children)) {
      // Trường hợp dùng Component thường (DX tốt hơn):
      // Tự động clone và gán prop `id` vào con nếu con chưa có id
      return React.cloneElement(children as React.ReactElement<any>, { id });
    }

    return children;
  };

  return (
    <Field className={cn(className)}>
      {/* Header: Label + Hint */}
      <div className="flex justify-between">
        {label && (
          <FieldLabel htmlFor={id}>
            {label}
          </FieldLabel>
        )}
        
        {hint && (
          <div>
            {typeof hint === "string" ? (
              <span className="text-muted-foreground text-sm leading-6">
                {hint}
              </span>
            ) : (
              hint
            )}
          </div>
        )}
      </div>

      {/* Input Slot */}
      {renderChildren()}

      {/* Description */}
      {description && (
        <FieldDescription>
          {description}
        </FieldDescription>
      )}
    </Field>
  );
}