"use client";

import React, { useMemo } from "react";
import { usePathname } from "next/navigation";
import NewSimpleModal from "@/components/NewSimpleModal";
import { Kbd } from "@/components/ui/kbd";
import {
  defaultShortcuts,
  gridEditModeShortcuts,
  mapEditModeShortcuts,
  type KeyboardCategory,
} from "@/components/keyboardShortcuts";

import { 
  GRID_EDIT_ROUTE, 
  MAP_EDIT_MODE_ROUTE, 
  OLD_MAP_ROUTE 
} from "@/router/name"; 

interface ShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ShortcutsModal({ open, onOpenChange }: ShortcutsModalProps) {
  const pathname = usePathname();

  // Logic computed: Xác định shortcuts dựa trên trang hiện tại
  const shortcuts = useMemo((): KeyboardCategory[] => {
    // Lưu ý: So sánh chuỗi đường dẫn. 
    // Bạn có thể cần điều chỉnh logic này tùy thuộc vào giá trị của các hằng số ROUTE
    if (!pathname) return defaultShortcuts;

    if (
      pathname === OLD_MAP_ROUTE || 
      pathname.startsWith(MAP_EDIT_MODE_ROUTE) // Dùng startsWith nếu route có params dynamic
    ) {
      return mapEditModeShortcuts;
    }
    
    if (pathname.startsWith(GRID_EDIT_ROUTE)) {
      return gridEditModeShortcuts;
    }

    return defaultShortcuts;
  }, [pathname]);

  return (
    <NewSimpleModal 
      open={open} 
      onOpenChange={onOpenChange} 
      dialogTitle="Keyboard shortcuts"
    >
      <div className="mt-4 space-y-4">
        {shortcuts.map((category, index) => (
          <div key={category.label || index}>
            <h4 className="border-b-2 pb-1 text-base font-medium">
              {category.label}
            </h4>
            
            <ul className="divide-y text-sm">
              {category.shortcuts.map((entry, entryIndex) => (
                <li
                  key={entry.description || entryIndex}
                  className="flex items-center justify-between py-2"
                >
                  <p className="text-sm">{entry.description}</p>
                  
                  <div>
                    <ul className="divide-muted-foreground/50 flex divide-x-2">
                      {/* entry.shortcut là mảng các combo phím (Array<string[]>) */}
                      {entry.shortcut.map((combo, comboIndex) => (
                        <li key={comboIndex} className="flex gap-0.5 px-2 py-0.5">
                          {/* Render từng phím trong combo */}
                          {combo.map((key, keyIndex) => (
                            <Kbd key={keyIndex}>{key}</Kbd>
                          ))}
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </NewSimpleModal>
  );
}