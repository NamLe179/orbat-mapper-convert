"use client";

import React, { useEffect } from "react";
import CloseButton from "@/components/CloseButton";
import PanelResizeHandle from "@/components/PanelResizeHandle";
import { useWidthStore } from "@/stores/uiStore";
import { useActiveMap } from "@/components/injects"; 

interface MapEditorDetailsPanelProps {
  onClose?: () => void;
  children?: React.ReactNode;
}

export default function MapEditorDetailsPanel({
  onClose,
  children,
}: MapEditorDetailsPanelProps) {
  // --- Hooks ---
  const map = useActiveMap(); // Giả định hook trả về OL Map instance
  const widthStore = useWidthStore();

  // --- Effects (Mount/Unmount logic) ---
  useEffect(() => {
    if (!map) return;

    const view = map.getView();
    // @ts-ignore: OL view padding type checking
    const padding = view.padding || [0, 0, 0, 0];
    const [top, , bottom, left] = padding; // Bỏ qua giá trị right hiện tại

    // Set padding right = 400px khi panel mở
    // @ts-ignore
    view.padding = [top, 400, bottom, left];

    // Cleanup function (tương đương onUnmounted)
    return () => {
      // @ts-ignore
      const currentPadding = view.padding || [0, 0, 0, 0];
      const [cTop, , cBottom, cLeft] = currentPadding;
      
      // Reset padding right = 0
      // @ts-ignore
      view.padding = [cTop, 0, cBottom, cLeft];
    };
  }, [map]);

  // --- Handlers ---
  const handleUpdateWidth = (width: number) => {
    // Zustand setter: setDetailsWidth(width) hoặc gán trực tiếp nếu dùng proxy state
    if (widthStore.setDetailsWidth) {
      widthStore.setDetailsWidth(width);
    } else {
      // Fallback nếu store convert dạng mutable (ít gặp trong React chuẩn)
      widthStore.detailsWidth = width;
    }
  };

  return (
    <div className="">
      <aside
        className="bg-background border-sidebar-border pointer-events-auto relative mt-4 flex max-h-[70vh] flex-col overflow-clip rounded-md border shadow-sm"
        style={{ width: `${widthStore.detailsWidth}px` }}
      >
        <CloseButton 
          className="absolute top-1 right-1 z-[9999]" 
          onClick={onClose} 
        />
        
        <div className="flex-auto overflow-auto p-4">
          {children}
        </div>

        <PanelResizeHandle
          width={widthStore.detailsWidth}
          onUpdate={handleUpdateWidth}
          onReset={() => widthStore.resetDetailsWidth()}
          left={true} // Prop boolean trong React chỉ cần tên prop là true
        />
      </aside>
    </div>
  );
}