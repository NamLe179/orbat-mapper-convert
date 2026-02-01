"use client";

import React from "react";
import SecondaryButton from "@/components/SecondaryButton";
import PrimaryButton from "@/components/PrimaryButton";

interface EditToggleButtonProps {
  primary?: boolean;
  activeLabel?: string;
  
  // Controlled state (Tương đương defineModel<boolean>)
  editMode: boolean;
  onEditModeChange: (value: boolean) => void;
  
  // Tương đương <slot>
  children?: React.ReactNode;
}

export default function EditToggleButton({
  primary = false,
  activeLabel = "Done editing",
  editMode,
  onEditModeChange,
  children,
}: EditToggleButtonProps) {

  // Logic chọn component động
  // Lưu ý: Biến phải viết hoa chữ cái đầu để React hiểu là Component
  const ButtonComponent = primary ? PrimaryButton : SecondaryButton;

  return (
    <ButtonComponent onClick={() => onEditModeChange(!editMode)}>
      {editMode ? (
        <span>{activeLabel}</span>
      ) : (
        <span>{children || "Edit"}</span>
      )}
    </ButtonComponent>
  );
}