"use client";

import React, { useId } from "react";
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"; // Type reference

interface InputCheckboxProps extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> {
  id?: string;
  // Props thay thế cho Slot trong Vue
  label?: React.ReactNode;
  description?: React.ReactNode;
  
  // Controlled state (tương đương v-model)
  checked?: boolean | "indeterminate";
  onCheckedChange?: (checked: boolean | "indeterminate") => void;
}

export default function InputCheckbox({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  className, // className sẽ được truyền vào Checkbox hoặc Field tùy ý định, ở đây ta tách riêng
  ...props   // Các props còn lại (disabled, value, name...) truyền vào Checkbox
}: InputCheckboxProps) {
  
  // Tạo ID nếu không được truyền vào
  const generatedId = useId();
  const finalId = id || generatedId;

  return (
    <Field className="relative" orientation="horizontal">
      <Checkbox
        id={finalId}
        checked={checked}
        onCheckedChange={onCheckedChange}
        {...props}
      />
      
      <FieldContent>
        <FieldLabel htmlFor={finalId}>
          {/* Logic ưu tiên: Nếu có prop label (JSX/String) thì dùng, không thì để trống */}
          {label}
        </FieldLabel>

        {(description) && (
          <FieldDescription>
            {description}
          </FieldDescription>
        )}
      </FieldContent>
    </Field>
  );
}