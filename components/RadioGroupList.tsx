"use client";

import React from "react";
import { type RadioGroupItemData } from "@/components/types";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

interface RadioGroupListProps {
  items: RadioGroupItemData[];
  label?: string; // Có trong props Vue nhưng không thấy dùng trong template gốc, tôi giữ lại trong interface
  
  // Thay thế cho v-model="selected"
  value?: string;
  onValueChange?: (value: string) => void;
  
  className?: string;
}

export default function RadioGroupList({
  items,
  label,
  value,
  onValueChange,
  className,
}: RadioGroupListProps) {
  return (
    <FieldGroup className={className}>
      <RadioGroup 
        value={value} 
        onValueChange={onValueChange} 
        className="gap-1"
      >
        {items.map((item) => (
          <FieldLabel key={item.value} htmlFor={item.value}>
            <Field orientation="horizontal">
              <RadioGroupItem id={item.value} value={item.value} />
              <FieldContent>
                <FieldTitle>{item.name}</FieldTitle>
                <FieldDescription>
                  {item.description}
                </FieldDescription>
              </FieldContent>
            </Field>
          </FieldLabel>
        ))}
      </RadioGroup>
    </FieldGroup>
  );
}