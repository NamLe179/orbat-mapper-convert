"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Sidc } from "@/symbology/sidc";
import IconButton from "@/components/IconButton";
import InputGroup from "@/components/InputGroup";
import { useNotifications } from "@/hooks/notifications";
import { Check, Copy, Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils"; 

interface SymbolCodeViewerProps {
  sidc: string;
  activePart?: string;
  onUpdate?: (newSidc: string) => void;
}

export default function SymbolCodeViewer({
  sidc,
  activePart,
  onUpdate,
}: SymbolCodeViewerProps) {
  
  // Hooks
  const { send } = useNotifications();
  
  // State
  const [isEditMode, setIsEditMode] = useState(false);
  const [newSidc, setNewSidc] = useState(sidc);

  // Watch: Sync local state when prop changes
  useEffect(() => {
    setNewSidc(sidc);
  }, [sidc]);

  // Computed: Breakdown SIDC parts
  const parts = useMemo(() => {
    const s = new Sidc(sidc);
    return [
      ["start", s.version + s.context + s.standardIdentity],
      ["symbolSet", s.symbolSet],
      ["status", s.status],
      ["hqtfd", s.hqtfd],
      ["amp", s.emt],
      ["mainIcon", s.mainIcon],
      ["mod1", s.modifierOne],
      ["mod2", s.modifierTwo],
    ];
  }, [sidc]);

  // Handlers
  const toggleEditMode = () => {
    setIsEditMode((prev) => !prev);
    // Reset value if cancelling
    if (isEditMode) {
      setNewSidc(sidc);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate?.(newSidc);
    // Logic gốc: reset về props.sidc cũ, nhưng thực tế nên chờ props update.
    // Tuy nhiên để giữ hành vi UI giống Vue:
    setIsEditMode(false);
  };

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(sidc);
      send({
        message: `Copied ${sidc} to the clipboard`,
      });
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  return (
    <div className="flex items-center">
      {!isEditMode ? (
        <>
          <div className="hover:border-muted-foreground rounded border border-transparent p-1 font-mono text-base">
            {parts.map(([key, part]) => (
              <span
                key={key}
                className={cn(
                  "sm:px-0.5",
                  activePart === key ? "bg-yellow-300 text-red-800" : ""
                )}
              >
                {part}
              </span>
            ))}
          </div>
          
          <IconButton onClick={toggleEditMode}>
            <Pencil className="h-5 w-5" />
          </IconButton>
          
          <IconButton onClick={onCopy}>
            <Copy className="h-5 w-5" />
          </IconButton>
        </>
      ) : (
        <form onSubmit={onSubmit} className="ml-2 flex items-end">
          <InputGroup
            label="Symbol code"
            value={newSidc}
            onChange={(e) => setNewSidc(e.target.value)}
            autoFocus
          />
          
          <IconButton type="submit" className="ml-1">
            <Check className="h-5 w-5" />
          </IconButton>
          
          {/* Nút Cancel: type="button" để không submit form */}
          <IconButton type="button" onClick={toggleEditMode}>
            <X className="h-5 w-5" />
          </IconButton>
        </form>
      )}
    </div>
  );
}