"use client";

import React, { useId } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface TextAreaGroupProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: React.ReactNode;      // Thay thế cho slot/prop 'label'
  description?: React.ReactNode; // Thay thế cho slot/prop 'description'
}

export default function TextAreaGroup({
  id,
  label,
  description,
  className,
  value,
  onChange,
  ...props // Các props còn lại (placeholder, rows, required...)
}: TextAreaGroupProps) {
  
  // Tạo ID duy nhất nếu không được truyền vào (để link Label và Textarea)
  const uniqueId = useId();
  const computedId = id || uniqueId;

  return (
    <div className={className}>
      {label && (
        <Label htmlFor={computedId} className="">
          {label}
        </Label>
      )}
      
      <div className="mt-1">
        <Textarea
          id={computedId}
          value={value}
          onChange={onChange}
          {...props}
        />
      </div>

      {description && (
        <p className="text-muted-foreground mt-2 text-sm">
          {description}
        </p>
      )}
    </div>
  );
}