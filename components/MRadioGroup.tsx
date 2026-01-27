"use client";

import React, { createContext, useContext, useId } from "react";
import { cn } from "@/lib/utils";

// 1. Tạo Context để chứa "name" của nhóm Radio
const RadioGroupNameContext = createContext<string | undefined>(undefined);

// 2. Hook để các component con (InputRadio) có thể lấy được name này
export const useRadioGroupName = () => {
  return useContext(RadioGroupNameContext);
};

interface MRadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  name?: string; // Cho phép override name từ ngoài nếu muốn
}

export default function MRadioGroup({ 
  children, 
  name, 
  className, 
  ...props 
}: MRadioGroupProps) {
  // Tạo ID duy nhất cho nhóm nếu không được truyền vào
  const generatedId = useId();
  const groupName = name || `radio-group-${generatedId}`;

  return (
    // Cung cấp name xuống cho các component con thông qua Context
    <RadioGroupNameContext.Provider value={groupName}>
      <div className={cn(className)} {...props}>
        {children}
      </div>
    </RadioGroupNameContext.Provider>
  );
}