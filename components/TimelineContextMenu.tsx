"use client";

import React from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Clock,
  ZoomIn,
  ZoomOut,
  PlusCircle,
} from "lucide-react";
import { useUiStore } from "@/stores/uiStore";

interface TimelineContextMenuProps {
  formattedHoveredDate: string;
  onAction?: (action: string) => void;
  children: React.ReactNode;
}

export default function TimelineContextMenu({
  formattedHoveredDate,
  onAction,
  children,
}: TimelineContextMenuProps) {
  const uiStore = useUiStore();

  // Hàm helper để xử lý logic update store
  // Giả định uiStore trong React (Zustand) có method setShowTimeline hoặc tương tự.
  // Nếu store của bạn là Mutable (như Valtio), bạn có thể gán trực tiếp: uiStore.showTimeline = false
  const hideTimeline = () => {
    if ('setShowTimeline' in uiStore) {
        // @ts-ignore
        uiStore.setShowTimeline(false);
    } else {
        // Fallback cho mutable store
        // @ts-ignore
        uiStore.showTimeline = false;
    }
  };

  return (
    <ContextMenu>
      {/* asChild giúp Trigger sử dụng trực tiếp phần tử con thay vì bọc thêm thẻ span/div */}
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      
      <ContextMenuContent>
        <ContextMenuLabel className="flex items-center">
          <Clock className="mr-2 h-5 w-5" />
          {formattedHoveredDate}
        </ContextMenuLabel>
        
        <ContextMenuSeparator />
        
        <ContextMenuItem onSelect={() => onAction?.("zoomIn")}>
          <ZoomIn className="mr-2 h-5 w-5" />
          Zoom In
        </ContextMenuItem>
        
        <ContextMenuItem onSelect={() => onAction?.("zoomOut")}>
          <ZoomOut className="mr-2 h-5 w-5" />
          Zoom Out
        </ContextMenuItem>
        
        <ContextMenuSeparator />
        
        <ContextMenuItem onSelect={() => onAction?.("addScenarioEvent")}>
          <PlusCircle className="mr-2 h-5 w-5" />
          Add scenario event
        </ContextMenuItem>
        
        <ContextMenuItem inset onSelect={hideTimeline}>
          <span className="ml-1">Hide timeline</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}