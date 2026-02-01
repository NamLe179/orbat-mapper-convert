"use client";

import React, { useMemo } from "react";
import { useMapViewStore } from "@/stores/mapViewStore";
import ZoomSlider from "@/components/ZoomSlider";

interface ZoomSelectorProps {
  // Thay thế defineModel: value + onValueChange
  value?: [number, number];
  onValueChange?: (value: [number, number]) => void;
}

export default function ZoomSelector({
  value = [0, 24], // Giá trị mặc định từ Vue defineModel
  onValueChange,
}: ZoomSelectorProps) {
  
  // Hooks
  const mapView = useMapViewStore(); // Giả định hook trả về state object

  // Computed: Tính vị trí phần trăm của zoom hiện tại
  const zoomAsPercentage = useMemo(() => {
    // Fallback 0 nếu zoomLevel chưa sẵn sàng
    const currentZoom = mapView.zoomLevel ?? 0;
    return `${Math.round((currentZoom / 24) * 100)}%`;
  }, [mapView.zoomLevel]);

  return (
    <div className="relative h-10">
      <ZoomSlider 
        value={value} 
        onValueChange={onValueChange} 
        min={0} 
        max={24} 
      />
      
      {/* Indicator Marker */}
      <div 
        className="absolute select-none transition-all duration-75 ease-out" 
        style={{ left: zoomAsPercentage }}
      >
        {/* Arrow */}
        <div className="-mx-4 w-8 text-center text-xs text-red-800">
          ▲
        </div>
        
        {/* Value Label */}
        <div className="bg-muted text-muted-foreground -mx-4 -mt-1 w-8 rounded border text-center text-xs">
          {mapView.zoomLevel?.toFixed(1) ?? "0.0"}
        </div>
      </div>
    </div>
  );
}