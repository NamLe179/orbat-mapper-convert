"use client";

import React from "react";

// Components
import BaseButton from "@/components/BaseButton";
import EditToggleButton from "@/components/EditToggleButton";
import ToggleField from "@/components/ToggleField";
import PlainButton from "@/components/PlainButton";

interface ToeGridHeaderProps {
  selectedCount?: number;
  editLabel?: string;
  hideEdit?: boolean;
  isLocked?: boolean;
  
  // Model-like props (Controlled components)
  editMode: boolean;
  setEditMode: (val: boolean) => void;
  
  addMode: boolean;
  setAddMode: (val: boolean) => void;
  
  includeSubordinates?: boolean;
  setIncludeSubordinates?: (val: boolean) => void;

  // Emits
  onDelete: () => void;
}

export default function ToeGridHeader({
  selectedCount,
  editLabel = "Edit",
  hideEdit = false,
  isLocked = false,
  editMode,
  setEditMode,
  addMode,
  setAddMode,
  includeSubordinates,
  setIncludeSubordinates,
  onDelete,
}: ToeGridHeaderProps) {

  return (
    <div className="my-4 flex items-center justify-between gap-2">
      <div>
        {/* Left Section: Contextual controls */}
        {selectedCount ? (
          <BaseButton small onClick={onDelete}>
            Delete ({selectedCount})
          </BaseButton>
        ) : (
          // Chỉ render ToggleField nếu includeSubordinates được định nghĩa (không phải undefined)
          typeof includeSubordinates !== "undefined" && setIncludeSubordinates && (
            <ToggleField
              checked={includeSubordinates}
              onCheckedChange={(val: string | boolean) => setIncludeSubordinates(!!val)}
              disabled={editMode}
            >
              Include subordinates
            </ToggleField>
          )
        )}
      </div>

      

      <div className="flex items-center gap-2">
        {/* Right Section: Mode toggles */}
        {!hideEdit && !isLocked && (
          <EditToggleButton 
            editMode={editMode} 
            onEditModeChange={(val: boolean) => setEditMode(val)} 
          >
            {editLabel}
          </EditToggleButton>
        )}

        <PlainButton 
          onClick={() => setAddMode(!addMode)} 
          disabled={isLocked}
        >
          {addMode ? "Hide form" : "Add"}
        </PlainButton>
      </div>
    </div>
  );
}