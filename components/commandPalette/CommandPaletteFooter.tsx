"use client";

import React from "react";
import ToggleField from "@/components/ToggleField";
import { useUiStore } from "@/stores/uiStore";
import { Kbd } from "@/components/ui/kbd";

interface CommandPaletteFooterProps {
  rawQuery?: string; // Giữ lại prop dù chưa dùng hiển thị, để tương thích interface
  onClickActions: () => void;
}

export default function CommandPaletteFooter({ 
  rawQuery, 
  onClickActions 
}: CommandPaletteFooterProps) {
  
  const uiStore = useUiStore();

  const handleModeChange = (checked: boolean) => {
    // Xử lý cập nhật store tùy theo thư viện quản lý state bạn dùng (Zustand/Valtio)
    if ("setSearchGeoMode" in uiStore) {
        // @ts-ignore
        uiStore.setSearchGeoMode(checked);
    } else {
        // Fallback cho mutable store
        // @ts-ignore
        uiStore.searchGeoMode = checked;
    }
  };

  return (
    <div className="text-muted-foreground flex flex-wrap items-center justify-between px-4 py-2.5 text-xs">
      <div className="flex items-center gap-1">
        <span>Type</span>

        <Kbd>@</Kbd>
        <span className="sm:hidden">for places,</span>
        <span className="hidden sm:inline">to search for places,</span>

        <button 
          type="button" 
          className="flex items-center gap-1 hover:text-foreground transition-colors" 
          onClick={onClickActions}
        >
          <Kbd>#</Kbd> / <Kbd>&gt;</Kbd>
          <span>for actions</span>
        </button>

        <span className="hidden sm:flex items-center gap-1">
            <Kbd>?</Kbd>
            <span>for help.</span>
        </span>
      </div>

      <div>
        <ToggleField 
          checked={uiStore.searchGeoMode} 
          onCheckedChange={handleModeChange}
        >
          Place mode
        </ToggleField>
      </div>
    </div>
  );
}