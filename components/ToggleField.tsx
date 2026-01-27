"use client";

import React, { useId } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface ToggleFieldProps {
  disabled?: boolean;
  // Thay thế cho defineModel (Controlled state)
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  // Hỗ trợ Uncontrolled state (nếu không truyền checked)
  defaultChecked?: boolean;
  children?: React.ReactNode; // Thay thế cho slot default
}

export default function ToggleField({
  disabled,
  checked,
  onCheckedChange,
  defaultChecked = true, // Vue default là true
  children,
}: ToggleFieldProps) {
  const id = useId();

  return (
    <div className="flex items-center space-x-2">
      <Switch
        id={id}
        disabled={disabled}
        // Radix UI tự xử lý logic controlled/uncontrolled dựa trên việc prop checked có được truyền hay không
        checked={checked}
        defaultChecked={defaultChecked}
        onCheckedChange={onCheckedChange}
      />
      
      {children && (
        <Label
          htmlFor={id}
          // Thêm style visual cho trạng thái disabled vì thẻ Label gốc không tự mờ đi
          className={disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer"}
        >
          {children}
        </Label>
      )}
    </div>
  );
}