"use client";

import React from "react";
import { useUiStore } from "@/stores/uiStore";
import { Button } from "@/components/ui/button";

// Giả định ToggleField đã convert sang React (như ở các bước trước)
import ToggleField from "@/components/ToggleField";

interface FormFooterProps {
  showNextToggle?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
}

export default function FormFooter({
  showNextToggle = false,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  onCancel,
}: FormFooterProps) {
  const uiStore = useUiStore();

  return (
    <div className="mt-6 flex items-center justify-between gap-x-6">
      <div>
        {showNextToggle && (
          <ToggleField
            // React state read
            checked={uiStore.goToNextOnSubmit}
            // React state write (Giả định store có action này)
            onCheckedChange={(val: boolean) => uiStore.setGoToNextOnSubmit?.(val)}
          >
            Go to next on save
          </ToggleField>
        )}
      </div>
      <div className="flex items-center gap-x-2">
        <Button variant="link" type="button" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button type="submit">
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}